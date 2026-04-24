# ML data loader — fetches raw FastF1 data for model training. No predictions here.

import fastf1
import pandas as pd
import os

# Cache dir for FastF1
CACHE_DIR = "/tmp/fastf1_cache"
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

def get_race_results(year: int, round_number: int):
    """Get full race results for a given year and round."""
    session = fastf1.get_session(year, round_number, 'R')
    session.load(telemetry=False, weather=False, messages=False)
    results = session.results[['DriverNumber', 'FullName', 'TeamName', 'GridPosition', 'Position', 'Points', 'Status']]
    return results.to_dict(orient='records')

def get_lap_data(year: int, round_number: int, driver: str = None):
    """Get lap time data for a race."""
    session = fastf1.get_session(year, round_number, 'R')
    session.load(telemetry=False, weather=False, messages=False)
    laps = session.laps[['Driver', 'LapNumber', 'LapTime', 'Compound', 'TyreLife', 'Stint']]
    if driver:
        laps = laps[laps['Driver'] == driver]
    laps = laps.dropna(subset=['LapTime'])
    laps['LapTimeSeconds'] = laps['LapTime'].dt.total_seconds()
    return laps.to_dict(orient='records')

def get_historical_data(years: list, rounds: list):
    """Get historical race results for training."""
    all_results = []
    for year in years:
        for round_num in rounds:
            try:
                results = get_race_results(year, round_num)
                for r in results:
                    r['Year'] = year
                    r['Round'] = round_num
                all_results.extend(results)
            except Exception:
                continue
    return pd.DataFrame(all_results)