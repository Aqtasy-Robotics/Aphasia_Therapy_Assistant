"""Body UI driver — Kivy 7" touchscreen integration for speech therapy.

This module manages the Kivy-based UI for the Aphasia Therapy Robot,
handling async communication with the dispatcher while running the Kivy
main loop in a background thread.
"""

from __future__ import annotations

from dataclasses import dataclass
import asyncio
import os
from pathlib import Path
from typing import Any, Dict, Optional
import logging
import threading
import time
from queue import Queue, Empty

from kivy.app import App
from kivy.clock import Clock, mainthread
from kivy.core.window import Window
from kivy.lang import Builder
from kivy.properties import BooleanProperty, ListProperty, NumericProperty, StringProperty
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.widget import Widget
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.graphics import Color, RoundedRectangle, Line, Ellipse
from kivy.metrics import dp

from .pronunciation import analyze_pronunciation, PronunciationStats
from .storage import load_practiced_word_ids, mark_word_as_practiced, clear_practiced_words

logger = logging.getLogger(__name__)

# Set Kivy window properties (for 7" touchscreen)
Window.size = (1024, 600)

# Load KV file
KV_PATH = Path(__file__).parent / "speech_therapy_app.kv"
if KV_PATH.exists():
    try:
        Builder.load_file(str(KV_PATH))
    except Exception as e:
        logger.warning(f"Failed to load KV file: {e}")


@dataclass(frozen=True)
class WordItem:
    """A word to practice with metadata."""
    word_id: int
    text: str
    category: str


# Default word list for speech therapy
# Professional color scheme from React frontend
COLORS = {
    'primary': (23/255, 37/255, 84/255, 1),        # Deep Navy #172554
    'secondary': (6/255, 78/255, 59/255, 1),        # Forest Green #064e3b  
    'sidebar': (1/255, 43/255, 29/255, 1),          # Midnight Emerald #012b1d
    'accent': (244/255, 63/255, 94/255, 1),         # Red for alerts/errors
    'bg_light': (248/255, 250/255, 252/255, 1),     # Light background
    'text_dark': (15/255, 23/255, 42/255, 1),       # Dark text
    'text_gray': (107/255, 114/255, 128/255, 1),    # Medium gray
    'success': (34/255, 197/255, 94/255, 1),        # Green for success
}

DEFAULT_WORD_LIST = [
    # Food category
    WordItem(word_id=1, text="Apple", category="food"),
    WordItem(word_id=2, text="Orange", category="food"),
    WordItem(word_id=3, text="Water", category="food"),
    WordItem(word_id=4, text="Bread", category="food"),
    # Animals category
    WordItem(word_id=5, text="Rabbit", category="animals"),
    WordItem(word_id=6, text="Cat", category="animals"),
    WordItem(word_id=7, text="Cow", category="animals"),
    WordItem(word_id=8, text="Tiger", category="animals"),
    # Objects category
    WordItem(word_id=9, text="Table", category="objects"),
    WordItem(word_id=10, text="Chair", category="objects"),
    WordItem(word_id=11, text="Book", category="objects"),
    WordItem(word_id=12, text="Pencil", category="objects"),
]

TOTAL_TIME_SEC = 7


class SpeechTherapyRoot(BoxLayout):
    """Main UI widget for speech therapy session with professional design."""

    # Header and mode
    header_text = StringProperty("Speech Therapy Assistant")
    instruction_text = StringProperty("Listen and repeat the word below.")
    user_role = StringProperty("patient")  # or "therapist"
    user_name = StringProperty("Patient User")

    # Category filtering
    selected_category = StringProperty("all")
    category_buttons_text = StringProperty("all | food | animals | objects")
    
    # Current word display
    current_word_text = StringProperty("APPLE")
    current_category_text = StringProperty("food")
    word_progress_text = StringProperty("1/12")  # Word X of total

    # Recording state
    is_listening = BooleanProperty(False)
    time_remaining_text = StringProperty("7s")
    start_button_text = StringProperty("Start Recording")

    # Progress feedback
    progress_ratio = NumericProperty(0.0)  # 0..1
    feedback_message = StringProperty("Press Start Recording")
    feedback_rgba = ListProperty([1.0, 1.0, 1.0, 1.0])

    # Pronunciation stats (displayed as text)
    accuracy_text = StringProperty("-")
    vowel_text = StringProperty("-")
    consonant_text = StringProperty("-")
    phoneme_errors_text = StringProperty("-")
    detected_word_text = StringProperty("-")
    
    # Session stats (for stat cards)
    total_words_text = StringProperty("0")
    session_accuracy_text = StringProperty("-")
    streak_text = StringProperty("0")

    session_complete = BooleanProperty(False)

    def __init__(self, mode: str = "new", **kwargs):
        """Initialize speech therapy UI.

        Args:
            mode: "new" for unpracticed words only, "all" for all words
        """
        super().__init__(orientation="vertical", **kwargs)

        self.mode = mode
        self._practiced_ids = set(load_practiced_word_ids())
        self._words = self._build_word_list()
        self._index = 0

        self._countdown_event = None
        self._audio_level_event = None
        self._analysis_pending = False
        self._analysis_reason: Optional[str] = None

        self._audio_level = 0.0
        self._pulse_phase = 0.0
        self._current_screen = "home"  # home, category_select, practice
        
        # References to dynamic widgets for updating (practice screen)
        self._practice_widgets = {}

        # Load KV only for practice screen
        KV_PATH = Path(__file__).parent / "speech_therapy_app.kv"
        if KV_PATH.exists():
            try:
                Builder.load_file(str(KV_PATH))
            except Exception as e:
                logger.warning(f"Failed to load KV file: {e}")

        # Show home screen initially
        self.go_to_home()

    def _build_word_list(self) -> list[WordItem]:
        """Build word list based on mode."""
        if self.mode == "new":
            return [w for w in DEFAULT_WORD_LIST if w.word_id not in self._practiced_ids]
        return DEFAULT_WORD_LIST[:]

    def _update_display_for_current_word(self) -> None:
        """Update UI to show current word and reset feedback."""
        if self._index < 0 or self._index >= len(self._words):
            self.session_complete = True
            self.current_word_text = "✓ Session Complete!"
            self.current_category_text = ""
            self.instruction_text = "Great job! All words practiced."
            self.word_progress_text = f"{len(self._words)}/{len(self._words)}"
            return

        word = self._words[self._index]
        self.current_word_text = word.text.upper()
        self.current_category_text = word.category
        self.word_progress_text = f"{self._index + 1}/{len(self._words)}"
        self.session_complete = False

        self._reset_recordings_state()
        self._clear_feedback()

    def _reset_recordings_state(self) -> None:
        """Reset recording counters and displays."""
        self.is_listening = False
        self.time_remaining_text = f"{TOTAL_TIME_SEC}s"
        self.start_button_text = "Start Recording"
        self.progress_ratio = 0.0
        self.status_text = "Press Start Recording"

    def _clear_feedback(self) -> None:
        """Clear feedback display."""
        self.feedback_message = ""
        self.feedback_rgba = [1.0, 1.0, 1.0, 1.0]
        self.accuracy_text = "-"
        self.vowel_text = "-"
        self.consonant_text = "-"
        self.phoneme_errors_text = "-"
        self.detected_word_text = "-"

    def on_start_stop_button_press(self) -> None:
        """Handle start/stop recording button press."""
        if not self.is_listening:
            self._start_recording()
        else:
            self._stop_recording()

    def _start_recording(self) -> None:
        """Start recording session."""
        if self.session_complete:
            return

        self.is_listening = True
        self.start_button_text = "Stop Recording"
        self.progress_ratio = 0.0
        self.feedback_message = "Listening..."
        self.feedback_rgba = [0.85, 0.92, 1.0, 1.0]  # Light blue
        self._clear_feedback()

        # Cancel any existing countdown
        if self._countdown_event:
            self._countdown_event.cancel()

        remaining = TOTAL_TIME_SEC
        self.time_remaining_text = f"{remaining}s"

        def countdown_tick():
            nonlocal remaining
            remaining -= 0.1
            self.progress_ratio = 1.0 - (remaining / TOTAL_TIME_SEC)

            if remaining > 0:
                secs = int(remaining) if remaining >= 1 else 1
                self.time_remaining_text = f"{secs}s"
                # Schedule next tick
                Clock.schedule_once(lambda dt: countdown_tick(), 0.1)
            else:
                self._stop_recording()

        self._countdown_event = Clock.schedule_once(lambda dt: countdown_tick(), 0.1)

    def _stop_recording(self) -> None:
        """Stop recording and trigger analysis."""
        if not self.is_listening:
            return

        self.is_listening = False
        self.start_button_text = "Start Recording"

        if self._countdown_event:
            self._countdown_event.cancel()
            self._countdown_event = None

        # Show "Analyzing..." feedback
        self.feedback_message = "Analyzing..."
        self.feedback_rgba = [0.85, 0.92, 1.0, 1.0]

        # Simulate analysis (in production, send audio to backend)
        self._trigger_analysis()

    def _trigger_analysis(self) -> None:
        """Trigger pronunciation analysis."""
        word = self._words[self._index]
        stats, feedback = analyze_pronunciation(
            word.text,
            audio_available=True,
            seed=None,  # Random seed for variety
        )

        self._display_analysis_results(stats, feedback)

    def _display_analysis_results(self, stats: PronunciationStats, feedback: str) -> None:
        """Display pronunciation analysis results with professional styling."""
        # Update feedback message and color (using React color scheme)
        self.feedback_message = feedback
        if stats.accuracy_percent >= 92:
            # Professional green (success)
            self.feedback_rgba = [34/255, 197/255, 94/255, 0.15]  # Green with alpha
        elif stats.accuracy_percent >= 78:
            # Professional yellow/warning  
            self.feedback_rgba = [251/255, 191/255, 36/255, 0.15]  # Amber with alpha
        else:
            # Professional red (error)
            self.feedback_rgba = [244/255, 63/255, 94/255, 0.15]  # Red with alpha

        # Update stats display
        self.accuracy_text = f"{stats.accuracy_percent}%"
        self.vowel_text = f"{stats.vowel_score_percent}%"
        self.consonant_text = f"{stats.consonant_score_percent}%"
        self.phoneme_errors_text = str(stats.phoneme_errors)
        self.detected_word_text = stats.detected_word
        
        # Also update practice screen labels if visible
        if self._current_screen == "practice":
            if "accuracy_label" in self._practice_widgets:
                self._practice_widgets["accuracy_label"].text = self.accuracy_text
            if "vowel_label" in self._practice_widgets:
                self._practice_widgets["vowel_label"].text = self.vowel_text
            if "detected_label" in self._practice_widgets:
                self._practice_widgets["detected_label"].text = self.detected_word_text
        
        # Update session stats
        self.total_words_text = str(self._index + 1)
        # Calculate rolling average accuracy
        try:
            current_avg = int((float(self.accuracy_text.rstrip('%')) + 
                             float(self.session_accuracy_text.rstrip('%') or '0')) / 2)
            self.session_accuracy_text = f"{current_avg}%"
        except (ValueError, AttributeError):
            self.session_accuracy_text = f"{stats.accuracy_percent}%"

        # Mark as practiced if accuracy is good
        if stats.accuracy_percent >= 78:
            word = self._words[self._index]
            mark_word_as_practiced(word.word_id)
            # Update streak
            try:
                self.streak_text = str(int(self.streak_text) + 1)
            except ValueError:
                self.streak_text = "1"

    def next_word(self) -> None:
        """Move to next word."""
        self._index += 1
        self._update_display_for_current_word()
        # Update UI if practice screen is showing
        if self._current_screen == "practice":
            self._refresh_practice_screen_display()

    def previous_word(self) -> None:
        """Move to previous word."""
        if self._index > 0:
            self._index -= 1
            self._update_display_for_current_word()
            # Update UI if practice screen is showing
            if self._current_screen == "practice":
                self._refresh_practice_screen_display()
    
    def _refresh_practice_screen_display(self) -> None:
        """Refresh practice screen display after word change."""
        if "word_label" in self._practice_widgets:
            self._practice_widgets["word_label"].text = self.current_word_text
        if "progress_label" in self._practice_widgets:
            self._practice_widgets["progress_label"].text = "Word " + self.word_progress_text
        if "category_label" in self._practice_widgets:
            self._practice_widgets["category_label"].text = "Category: " + self.current_category_text

    def restart_session(self) -> None:
        """Restart the session."""
        self._index = 0
        self._practiced_ids = set(load_practiced_word_ids())
        self._words = self._build_word_list()
        self._update_display_for_current_word()

    def go_to_home(self) -> None:
        """Navigate to home screen."""
        self._current_screen = "home"
        self.clear_widgets()
        self._build_home_screen()

    def go_to_category_select(self) -> None:
        """Navigate to category selection screen."""
        self._current_screen = "category_select"
        self.clear_widgets()
        self._build_category_screen()

    def go_to_practice(self, category: str = "all") -> None:
        """Navigate to practice screen."""
        self._current_screen = "practice"
        self.selected_category = category
        if category != "all":
            self._words = [w for w in DEFAULT_WORD_LIST if w.category == category]
        else:
            self._words = DEFAULT_WORD_LIST[:]
        self._index = 0
        self._practiced_ids = set(load_practiced_word_ids())
        self._update_display_for_current_word()
        self.clear_widgets()
        self._build_practice_screen()

    def _build_home_screen(self) -> None:
        """Build home screen with mode selection."""
        self.clear_widgets()
        container = BoxLayout(orientation="vertical", padding=dp(20), spacing=dp(20))
        container.add_widget(Widget(size_hint_y=0.2))  # Spacer
        
        # Title
        title = Label(
            text="Aphasia Therapy",
            font_size=32,
            bold=True,
            color=(23/255, 37/255, 84/255, 1),
            size_hint_y=0.15
        )
        container.add_widget(title)
        
        # Subtitle
        subtitle = Label(
            text="Choose your practice mode",
            font_size=14,
            color=(107/255, 114/255, 128/255, 1),
            size_hint_y=0.1
        )
        container.add_widget(subtitle)
        
        container.add_widget(Widget(size_hint_y=0.1))  # Spacer
        
        # Mode buttons
        buttons_layout = BoxLayout(orientation="horizontal", spacing=dp(20), size_hint_y=0.4)
        
        # Therapy Session button
        therapy_btn = Button(
            text="Start Therapy\nSession\n\nBegin your assigned practice",
            size_hint_x=0.5,
            background_color=(0, 102/255, 1, 1),
            color=(1, 1, 1, 1),
            font_size=14
        )
        therapy_btn.bind(on_press=lambda x: self.go_to_practice("all"))  # type: ignore
        buttons_layout.add_widget(therapy_btn)
        
        # Self Practice button
        practice_btn = Button(
            text="Self Practice\n\nChoose your own words",
            size_hint_x=0.5,
            background_color=(0, 102/255, 1, 1),
            color=(1, 1, 1, 1),
            font_size=14
        )
        practice_btn.bind(on_press=lambda x: self.go_to_category_select())  # type: ignore
        buttons_layout.add_widget(practice_btn)
        
        container.add_widget(buttons_layout)
        self.add_widget(container)

    def _build_category_screen(self) -> None:
        """Build category selection screen."""
        self.clear_widgets()
        
        main_layout = BoxLayout(orientation="vertical", padding=dp(20), spacing=dp(20))
        
        # Header
        header = BoxLayout(orientation="vertical", size_hint_y=0.15, spacing=dp(5))
        title = Label(
            text="Choose Category",
            font_size=28,
            bold=True,
            color=(23/255, 37/255, 84/255, 1),
            size_hint_y=0.6
        )
        subtitle = Label(
            text="Select words to practice",
            font_size=13,
            color=(107/255, 114/255, 128/255, 1),
            size_hint_y=0.4
        )
        header.add_widget(title)
        header.add_widget(subtitle)
        main_layout.add_widget(header)
        
        # Category grid
        grid = GridLayout(cols=2, spacing=dp(20), size_hint_y=0.7)
        
        categories = [
            ("🍎", "Food"),
            ("📦", "Objects"),
            ("👥", "People"),
            ("📋", "All")
        ]
        
        for icon, category_name in categories:
            cat_key = category_name.lower()
            category_btn = Button(
                text=f"{icon}\n{category_name}",
                font_size="18sp",
                background_normal="",
                background_color=(0, 102/255, 1, 1),
                color=(1, 1, 1, 1)
            )
            category_btn.bind(on_press=lambda x, cat=cat_key: self.go_to_practice(cat))  # type: ignore
            
            grid.add_widget(category_btn)
        
        main_layout.add_widget(grid)
        main_layout.add_widget(Widget(size_hint_y=0.15))  # Spacer for bottom
        
        self.add_widget(main_layout)

    def _build_practice_screen(self) -> None:
        """Build the practice session screen with microphone and navigation."""
        self.orientation = "vertical"
        self.padding = 0
        self.spacing = 0
        self.canvas.before.clear()  # type: ignore
        
        # Light background
        with self.canvas.before:  # type: ignore
            Color(248/255, 250/255, 252/255, 1)
            RoundedRectangle(pos=self.pos, size=self.size)
        
        # ===== TOP NAVIGATION BAR =====
        nav_bar = BoxLayout(
            orientation="horizontal",
            size_hint_y=0.08,
            padding=dp(15),
            spacing=dp(10)
        )
        
        back_btn = Button(
            text="← Back to Home",
            size_hint_x=0.3,
            background_normal="",
            background_color=(1, 1, 1, 0),
            color=(23/255, 37/255, 84/255, 1),
            font_size="11sp"
        )
        back_btn.bind(on_press=lambda x: self.go_to_home())  # type: ignore
        nav_bar.add_widget(back_btn)
        nav_bar.add_widget(Widget(size_hint_x=0.7))
        self.add_widget(nav_bar)
        
        # ===== PROGRESS SECTION =====
        progress_section = BoxLayout(
            orientation="vertical",
            size_hint_y=0.1,
            padding=dp(15),
            spacing=dp(8)
        )
        
        # Progress text row
        progress_row = BoxLayout(size_hint_y=0.5, spacing=dp(20))
        progress_label = Label(
            text="Word " + self.word_progress_text,
            font_size="11sp",
            color=(107/255, 114/255, 128/255, 1),
            size_hint_x=0.5
        )
        self._practice_widgets["progress_label"] = progress_label
        progress_row.add_widget(progress_label)
        
        category_label = Label(
            text="Category: " + self.current_category_text,
            font_size="11sp",
            color=(107/255, 114/255, 128/255, 1),
            size_hint_x=0.5
        )
        self._practice_widgets["category_label"] = category_label
        progress_row.add_widget(category_label)
        progress_section.add_widget(progress_row)
        
        # Progress bar
        progress_bar = BoxLayout(size_hint_y=0.5)
        self._practice_widgets["progress_bar"] = progress_bar
        progress_section.add_widget(progress_bar)
        self.add_widget(progress_section)
        
        # ===== MAIN CONTENT =====
        content = BoxLayout(
            orientation="vertical",
            size_hint_y=0.72,
            padding=dp(30),
            spacing=dp(30)
        )
        content.add_widget(Widget(size_hint_y=0.15))  # Top spacer
        
        # WORD DISPLAY WITH NAV ARROWS
        word_row = BoxLayout(size_hint_y=0.5, spacing=dp(20))
        
        # Left arrow
        left_arrow = Button(
            text="<",
            font_size="32sp",
            bold=True,
            size_hint_x=0.15,
            background_normal="",
            background_color=(0.9, 0.9, 0.92, 1),
            color=(0, 102/255, 1, 1)
        )
        left_arrow.bind(on_press=lambda x: self.previous_word())  # type: ignore
        word_row.add_widget(left_arrow)
        
        # Word display
        word_display = BoxLayout(size_hint_x=0.7)
        word_label = Label(
            text=self.current_word_text,
            font_size="72sp",
            bold=True,
            color=(0, 0, 0, 1),
            size_hint_x=1
        )
        self._practice_widgets["word_label"] = word_label
        word_display.add_widget(word_label)
        word_row.add_widget(word_display)
        
        # Right arrow
        right_arrow = Button(
            text=">",
            font_size="32sp",
            bold=True,
            size_hint_x=0.15,
            background_normal="",
            background_color=(0.9, 0.9, 0.92, 1),
            color=(0, 102/255, 1, 1)
        )
        right_arrow.bind(on_press=lambda x: self.next_word())  # type: ignore
        word_row.add_widget(right_arrow)
        
        content.add_widget(word_row)
        content.add_widget(Widget(size_hint_y=0.1))  # Spacer
        
        # MICROPHONE BUTTON with label
        mic_container = BoxLayout(size_hint_y=0.25, padding=dp(20))
        
        mic_btn = Button(
            text="🎤",
            font_size="48sp",
            background_normal="",
            background_color=(0, 102/255, 1, 1),
            color=(1, 1, 1, 1)
        )
        mic_btn.bind(on_press=lambda x: self.on_start_stop_button_press())  # type: ignore
        mic_container.add_widget(mic_btn)
        
        mic_label = Label(
            text="Click to speak",
            font_size="12sp",
            color=(107/255, 114/255, 128/255, 1)
        )
        mic_container.add_widget(mic_label)
        content.add_widget(mic_container)
        
        self.add_widget(content)
        
        # ===== BOTTOM STATS =====
        stats_bar = BoxLayout(
            orientation="horizontal",
            size_hint_y=0.1,
            padding=dp(15),
            spacing=dp(10)
        )
        
        # Accuracy stat card
        accuracy_card = BoxLayout(orientation="vertical", padding=dp(8), spacing=dp(2))
        
        accuracy_card.add_widget(Label(
            text="Accuracy",
            font_size="9sp",
            color=(107/255, 114/255, 128/255, 1)
        ))
        accuracy_val = Label(
            text=self.accuracy_text,
            font_size="18sp",
            bold=True,
            color=(0, 102/255, 1, 1)
        )
        self._practice_widgets["accuracy_label"] = accuracy_val
        accuracy_card.add_widget(accuracy_val)
        stats_bar.add_widget(accuracy_card)
        
        # Vowels stat card
        vowels_card = BoxLayout(orientation="vertical", padding=dp(8), spacing=dp(2))
        
        vowels_card.add_widget(Label(
            text="Vowels",
            font_size="9sp",
            color=(107/255, 114/255, 128/255, 1)
        ))
        vowels_val = Label(
            text=self.vowel_text,
            font_size="18sp",
            bold=True,
            color=(6/255, 78/255, 59/255, 1)
        )
        self._practice_widgets["vowel_label"] = vowels_val
        vowels_card.add_widget(vowels_val)
        stats_bar.add_widget(vowels_card)
        
        # Detected stat card
        detected_card = BoxLayout(orientation="vertical", padding=dp(8), spacing=dp(2))
        
        detected_card.add_widget(Label(
            text="Detected",
            font_size="9sp",
            color=(107/255, 114/255, 128/255, 1)
        ))
        detected_val = Label(
            text=self.detected_word_text,
            font_size="16sp",
            bold=True,
            color=(23/255, 37/255, 84/255, 1)
        )
        self._practice_widgets["detected_label"] = detected_val
        detected_card.add_widget(detected_val)
        stats_bar.add_widget(detected_card)
        
        self.add_widget(stats_bar)


class SpeechTherapyApp(App):
    """Main Kivy application class."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.root_widget: Optional[SpeechTherapyRoot] = None
        self.command_queue: Queue = Queue()

    def build(self) -> SpeechTherapyRoot:
        """Build and return the root widget."""
        self.root_widget = SpeechTherapyRoot(mode="new")
        # Start processing command queue
        Clock.schedule_interval(self._process_command_queue, 0.1)
        return self.root_widget

    def _process_command_queue(self, dt) -> None:
        """Process UI commands from the command queue."""
        try:
            while True:
                command = self.command_queue.get_nowait()
                self._execute_command(command)
        except Empty:
            pass

    def _execute_command(self, command: Dict[str, Any]) -> None:
        """Execute a UI control command."""
        action = command.get("action")

        if action == "show_word":
            word = command.get("word", "").upper()
            category = command.get("category", "")
            if self.root_widget:
                self.root_widget.current_word_text = word
                self.root_widget.current_category_text = category

        elif action == "show_feedback":
            feedback = command.get("feedback", "")
            accuracy = command.get("accuracy", 0)
            if self.root_widget:
                self.root_widget.feedback_message = feedback
                if accuracy >= 92:
                    self.root_widget.feedback_rgba = [0.85, 1.0, 0.85, 1.0]  # Green
                elif accuracy >= 78:
                    self.root_widget.feedback_rgba = [1.0, 1.0, 0.85, 1.0]  # Yellow
                else:
                    self.root_widget.feedback_rgba = [1.0, 0.85, 0.85, 1.0]  # Red

        elif action == "show_stats":
            if self.root_widget:
                self.root_widget.accuracy_text = command.get("accuracy", "-")
                self.root_widget.vowel_text = command.get("vowel", "-")
                self.root_widget.consonant_text = command.get("consonant", "-")
                self.root_widget.phoneme_errors_text = command.get("phoneme_errors", "-")
                self.root_widget.detected_word_text = command.get("detected_word", "-")

        elif action == "next_word":
            if self.root_widget:
                self.root_widget.next_word()

        elif action == "previous_word":
            if self.root_widget:
                self.root_widget.previous_word()

        elif action == "restart_session":
            if self.root_widget:
                self.root_widget.restart_session()

        elif action == "set_header":
            if self.root_widget:
                self.root_widget.header_text = command.get("text", "Speech Therapy Assistant")

        elif action == "set_instruction":
            if self.root_widget:
                self.root_widget.instruction_text = command.get("text", "Listen and repeat the word below.")


# Global app instance and thread
_app_thread: Optional[threading.Thread] = None
_app_instance: Optional[SpeechTherapyApp] = None
_app_ready_event = threading.Event()


def _run_kivy_app_in_thread() -> None:
    """Run Kivy app in background thread."""
    global _app_instance
    os.environ["KIVY_WINDOW"] = "pygame"
    _app_instance = SpeechTherapyApp()
    _app_ready_event.set()
    _app_instance.run()


def ensure_app_running() -> SpeechTherapyApp:
    """Ensure the Kivy app is running in background thread."""
    global _app_thread, _app_instance

    if _app_instance is not None:
        return _app_instance

    # Start app thread
    _app_thread = threading.Thread(target=_run_kivy_app_in_thread, daemon=True)
    _app_thread.start()

    # Wait for app to be ready (with timeout)
    if not _app_ready_event.wait(timeout=5.0):
        logger.warning("[UI] Kivy app startup timeout")

    # Give it a little extra time to fully initialize
    time.sleep(0.5)

    if _app_instance is None:
        raise RuntimeError("Failed to initialize Kivy app")

    return _app_instance


async def show_ui(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update the on-screen UI based on the payload (async wrapper).

    Expected payload examples:
        {
            "action": "show_word",
            "word": "apple",
            "category": "food"
        }
        {
            "action": "show_feedback",
            "feedback": "Great pronunciation!",
            "accuracy": 92
        }
        {
            "action": "show_stats",
            "accuracy": "92%",
            "vowel": "88%",
            "consonant": "95%",
            "phoneme_errors": "1",
            "detected_word": "apple"
        }
        {
            "action": "next_word"
        }
    """
    try:
        app = ensure_app_running()

        action = payload.get("action", "unknown")

        # Queue command for UI thread
        app.command_queue.put(payload)

        logger.info(f"[UI] Queued action: {action}")

        # Small delay to let command process
        await asyncio.sleep(0.1)

        return {
            "driver": "body_app",
            "action": action,
            "status": "ok",
            "message": f"UI updated with action: {action}",
        }

    except Exception as exc:
        logger.error(f"[UI] Error in show_ui: {exc}", exc_info=True)
        return {
            "driver": "body_app",
            "status": "error",
            "error_message": str(exc),
        }


__all__ = ["show_ui", "ensure_app_running"]