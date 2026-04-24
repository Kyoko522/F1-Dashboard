# ML predictor — race winner, lap time, pit strategy, and championship prediction models.
# NOTE: At ~160 lines, consider splitting into separate files per model as predictions grow.

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from .data_loader import get_historical_data, get_race_results, get_lap_data
import fastf1

def predict_race_winner(year: int, round_number: int):
    """Predict podium finishers based on grid position and historical performance."""
    # Get historical data for training
    years = list(range(max(2018, year-3), year))
    rounds = list(range(1, 23))
    df = get_historical_data(years, rounds)

    if df.empty:
        return {"error": "Not enough historical data"}

    df = df.dropna(subset=['GridPosition', 'Position'])
    df['GridPosition'] = pd.to_numeric(df['GridPosition'], errors='coerce')
    df['Position'] = pd.to_numeric(df['Position'], errors='coerce')
    df = df.dropna()

    le = LabelEncoder()
    df['DriverEncoded'] = le.fit_transform(df['FullName'])

    X = df[['GridPosition', 'DriverEncoded', 'Round']]
    y = (df['Position'] <= 3).astype(int)  # 1 if podium, 0 if not

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    # Get current grid for this race (qualifying results)
    try:
        quali = fastf1.get_session(year, round_number, 'Q')
        quali.load(telemetry=False, weather=False, messages=False)
        grid = quali.results[['FullName', 'Position']].copy()
        grid.columns = ['FullName', 'GridPosition']
    except Exception:
        return {"error": "Could not load qualifying data"}

    predictions = []
    for _, row in grid.iterrows():
        try:
            driver_enc = le.transform([row['FullName']])[0]
        except ValueError:
            driver_enc = 0
        prob = model.predict_proba([[row['GridPosition'], driver_enc, round_number]])[0][1]
        predictions.append({
            "driver": row['FullName'],
            "grid_position": int(row['GridPosition']),
            "podium_probability": round(float(prob) * 100, 1)
        })

    predictions.sort(key=lambda x: x['podium_probability'], reverse=True)
    return predictions[:10]


def predict_lap_times(year: int, round_number: int, driver: str):
    """Predict lap time trend for a driver."""
    years = list(range(max(2018, year-2), year+1))
    all_laps = []
    for y in years:
        for r in range(1, 23):
            try:
                laps = get_lap_data(y, r, driver)
                for lap in laps:
                    lap['Year'] = y
                    lap['Round'] = r
                all_laps.extend(laps)
            except Exception:
                continue

    if not all_laps:
        return {"error": "No lap data found for driver"}

    df = pd.DataFrame(all_laps)
    df = df.dropna(subset=['LapTimeSeconds'])

    le = LabelEncoder()
    df['CompoundEncoded'] = le.fit_transform(df['Compound'].fillna('UNKNOWN'))

    X = df[['LapNumber', 'TyreLife', 'CompoundEncoded']]
    y = df['LapTimeSeconds']

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    # Predict for laps 1-50
    future_laps = pd.DataFrame({
        'LapNumber': range(1, 51),
        'TyreLife': range(1, 51),
        'CompoundEncoded': [1] * 50
    })
    predictions = model.predict(future_laps)

    return [{"lap": int(i+1), "predicted_seconds": round(float(t), 3)} for i, t in enumerate(predictions)]


def predict_pit_strategy(year: int, round_number: int):
    """Predict optimal pit stop window based on historical stint data."""
    years = list(range(max(2018, year-2), year))
    all_stints = []

    for y in years:
        for r in range(1, 23):
            try:
                session = fastf1.get_session(y, r, 'R')
                session.load(telemetry=False, weather=False, messages=False)
                laps = session.laps[['Driver', 'Stint', 'Compound', 'TyreLife', 'LapNumber']].dropna()
                stints = laps.groupby(['Driver', 'Stint', 'Compound']).agg(
                    start_lap=('LapNumber', 'min'),
                    end_lap=('LapNumber', 'max'),
                    tyre_life=('TyreLife', 'max')
                ).reset_index()
                stints['Year'] = y
                stints['Round'] = r
                all_stints.append(stints)
            except Exception:
                continue

    if not all_stints:
        return {"error": "No stint data available"}

    df = pd.concat(all_stints)

    summary = df.groupby('Compound').agg(
        avg_stint_length=('tyre_life', 'mean'),
        avg_start_lap=('start_lap', 'mean')
    ).reset_index()

    return summary.to_dict(orient='records')


def predict_championship(year: int):
    """Predict end-of-season championship standings based on current points trend."""
    all_results = []
    for r in range(1, 24):
        try:
            session = fastf1.get_session(year, r, 'R')
            session.load(telemetry=False, weather=False, messages=False)
            results = session.results[['FullName', 'Points']].copy()
            results['Round'] = r
            all_results.append(results)
        except Exception:
            break

    if not all_results:
        return {"error": "No data available for this year"}

    df = pd.concat(all_results)
    standings = df.groupby('FullName')['Points'].sum().reset_index()
    completed_rounds = df['Round'].nunique()
    total_rounds = 24

    standings['projected_points'] = (standings['Points'] / completed_rounds * total_rounds).round(1)
    standings = standings.sort_values('projected_points', ascending=False)

    return standings.to_dict(orient='records')