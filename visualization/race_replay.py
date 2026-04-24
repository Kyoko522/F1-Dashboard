import matplotlib
matplotlib.use('TkAgg')

import matplotlib.pyplot as plt
plt.rcParams['toolbar'] = 'None'

import matplotlib.animation as animation
from matplotlib.patches import Circle, Rectangle
from matplotlib.widgets import Button, Slider
from data_loader import F1DataLoader
from datetime import datetime, timedelta
import numpy as np


class RaceSelectionGUI:
    
    COLORS = {
        'background': '#15151e',
        'terminal_bg': '#15151e',
        'border': '#e10600',
        'selected': '#e10600',
        'text': '#ffffff',
        'text_dim': '#808080',
        'cursor': '#ff1801',
        'highlight_bg': '#2d0d0d',
        'accent': '#ff1801',
    }
    
    def __init__(self):
        plt.ioff()
        self.loader = F1DataLoader()
        self.selected_year = 2024
        self.selected_session_key = None
        self.selected_session_name = None
        self.selected_drivers = []
        self.all_sessions = []
        self.all_drivers = []
        
        self.current_page = 'year'
        self.cursor_index = 0
        self.scroll_offset = 0
        self.items_per_page = 12
        
        plt.rcParams['figure.facecolor'] = self.COLORS['background']
        
        self.fig = plt.figure(figsize=(16, 10), facecolor=self.COLORS['background'])
        self.fig.canvas.manager.set_window_title('F1 Race Terminal')
        
        self.key_connection = self.fig.canvas.mpl_connect('key_press_event', self.on_key_press)
        
        self.setup_year_selection()
    
    def on_key_press(self, event):
        if event.key is None:
            return
            
        if self.current_page == 'year':
            self.handle_year_keys(event)
        elif self.current_page == 'session':
            self.handle_session_keys(event)
        elif self.current_page == 'driver':
            self.handle_driver_keys(event)
        elif self.current_page == 'Pridict':
            self.current_page = 'pridict'
        
        self.fig.canvas.draw_idle()
    
    def handle_year_keys(self, event):
        years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]
        
        if event.key == 'down':
            self.cursor_index = min(self.cursor_index + 1, len(years) - 1)
            self.setup_year_selection()
        elif event.key == 'up':
            self.cursor_index = max(self.cursor_index - 1, 0)
            self.setup_year_selection()
        elif event.key == 'enter':
            self.selected_year = years[self.cursor_index]
            print(f"Selected year: {self.selected_year}")
            self.cursor_index = 0
            self.scroll_offset = 0
            self.load_sessions()
    
    def handle_session_keys(self, event):
        if event.key == 'down':
            if self.cursor_index < len(self.all_sessions) - 1:
                self.cursor_index += 1
                if self.cursor_index >= self.scroll_offset + self.items_per_page:
                    self.scroll_offset += 1
            self.setup_session_selection()
        elif event.key == 'up':
            if self.cursor_index > 0:
                self.cursor_index -= 1
                if self.cursor_index < self.scroll_offset:
                    self.scroll_offset -= 1
            self.setup_session_selection()
        elif event.key == 'enter':
            if self.all_sessions:
                session = self.all_sessions[self.cursor_index]
                self.selected_session_key = session['session_key']
                self.selected_session_name = session['country_name']
                print(f"Selected: {session['country_name']} GP (Session {self.selected_session_key})")
                self.cursor_index = 0
                self.scroll_offset = 0
                self.load_drivers()
        elif event.key == 'escape' or event.key == 'backspace':
            self.cursor_index = 0
            self.scroll_offset = 0
            self.setup_year_selection()
    
    def handle_driver_keys(self, event):
        if event.key == 'down':
            if self.cursor_index < len(self.all_drivers) - 1:
                self.cursor_index += 1
                if self.cursor_index >= self.scroll_offset + self.items_per_page:
                    self.scroll_offset += 1
            self.setup_driver_selection()
        elif event.key == 'up':
            if self.cursor_index > 0:
                self.cursor_index -= 1
                if self.cursor_index < self.scroll_offset:
                    self.scroll_offset -= 1
            self.setup_driver_selection()
        elif event.key == ' ':
            if self.all_drivers:
                driver = self.all_drivers[self.cursor_index]
                driver_num = driver['driver_number']
                
                if driver_num in self.selected_drivers:
                    self.selected_drivers.remove(driver_num)
                    print(f"Deselected: #{driver_num} {driver['name_acronym']}")
                else:
                    self.selected_drivers.append(driver_num)
                    print(f"Selected: #{driver_num} {driver['name_acronym']}")
            
            self.setup_driver_selection()
        elif event.key == 'enter':
            if self.all_drivers:
                driver = self.all_drivers[self.cursor_index]
                driver_num = driver['driver_number']
                
                if driver_num in self.selected_drivers:
                    self.selected_drivers.remove(driver_num)
                    print(f"Deselected: #{driver_num} {driver['name_acronym']}")
                else:
                    self.selected_drivers.append(driver_num)
                    print(f"Selected: #{driver_num} {driver['name_acronym']}")
            
            self.setup_driver_selection()
        elif event.key == 'a':
            self.selected_drivers = [d['driver_number'] for d in self.all_drivers]
            print(f"Selected all {len(self.selected_drivers)} drivers")
            self.setup_driver_selection()
        elif event.key == 'c':
            self.selected_drivers = []
            print("Cleared all selections")
            self.setup_driver_selection()
        elif event.key == 's':
            if self.selected_drivers:
                self.start_replay()
            else:
                print("Please select at least one driver")
        elif event.key == 'escape' or event.key == 'backspace':
            self.cursor_index = 0
            self.scroll_offset = 0
            self.setup_session_selection()
    
    def setup_year_selection(self):
        self.current_page = 'year'
        self.fig.clear()
        
        ax = self.fig.add_subplot(111)
        ax.set_facecolor(self.COLORS['background'])
        ax.set_xlim(0, 100)
        ax.set_ylim(0, 100)
        ax.axis('off')
        
        terminal_box = Rectangle((5, 5), 90, 90, facecolor=self.COLORS['terminal_bg'], edgecolor=self.COLORS['border'], linewidth=3)
        ax.add_patch(terminal_box)
        
        ax.text(50, 88, '═' * 50, ha='center', fontsize=10, color=self.COLORS['border'], family='monospace')
        ax.text(50, 85, 'F1  RACE  REPLAY  TERMINAL', ha='center', fontsize=18, color=self.COLORS['text'], family='monospace', weight='bold')
        ax.text(50, 82, '═' * 50, ha='center', fontsize=10, color=self.COLORS['border'], family='monospace')
        
        ax.text(15, 75, '▶ SELECT YEAR', ha='left', fontsize=14, color=self.COLORS['selected'], family='monospace', weight='bold')
        
        years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]
        y_start = 68
        
        for i, year in enumerate(years):
            y = y_start - i * 7
            
            if i == self.cursor_index:
                cursor = '►'
                color = self.COLORS['selected']
                weight = 'bold'
                
                highlight = Rectangle((12, y - 2), 76, 5, facecolor=self.COLORS['highlight_bg'], edgecolor='none', zorder=1)
                ax.add_patch(highlight)
            else:
                cursor = ' '
                color = self.COLORS['text_dim']
                weight = 'normal'
            
            ax.text(15, y, f'{cursor}  [{i+1}]  {year}', ha='left', fontsize=13, color=color, family='monospace', weight=weight, zorder=2)
        
        ax.text(50, 15, '─' * 60, ha='center', fontsize=9, color=self.COLORS['text_dim'], family='monospace')
        ax.text(50, 12, 'CONTROLS: ↑↓ Navigate  |  ENTER Select', ha='center', fontsize=10, color=self.COLORS['text_dim'], family='monospace')
        
        plt.draw()
    
    def load_sessions(self):
        print(f"Loading sessions for {self.selected_year}...")
        self.all_sessions = self.loader.get_sessions(year=self.selected_year, session_type="Race")
        print(f"Loaded {len(self.all_sessions)} races")
        self.setup_session_selection()
    
    def setup_session_selection(self):
        self.current_page = 'session'
        self.fig.clear()
        
        ax = self.fig.add_subplot(111)
        ax.set_facecolor(self.COLORS['background'])
        ax.set_xlim(0, 100)
        ax.set_ylim(0, 100)
        ax.axis('off')
        
        terminal_box = Rectangle((5, 5), 90, 90, facecolor=self.COLORS['terminal_bg'], edgecolor=self.COLORS['border'], linewidth=3)
        ax.add_patch(terminal_box)
        
        ax.text(50, 92, f'{self.selected_year} F1 SEASON', ha='center', fontsize=16, color=self.COLORS['text'], family='monospace', weight='bold')
        ax.text(15, 86, '▶ SELECT GRAND PRIX', ha='left', fontsize=13, color=self.COLORS['selected'], family='monospace', weight='bold')
        
        if len(self.all_sessions) > self.items_per_page:
            scroll_info = f'[{self.scroll_offset + 1}-{min(self.scroll_offset + self.items_per_page, len(self.all_sessions))} of {len(self.all_sessions)}]'
            ax.text(85, 86, scroll_info, ha='right', fontsize=10, color=self.COLORS['text_dim'], family='monospace')
        
        visible_sessions = self.all_sessions[self.scroll_offset:self.scroll_offset + self.items_per_page]
        y_start = 79
        
        for i, session in enumerate(visible_sessions):
            actual_index = i + self.scroll_offset
            y = y_start - i * 6
            
            if actual_index == self.cursor_index:
                cursor = '►'
                color = self.COLORS['selected']
                weight = 'bold'
                
                highlight = Rectangle((12, y - 2), 76, 5, facecolor=self.COLORS['highlight_bg'], edgecolor='none', zorder=1)
                ax.add_patch(highlight)
            else:
                cursor = ' '
                color = self.COLORS['text_dim']
                weight = 'normal'
            
            session_name = session['country_name']
            ax.text(15, y, f'{cursor}  [{actual_index+1:2d}]  {session_name}', ha='left', fontsize=11, color=color, family='monospace', weight=weight, zorder=2)
        
        ax.text(50, 13, '─' * 70, ha='center', fontsize=9, color=self.COLORS['text_dim'], family='monospace')
        ax.text(50, 10, 'CONTROLS: ↑↓ Navigate  |  ENTER Select  |  ESC Back', ha='center', fontsize=9, color=self.COLORS['text_dim'], family='monospace')
        
        plt.draw()
    
    def load_drivers(self):
        print(f"Loading drivers for session {self.selected_session_key}...")
        self.all_drivers = self.loader.get_drivers(self.selected_session_key)
        print(f"Loaded {len(self.all_drivers)} drivers")
        self.setup_driver_selection()
    
    def setup_driver_selection(self):
        self.current_page = 'driver'
        self.fig.clear()
        
        ax = self.fig.add_subplot(111)
        ax.set_facecolor(self.COLORS['background'])
        ax.set_xlim(0, 100)
        ax.set_ylim(0, 100)
        ax.axis('off')
        
        terminal_box = Rectangle((5, 5), 90, 90, facecolor=self.COLORS['terminal_bg'], edgecolor=self.COLORS['border'], linewidth=3)
        ax.add_patch(terminal_box)
        
        ax.text(50, 92, f'{self.selected_session_name} GP', ha='center', fontsize=16, color=self.COLORS['text'], family='monospace', weight='bold')
        ax.text(15, 86, '▶ SELECT DRIVERS', ha='left', fontsize=13, color=self.COLORS['selected'], family='monospace', weight='bold')
        
        ax.text(70, 86, f'Selected: {len(self.selected_drivers)}/{len(self.all_drivers)}', ha='left', fontsize=11, color=self.COLORS['accent'], family='monospace', weight='bold')
        
        if len(self.all_drivers) > self.items_per_page:
            scroll_info = f'[{self.scroll_offset + 1}-{min(self.scroll_offset + self.items_per_page, len(self.all_drivers))} of {len(self.all_drivers)}]'
            ax.text(85, 82, scroll_info, ha='right', fontsize=9, color=self.COLORS['text_dim'], family='monospace')
        
        visible_drivers = self.all_drivers[self.scroll_offset:self.scroll_offset + self.items_per_page]
        y_start = 79
        
        for i, driver in enumerate(visible_drivers):
            actual_index = i + self.scroll_offset
            y = y_start - i * 6
            
            driver_num = driver['driver_number']
            is_selected = driver_num in self.selected_drivers
            
            if actual_index == self.cursor_index:
                cursor = '►'
                color = self.COLORS['selected']
                weight = 'bold'
                
                highlight = Rectangle((12, y - 2), 76, 5, facecolor=self.COLORS['highlight_bg'], edgecolor='none', zorder=1)
                ax.add_patch(highlight)
            else:
                cursor = ' '
                color = self.COLORS['selected'] if is_selected else self.COLORS['text_dim']
                weight = 'bold' if is_selected else 'normal'
            
            checkbox = '[X]' if is_selected else '[ ]'
            driver_name = driver['name_acronym']
            full_name = driver['full_name']
            
            ax.text(15, y, f'{cursor}  {checkbox}  #{driver_num:2d}  {driver_name:3s}  {full_name}', ha='left', fontsize=10, color=color, family='monospace', weight=weight, zorder=2)
        
        ax.text(50, 16, '─' * 70, ha='center', fontsize=9, color=self.COLORS['text_dim'], family='monospace')
        ax.text(50, 13, 'CONTROLS: ↑↓ Navigate  |  SPACE/ENTER Toggle', ha='center', fontsize=9, color=self.COLORS['text_dim'], family='monospace')
        ax.text(50, 10, '          A Select All  |  C Clear  |  S Start  |  ESC Back', ha='center', fontsize=9, color=self.COLORS['text_dim'], family='monospace')
        
        plt.draw()
    
    def start_replay(self):
        if not self.selected_drivers:
            print(" Please select at least one driver")
            return
        
        print(f"\n Starting replay...")
        print(f"   Session: {self.selected_session_key}")
        print(f"   Drivers: {self.selected_drivers}")
        
        self.fig.canvas.mpl_disconnect(self.key_connection)
        plt.close(self.fig)
        
        replay = RaceReplay(
            session_key=self.selected_session_key,
            selected_drivers=self.selected_drivers
        )
        replay.play()
    
    def show(self):
        plt.show()


class RaceReplay:
    
    COLORS = {
        'background': '#0a0a0a',
        'panel': '#0a0a0a',
        'telemetry_panel': '#1a1a1a',
        'track': '#404040',
        'text_primary': '#ffffff',
        'text_secondary': '#b0b0b0',
        'text_muted': '#505050',
        'position_gold': '#FFD700',
        'position_silver': '#C0C0C0',
        'position_bronze': '#CD7F32',
        'inactive': '#2a2a2a',
        'active': '#505050',
        'pit_lane': '#FFD700',
        'speed_color': '#00FF00',
        'throttle_color': '#00BFFF',
        'brake_color': '#FF4444',
        'selected_highlight': '#FF6600',
    }
    
    def __init__(self, session_key: int, selected_drivers=None):
        self.session_key = session_key
        self.loader = F1DataLoader()
        self.selected_drivers = set(selected_drivers) if selected_drivers else None
        
        self.playing = True
        self.speed = 1.0
        self.anim = None
        self.slider_updating = False
        self.focused_driver = None
        
        self.drivers_data = {}
        self.all_drivers_info = {}
        self.driver_dots = {}
        self.driver_labels = {}
        self.position_data = {}
        self.interval_data = {}
        self.telemetry_data = {}
        self.pit_stop_data = {}
        self.lap_data = {}
        self.stint_data = {}
        
        self.leaderboard_text_objects = {}
        
        self.start_time = None
        self.current_time = None
        self.end_time = None
        
        self.setup_figure()
        self.load_race_data()
        self.calculate_race_duration()
    
    def setup_figure(self):
        self.fig = plt.figure(figsize=(24, 13), facecolor=self.COLORS['background'])
        self.fig.canvas.manager.set_window_title('F1 Race Replay')
        plt.subplots_adjust(left=0.01, right=0.99, top=0.98, bottom=0.10, hspace=0.01, wspace=0.01)
        
        gs = self.fig.add_gridspec(
            2, 3,
            height_ratios=[0.88, 0.12],
            width_ratios=[0.50, 0.25, 0.25],
            left=0.01,
            right=0.99,
            top=0.98,
            bottom=0.10,
            hspace=0.01,
            wspace=0.01
        )
        
        self.ax_track = self.fig.add_subplot(gs[0, 0])
        self.ax_telemetry = self.fig.add_subplot(gs[0, 1])
        self.ax_leaderboard = self.fig.add_subplot(gs[0, 2])
        
        for ax in [self.ax_track, self.ax_telemetry, self.ax_leaderboard]:
            ax.set_facecolor(self.COLORS['panel'])
            ax.set_xticks([])
            ax.set_yticks([])
        
        self.ax_track.set_aspect('equal')
        self.ax_telemetry.set_xlim(0, 1)
        self.ax_telemetry.set_ylim(0, 1)
        self.ax_leaderboard.set_xlim(0, 1)
        self.ax_leaderboard.set_ylim(0, 1)
        
        self.fig.canvas.mpl_connect('button_press_event', self.on_click)
    
    def load_race_data(self):
        print(f"Loading session {self.session_key}...")
        
        all_drivers = self.loader.get_drivers(self.session_key)
        
        for driver in all_drivers:
            self.all_drivers_info[driver['driver_number']] = {
                'name': driver['name_acronym'],
                'full_name': driver['full_name'],
                'team_color': f"#{driver['team_colour']}",
                'team_name': driver['team_name'],
            }
        
        drivers_to_load = [d for d in all_drivers if not self.selected_drivers or d['driver_number'] in self.selected_drivers]
        
        print(f"Loading {len(drivers_to_load)} drivers...")
        
        for driver in drivers_to_load:
            driver_num = driver['driver_number']
            print(f"   #{driver_num} {driver['name_acronym']}")
            
            location_data = self.loader.get_location_data(self.session_key, driver_num)
            telemetry_data = self.loader.get_telemetry(self.session_key, driver_num)
            lap_data = self.loader.get_laps(self.session_key, driver_num)
            
            if location_data:
                timestamps = [self.parse_timestamp(loc['date']) for loc in location_data]
                
                self.drivers_data[driver_num] = {
                    **self.all_drivers_info[driver_num],
                    'locations': location_data,
                    'timestamps': timestamps,
                    'current_index': 0
                }
                
                if telemetry_data:
                    self.telemetry_data[driver_num] = {
                        'data': telemetry_data,
                        'timestamps': [self.parse_timestamp(t['date']) for t in telemetry_data]
                    }
                
                if lap_data:
                    self.lap_data[driver_num] = lap_data
        
        print("Loading positions, intervals, pit stops, and stints...")
        self.load_positions_and_intervals()
        self.load_pit_stops()
        self.load_stints()
        
        if self.drivers_data:
            self.focused_driver = list(self.drivers_data.keys())[0]
        
        print("Race data loaded\n")
    
    def load_positions_and_intervals(self):
        all_positions = self.loader.get_positions(self.session_key)
        all_intervals = self.loader.get_intervals(self.session_key)

        for pos in all_positions:
            driver_num = pos['driver_number']
            self.position_data.setdefault(driver_num, []).append({
                'position': pos['position'],
                'timestamp': self.parse_timestamp(pos['date'])
            })

        for interval in all_intervals:
            driver_num = interval['driver_number']
            self.interval_data.setdefault(driver_num, []).append({
                'interval': interval.get('interval'),
                'gap_to_leader': interval.get('gap_to_leader'),
                'timestamp': self.parse_timestamp(interval['date'])
            })

        for driver_num in self.position_data:
            self.position_data[driver_num].sort(key=lambda x: x['timestamp'])

        for driver_num in self.interval_data:
            self.interval_data[driver_num].sort(key=lambda x: x['timestamp'])
    
    def load_pit_stops(self):
        all_pit_stops = self.loader.get_pit_stops(self.session_key)
        
        for pit in all_pit_stops:
            driver_num = pit['driver_number']
            self.pit_stop_data.setdefault(driver_num, []).append({
                'lap_number': pit.get('lap_number'),
                'pit_duration': pit.get('pit_duration'),
                'timestamp': self.parse_timestamp(pit['date'])
            })
    
    def load_stints(self):
        all_stints = self.loader.get_stints(self.session_key)
        
        for stint in all_stints:
            driver_num = stint['driver_number']
            self.stint_data.setdefault(driver_num, []).append({
                'stint_number': stint.get('stint_number'),
                'compound': stint.get('compound'),
                'lap_start': stint.get('lap_start'),
                'lap_end': stint.get('lap_end'),
                'tyre_age_at_start': stint.get('tyre_age_at_start')
            })
    
    def calculate_race_duration(self):
        all_times = []
        for data in self.drivers_data.values():
            if data['timestamps']:
                all_times.extend([data['timestamps'][0], data['timestamps'][-1]])
        
        if all_times:
            self.start_time = min(all_times)
            self.end_time = max(all_times)
            self.current_time = self.start_time
    
    def parse_timestamp(self, date_string):
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    
    def get_position_at_time(self, driver_num, target_time):
        if driver_num not in self.position_data:
            return None
        
        current_position = None
        for pos in self.position_data[driver_num]:
            if pos['timestamp'] <= target_time:
                current_position = pos['position']
            else:
                break
        
        return current_position
    
    def get_interval_at_time(self, driver_num, target_time):
        if driver_num not in self.interval_data:
            return ''
        
        current_interval = None
        for interval in self.interval_data[driver_num]:
            if interval['timestamp'] <= target_time:
                current_interval = interval['interval']
            else:
                break
        
        return current_interval if current_interval else ''
    
    def get_telemetry_at_time(self, driver_num, target_time):
        if driver_num not in self.telemetry_data:
            return None
        
        telemetry = self.telemetry_data[driver_num]
        timestamps = telemetry['timestamps']
        data = telemetry['data']
        
        current_telemetry = None
        for i, ts in enumerate(timestamps):
            if ts <= target_time:
                current_telemetry = data[i]
            else:
                break
        
        return current_telemetry
    
    def get_current_lap(self, driver_num, target_time):
        if driver_num not in self.lap_data:
            return None
        
        for lap in self.lap_data[driver_num]:
            lap_start = self.parse_timestamp(lap['date_start'])
            if 'date_end' in lap and lap['date_end']:
                lap_end = self.parse_timestamp(lap['date_end'])
                if lap_start <= target_time <= lap_end:
                    return lap['lap_number']
            elif lap_start <= target_time:
                return lap['lap_number']
        
        return None
    
    def get_current_stint(self, driver_num, current_lap):
        if driver_num not in self.stint_data or not current_lap:
            return None
        
        for stint in self.stint_data[driver_num]:
            if stint['lap_start'] <= current_lap <= (stint['lap_end'] or 999):
                return stint
        
        return None
    
    def interpolate_position(self, driver_num, target_time):
        data = self.drivers_data[driver_num]
        timestamps = data['timestamps']
        locations = data['locations']
        
        if not timestamps:
            return None
        
        if target_time <= timestamps[0]:
            return locations[0]
        if target_time >= timestamps[-1]:
            return locations[-1]
        
        for i in range(len(timestamps) - 1):
            if timestamps[i] <= target_time <= timestamps[i + 1]:
                t0, t1 = timestamps[i], timestamps[i + 1]
                loc0, loc1 = locations[i], locations[i + 1]
                
                total_seconds = (t1 - t0).total_seconds()
                if total_seconds == 0:
                    return loc0
                
                elapsed_seconds = (target_time - t0).total_seconds()
                ratio = elapsed_seconds / total_seconds
                
                x = loc0['x'] + (loc1['x'] - loc0['x']) * ratio
                y = loc0['y'] + (loc1['y'] - loc0['y']) * ratio
                
                return {'x': x, 'y': y}
        
        return locations[-1]
    
    def setup_track(self):
        if not self.drivers_data:
            return
        
        first_driver = list(self.drivers_data.keys())[0]
        locations = self.drivers_data[first_driver]['locations']
        
        x_coords = [loc['x'] for loc in locations]
        y_coords = [loc['y'] for loc in locations]
        
        self.ax_track.plot(x_coords, y_coords, color=self.COLORS['track'], linewidth=2, alpha=0.4, zorder=1)
        
        for driver_num, data in self.drivers_data.items():
            start_loc = data['locations'][0]
            
            dot = Circle(
                (start_loc['x'], start_loc['y']),
                radius=80,
                color=data['team_color'],
                ec='white',
                linewidth=2.5,
                zorder=10
            )
            self.ax_track.add_patch(dot)
            self.driver_dots[driver_num] = dot
            
            label = self.ax_track.text(
                start_loc['x'], start_loc['y'] + 150,
                data['name'],
                fontsize=10,
                fontweight='bold',
                ha='center',
                color='white',
                zorder=11
            )
            self.driver_labels[driver_num] = label
        
        padding = 1000
        self.ax_track.set_xlim(min(x_coords) - padding, max(x_coords) + padding)
        self.ax_track.set_ylim(min(y_coords) - padding, max(y_coords) + padding)
    
    def on_click(self, event):
        if event.inaxes == self.ax_leaderboard:
            for driver_num, bounds in self.leaderboard_text_objects.items():
                if bounds['y_min'] <= event.ydata <= bounds['y_max']:
                    if driver_num in self.drivers_data:
                        self.focused_driver = driver_num
                        print(f"📍 Focused on #{driver_num} {self.all_drivers_info[driver_num]['name']}")
                        self.update_telemetry_panel()
                        self.update_leaderboard()
                        self.fig.canvas.draw_idle()
                    else:
                        print(f"  {self.all_drivers_info[driver_num]['name']} - No telemetry (not selected)")
                    break
    
    def update_telemetry_panel(self):
        self.ax_telemetry.clear()
        self.ax_telemetry.set_facecolor(self.COLORS['telemetry_panel'])
        self.ax_telemetry.set_xlim(0, 1)
        self.ax_telemetry.set_ylim(0, 1)
        self.ax_telemetry.axis('off')
        
        if not self.focused_driver:
            self.ax_telemetry.text(
                0.5, 0.5,
                'Click driver in leaderboard\nto view telemetry',
                ha='center', va='center',
                fontsize=14,
                color=self.COLORS['text_secondary']
            )
            return
        
        if self.focused_driver not in self.drivers_data:
            driver_info = self.all_drivers_info[self.focused_driver]
            
            self.ax_telemetry.text(
                0.5, 0.6,
                f"#{self.focused_driver} {driver_info['name']}",
                ha='center', va='center',
                fontsize=16, fontweight='bold',
                color=driver_info['team_color']
            )
            
            self.ax_telemetry.text(
                0.5, 0.45,
                '⚠️ NO TELEMETRY DATA',
                ha='center', va='center',
                fontsize=14, fontweight='bold',
                color=self.COLORS['text_muted']
            )
            
            self.ax_telemetry.text(
                0.5, 0.35,
                'Driver not selected for replay',
                ha='center', va='center',
                fontsize=11,
                color=self.COLORS['text_secondary']
            )
            return
        
        driver_info = self.drivers_data[self.focused_driver]
        telemetry = self.get_telemetry_at_time(self.focused_driver, self.current_time)
        current_lap = self.get_current_lap(self.focused_driver, self.current_time)
        current_stint = self.get_current_stint(self.focused_driver, current_lap)
        position = self.get_position_at_time(self.focused_driver, self.current_time)
        
        self.ax_telemetry.text(
            0.5, 0.95,
            f"#{self.focused_driver} {driver_info['name']}",
            ha='center', va='top',
            fontsize=16, fontweight='bold',
            color=driver_info['team_color']
        )
        
        self.ax_telemetry.text(
            0.5, 0.88,
            driver_info['team_name'],
            ha='center', va='top',
            fontsize=11,
            color=self.COLORS['text_secondary']
        )
        
        y_pos = 0.78
        
        if position:
            pos_color = self.get_position_color(position)
            self.ax_telemetry.text(
                0.1, y_pos, "POSITION",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, f"P{position}",
                ha='right', va='center',
                fontsize=14, fontweight='bold',
                color=pos_color,
                family='monospace'
            )
            y_pos -= 0.08
        
        if current_lap:
            self.ax_telemetry.text(
                0.1, y_pos, "LAP",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, f"{current_lap}",
                ha='right', va='center',
                fontsize=14, fontweight='bold',
                color=self.COLORS['text_primary'],
                family='monospace'
            )
            y_pos -= 0.08
        
        if telemetry:
            speed = telemetry.get('speed', 0)
            throttle = telemetry.get('throttle', 0)
            brake = telemetry.get('brake', 0)
            gear = telemetry.get('n_gear', 0)
            rpm = telemetry.get('rpm', 0)
            drs = telemetry.get('drs', 0)
            
            self.ax_telemetry.text(
                0.1, y_pos, "SPEED",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, f"{int(speed)} km/h",
                ha='right', va='center',
                fontsize=13, fontweight='bold',
                color=self.COLORS['speed_color'],
                family='monospace'
            )
            y_pos -= 0.07
            
            self.ax_telemetry.text(
                0.1, y_pos, "THROTTLE",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, f"{int(throttle)}%",
                ha='right', va='center',
                fontsize=13, fontweight='bold',
                color=self.COLORS['throttle_color'],
                family='monospace'
            )
            y_pos -= 0.07
            
            self.ax_telemetry.text(
                0.1, y_pos, "BRAKE",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            brake_color = self.COLORS['brake_color'] if brake > 0 else self.COLORS['text_muted']
            self.ax_telemetry.text(
                0.9, y_pos, f"{'ON' if brake > 0 else 'OFF'}",
                ha='right', va='center',
                fontsize=13, fontweight='bold',
                color=brake_color,
                family='monospace'
            )
            y_pos -= 0.07
            
            self.ax_telemetry.text(
                0.1, y_pos, "GEAR",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, f"{int(gear)}",
                ha='right', va='center',
                fontsize=13, fontweight='bold',
                color=self.COLORS['text_primary'],
                family='monospace'
            )
            y_pos -= 0.07
            
            self.ax_telemetry.text(
                0.1, y_pos, "RPM",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, f"{int(rpm):,}",
                ha='right', va='center',
                fontsize=13, fontweight='bold',
                color=self.COLORS['text_primary'],
                family='monospace'
            )
            y_pos -= 0.07
            
            self.ax_telemetry.text(
                0.1, y_pos, "DRS",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            drs_status = "OPEN" if drs in [10, 12, 14] else "CLOSED"
            drs_color = self.COLORS['speed_color'] if drs in [10, 12, 14] else self.COLORS['text_muted']
            self.ax_telemetry.text(
                0.9, y_pos, drs_status,
                ha='right', va='center',
                fontsize=13, fontweight='bold',
                color=drs_color,
                family='monospace'
            )
            y_pos -= 0.10
        
        if current_stint:
            self.ax_telemetry.text(
                0.5, y_pos, "TIRE STRATEGY",
                ha='center', va='center',
                fontsize=11, fontweight='bold',
                color=self.COLORS['text_secondary']
            )
            y_pos -= 0.07
            
            compound = current_stint['compound']
            compound_colors = {
                'SOFT': '#FF0000',
                'MEDIUM': '#FFD700',
                'HARD': '#FFFFFF',
                'INTERMEDIATE': '#00FF00',
                'WET': '#0000FF'
            }
            
            self.ax_telemetry.text(
                0.1, y_pos, "COMPOUND",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, compound,
                ha='right', va='center',
                fontsize=12, fontweight='bold',
                color=compound_colors.get(compound, self.COLORS['text_primary'])
            )
            y_pos -= 0.06
            
            tire_age = current_stint.get('tyre_age_at_start', 0)
            if current_lap and current_stint['lap_start']:
                tire_age += (current_lap - current_stint['lap_start'])
            
            self.ax_telemetry.text(
                0.1, y_pos, "TIRE AGE",
                ha='left', va='center',
                fontsize=10, color=self.COLORS['text_secondary']
            )
            self.ax_telemetry.text(
                0.9, y_pos, f"{tire_age} laps",
                ha='right', va='center',
                fontsize=12, fontweight='bold',
                color=self.COLORS['text_primary'],
                family='monospace'
            )
        
        if self.focused_driver in self.pit_stop_data:
            for pit in self.pit_stop_data[self.focused_driver]:
                if abs((pit['timestamp'] - self.current_time).total_seconds()) < 5:
                    y_pos -= 0.10
                    self.ax_telemetry.text(
                        0.5, y_pos, "IN PIT LANE",
                        ha='center', va='center',
                        fontsize=13, fontweight='bold',
                        color=self.COLORS['pit_lane']
                    )
                    y_pos -= 0.06
                    if pit['pit_duration']:
                        self.ax_telemetry.text(
                            0.5, y_pos, f"Duration: {pit['pit_duration']:.1f}s",
                            ha='center', va='center',
                            fontsize=11,
                            color=self.COLORS['text_secondary']
                        )
                    break
    
    def update_leaderboard(self):
        self.ax_leaderboard.clear()
        self.ax_leaderboard.set_facecolor(self.COLORS['panel'])
        self.ax_leaderboard.set_xlim(0, 1)
        self.ax_leaderboard.set_ylim(0, 1)
        self.ax_leaderboard.axis('off')
        
        self.leaderboard_text_objects = {}
        
        positions_list = []
        for driver_num in self.all_drivers_info.keys():
            position = self.get_position_at_time(driver_num, self.current_time)
            interval = self.get_interval_at_time(driver_num, self.current_time)
            is_selected = driver_num in self.drivers_data
            
            if position:
                positions_list.append({
                    'position': position,
                    'driver_num': driver_num,
                    'name': self.all_drivers_info[driver_num]['name'],
                    'color': self.all_drivers_info[driver_num]['team_color'],
                    'interval': interval,
                    'is_selected': is_selected
                })
        
        positions_list.sort(key=lambda x: x['position'])
        
        self.ax_leaderboard.text(
            0.5, 0.98, 'LIVE STANDINGS',
            ha='center', va='top',
            fontsize=16, fontweight='bold',
            color=self.COLORS['text_primary']
        )
        
        self.ax_leaderboard.text(
            0.5, 0.94, '(Click driver to view telemetry)',
            ha='center', va='top',
            fontsize=9,
            color=self.COLORS['text_muted'],
            style='italic'
        )
        
        y_position = 0.88
        line_height = 0.042
        
        for item in positions_list[:20]:
            position_color = self.get_position_color(item['position'])
            is_focused = item['driver_num'] == self.focused_driver
            alpha = 1.0 if item['is_selected'] else 0.35
            
            y_min = y_position - line_height / 2
            y_max = y_position + line_height / 2
            self.leaderboard_text_objects[item['driver_num']] = {
                'y_min': y_min,
                'y_max': y_max
            }
            
            if is_focused and item['is_selected']:
                highlight = Rectangle(
                    (0.02, y_min), 0.96, line_height,
                    facecolor=self.COLORS['selected_highlight'],
                    alpha=0.2,
                    zorder=1
                )
                self.ax_leaderboard.add_patch(highlight)
            
            self.ax_leaderboard.text(
                0.05, y_position, f"P{item['position']}",
                ha='left', va='center',
                fontsize=11, fontweight='bold',
                color=position_color,
                alpha=alpha,
                zorder=2
            )
            
            driver_color = item['color'] if item['is_selected'] else self.COLORS['text_muted']
            name_text = self.ax_leaderboard.text(
                0.22, y_position, item['name'],
                ha='left', va='center',
                fontsize=11, fontweight='bold',
                color=driver_color,
                alpha=alpha,
                zorder=2
            )
            
            if item['is_selected'] and item['interval'] and item['position'] > 1:
                self.ax_leaderboard.text(
                    0.92, y_position, f"+{item['interval']}",
                    ha='right', va='center',
                    fontsize=10,
                    color=self.COLORS['text_secondary'],
                    family='monospace',
                    zorder=2
                )
            
            y_position -= line_height
    
    def get_position_color(self, position):
        if position == 1:
            return self.COLORS['position_gold']
        elif position == 2:
            return self.COLORS['position_silver']
        elif position == 3:
            return self.COLORS['position_bronze']
        else:
            return self.COLORS['text_secondary']
    
    def setup_bottom_controls(self):
        button_width = 0.055
        button_height = 0.035
        button_y_top = 0.065
        button_y_bottom = 0.015
        
        speeds = [0.5, 1, 2, 5, 10]
        self.speed_buttons = []
        
        for i, speed in enumerate(speeds):
            x_pos = 0.05 + i * (button_width + 0.01)
            ax_btn = plt.axes([x_pos, button_y_top, button_width, button_height], facecolor=self.COLORS['panel'])
            btn = Button(ax_btn, f'{speed}x', color=self.COLORS['inactive'], hovercolor=self.COLORS['active'])
            btn.label.set_color(self.COLORS['text_primary'])
            btn.label.set_fontsize(10)
            btn.label.set_fontweight('bold')
            btn.on_clicked(lambda event, s=speed: self.set_speed(s))
            self.speed_buttons.append(btn)
        
        play_x = 0.45
        ax_play = plt.axes([play_x, button_y_top, button_width, button_height], facecolor=self.COLORS['panel'])
        self.play_button = Button(ax_play, '⏸', color=self.COLORS['inactive'], hovercolor=self.COLORS['active'])
        self.play_button.label.set_color(self.COLORS['text_primary'])
        self.play_button.label.set_fontsize(14)
        self.play_button.on_clicked(self.toggle_play)
        
        total_seconds = (self.end_time - self.start_time).total_seconds()
        ax_slider = plt.axes([0.05, button_y_bottom, 0.70, 0.025], facecolor=self.COLORS['panel'])
        
        self.time_slider = Slider(
            ax_slider, '',
            0, total_seconds,
            valinit=0,
            color=self.COLORS['position_gold'],
            track_color=self.COLORS['inactive']
        )
        self.time_slider.on_changed(self.slider_changed)
        
        self.time_text = self.fig.text(
            0.78, 0.04,
            '',
            ha='left', va='center',
            fontsize=13,
            fontweight='bold',
            color=self.COLORS['text_primary'],
            family='monospace',
            bbox=dict(boxstyle='round,pad=0.6', facecolor=self.COLORS['inactive'], alpha=0.9, edgecolor='none')
        )
    
    def slider_changed(self, value):
        if self.slider_updating:
            return
        self.current_time = self.start_time + timedelta(seconds=value)
        self.update_visualization_state()
    
    def update_visualization_state(self):
        for driver_num, data in self.drivers_data.items():
            loc = self.interpolate_position(driver_num, self.current_time)
            
            if loc:
                self.driver_dots[driver_num].center = (loc['x'], loc['y'])
                self.driver_labels[driver_num].set_position((loc['x'], loc['y'] + 150))
        
        self.update_time_display()
        self.update_telemetry_panel()
        self.update_leaderboard()
        self.fig.canvas.draw_idle()
    
    def set_speed(self, speed):
        self.speed = speed
    
    def toggle_play(self, event):
        self.playing = not self.playing
        self.play_button.label.set_text('▶' if not self.playing else '⏸')
    
    def update_time_display(self):
        elapsed = (self.current_time - self.start_time).total_seconds()
        total = (self.end_time - self.start_time).total_seconds()
        
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)
        
        total_minutes = int(total // 60)
        total_seconds = int(total % 60)
        
        self.time_text.set_text(
            f'{minutes:02d}:{seconds:02d} / {total_minutes:02d}:{total_seconds:02d}  |  {self.speed}x'
        )
    
    def update(self, frame):
        if not self.playing:
            return []
        
        time_step = timedelta(seconds=(1/3.7) * self.speed / 10)
        self.current_time += time_step
        
        if self.current_time > self.end_time:
            self.current_time = self.start_time
        
        for driver_num, data in self.drivers_data.items():
            loc = self.interpolate_position(driver_num, self.current_time)
            
            if loc:
                self.driver_dots[driver_num].center = (loc['x'], loc['y'])
                self.driver_labels[driver_num].set_position((loc['x'], loc['y'] + 150))
        
        self.slider_updating = True
        elapsed_seconds = (self.current_time - self.start_time).total_seconds()
        self.time_slider.set_val(elapsed_seconds)
        self.slider_updating = False
        
        self.update_time_display()
        
        if frame % 10 == 0:
            self.update_telemetry_panel()
        
        if frame % 15 == 0:
            self.update_leaderboard()
        
        return list(self.driver_dots.values()) + list(self.driver_labels.values())
    
    def play(self):
        self.setup_track()
        self.setup_bottom_controls()
        self.update_telemetry_panel()
        self.update_leaderboard()
        self.update_time_display()
        
        print("  Replay started")
        print("   • Click ANY driver in leaderboard to view telemetry")
        print("   • Drag slider to jump to any time")
        print("   • Click speed buttons (0.5x - 10x)")
        print("   • Click ⏸/▶ to pause/play\n")
        
        self.anim = animation.FuncAnimation(
            self.fig,
            self.update,
            frames=100000,
            interval=20,
            blit=False,
            repeat=True
        )
        
        plt.show()


if __name__ == "__main__":
    print("═" * 100)
    print("F1 RACE REPLAY TERMINAL")
    print("═" * 100)
    print("\n⌨️  Keyboard navigation enabled")
    print("   Use ↑↓ arrows and ENTER to navigate\n")
    
    gui = RaceSelectionGUI()
    gui.show()