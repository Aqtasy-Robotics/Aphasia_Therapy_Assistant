"""Body UI driver — Kivy 7-inch touchscreen integration.

UPDATED FOR PI → LAPTOP ARCHITECTURE:
- on_speak_tap → records audio from Pi mic → POST to laptop server → plays TTS response.
- Session state persists across multiple button presses (retries + multi-word).
- Laptop server URL is read from config.json → "laptop_server" → "url".
"""

from __future__ import annotations

import os
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from queue import Empty, Queue
from threading import Thread
from typing import Any, Dict, List

import requests
import sounddevice as sd
import soundfile as sf

from kivy.app import App
from kivy.clock import Clock
from kivy.lang import Builder
from kivy.properties import NumericProperty, StringProperty
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.screenmanager import Screen
from kivy.uix.textinput import TextInput
import importlib
import logging

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
VALID_SCREENS = {
    "idle", "home", "category_selection", "practice_word",
    "empty_state", "feedback", "settings",
}

DEFAULT_WORDS_BY_CATEGORY: Dict[str, List[str]] = {
    "food":    ["Orange", "Apple", "Water", "Bread"],
    "objects": ["Table", "Chair", "Phone", "Book"],
    "people":  ["Mother", "Doctor", "Teacher", "Friend"],
}
DEFAULT_WORDS_BY_CATEGORY["all"] = (
    DEFAULT_WORDS_BY_CATEGORY["food"]
    + DEFAULT_WORDS_BY_CATEGORY["objects"]
    + DEFAULT_WORDS_BY_CATEGORY["people"]
)

# Pi mic recording settings (must match what Whisper expects)
_PI_SAMPLE_RATE    = int(os.getenv("SAMPLE_RATE", 16000))
_PI_RECORD_SECONDS = int(os.getenv("RECORD_SECONDS", 8))

_UI_COMMAND_QUEUE: Queue[Dict[str, Any]] = Queue(maxsize=256)
_UI_EVENT_QUEUE:   Queue[Dict[str, Any]] = Queue(maxsize=256)
_APP_THREAD: Thread | None = None
_APP_READY = False


# ── Pi audio helpers (module level, no Kivy dependency) ──────────────────────

def _find_pi_microphone() -> int:
    """Return the default input device index on the Pi."""
    try:
        default = sd.query_devices(kind="input")
        for idx, d in enumerate(sd.query_devices()):
            if d["name"] == default["name"] and d["max_input_channels"] >= 1:
                return idx
    except Exception:
        pass
    for idx, d in enumerate(sd.query_devices()):
        if d["max_input_channels"] >= 1:
            return idx
    raise RuntimeError("No input device found on Pi.")


def _record_pi_audio() -> str:
    """
    Record from the Pi's microphone for _PI_RECORD_SECONDS seconds.
    Saves to a temp WAV file and returns its path.
    The caller is responsible for deleting the file.
    """
    device_index = _find_pi_microphone()
    print(f"[Pi] Recording {_PI_RECORD_SECONDS}s from device {device_index}…")

    audio = sd.rec(
        int(_PI_RECORD_SECONDS * _PI_SAMPLE_RATE),
        samplerate=_PI_SAMPLE_RATE,
        channels=1,
        dtype="float32",
        device=device_index,
    )
    sd.wait()
    audio = audio.squeeze()

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    sf.write(tmp.name, audio, _PI_SAMPLE_RATE)
    tmp.close()
    print(f"[Pi] Audio saved: {tmp.name}")
    return tmp.name


def _play_audio_on_pi(wav_path: str) -> None:
    """Play a WAV file through the Pi's speaker via sounddevice."""
    try:
        data, sample_rate = sf.read(wav_path, dtype="float32")
        # Find default output device
        out_device = None
        try:
            default_out = sd.query_devices(kind="output")
            for idx, d in enumerate(sd.query_devices()):
                if d["name"] == default_out["name"] and d["max_output_channels"] >= 1:
                    out_device = idx
                    break
        except Exception:
            pass

        print(f"[Pi] Playing TTS audio ({len(data)/sample_rate:.1f}s)…")
        sd.play(data, samplerate=sample_rate, device=out_device)
        sd.wait()
        print("[Pi] Playback complete.")
    except Exception as exc:
        logger.warning("[Pi] Audio playback failed: %s", exc)


# ── Queue helpers ─────────────────────────────────────────────────────────────

def _safe_put(queue_obj: Queue[Dict[str, Any]], item: Dict[str, Any]) -> bool:
    try:
        queue_obj.put_nowait(item)
        return True
    except Exception:
        logger.warning("UI queue is full, dropping event: %s", item.get("type", "unknown"))
        return False


def dequeue_ui_events(max_items: int = 16) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    for _ in range(max_items):
        try:
            events.append(_UI_EVENT_QUEUE.get_nowait())
        except Empty:
            break
    return events


def has_pending_ui_events() -> bool:
    try:
        return _UI_EVENT_QUEUE.qsize() > 0
    except NotImplementedError:
        return False


def _parse_screen(payload: Dict[str, Any]) -> str:
    raw = str(payload.get("screen", "idle")).strip().lower()
    return raw if raw in VALID_SCREENS else "idle"


# ── State ─────────────────────────────────────────────────────────────────────

@dataclass
class UiState:
    screen: str = "home"
    message: str = ""
    progress_text: str = "Word 1 of 1"
    category_text: str = "Category: all"
    progress_value: float = 1.0
    word: str = "Apple"
    mic_hint: str = "Click to speak"
    feedback_message: str = "Great job!"
    feedback_icon: str = "SUCCESS"
    settings_volume: float = 80.0
    settings_server_url: str = ""
    settings_device_id: str = ""
    words: List[str] = field(default_factory=lambda: list(DEFAULT_WORDS_BY_CATEGORY["all"]))
    current_index: int = 0
    category: str = "all"
    patient_name: str = ""
    session_busy: bool = False


# ── Screen classes (unchanged) ────────────────────────────────────────────────

class BaseUiScreen(Screen):
    pass

class HomeScreen(BaseUiScreen):
    pass

class CategorySelectionScreen(BaseUiScreen):
    pass

class PracticeWordScreen(BaseUiScreen):
    progress_text  = StringProperty("Word 1 of 1")
    category_text  = StringProperty("Category: all")
    word           = StringProperty("Apple")
    mic_hint       = StringProperty("Click to speak")
    progress_value = NumericProperty(1.0)

class EmptyStateScreen(BaseUiScreen):
    empty_title    = StringProperty("No Practiced Words Yet")
    empty_subtitle = StringProperty(
        "You haven't practiced any words yet. Start a therapy session to practice new words first!"
    )

class FeedbackScreen(BaseUiScreen):
    feedback_icon    = StringProperty("SUCCESS")
    feedback_message = StringProperty("Great job!")

class SettingsScreen(BaseUiScreen):
    volume_text = StringProperty("80%")
    server_url  = StringProperty("")
    device_id   = StringProperty("")


# ── Main App ──────────────────────────────────────────────────────────────────

class SpeechTherapyApp(App):
    """Kivy UI app. Session audio flows: Pi mic → laptop server → Pi speaker."""

    def __init__(
        self,
        *,
        display_width: int = 800,
        display_height: int = 480,
        fullscreen: bool = False,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        self.display_width   = display_width
        self.display_height  = display_height
        self.fullscreen_mode = fullscreen
        self.state           = UiState()
        self._last_feedback_ts = 0.0
        self._graph_module   = None

        # Remote session tracking
        self._remote_session_id: str | None = None   # set when session is active
        self._laptop_server_url: str | None = None   # resolved lazily from config

    # ── Build ─────────────────────────────────────────────────────

    def build(self):
        kv_path = Path(__file__).with_name("body_app.kv")
        Builder.load_file(str(kv_path))
        from kivy.core.window import Window
        Window.size = (self.display_width, self.display_height)
        Window.clearcolor = (0.95, 0.95, 0.95, 1)
        if self.fullscreen_mode:
            Window.fullscreen = "auto"
        return Builder.load_string(
            """
ScreenManager:
    HomeScreen:
        name: "home"
    CategorySelectionScreen:
        name: "category_selection"
    PracticeWordScreen:
        name: "practice_word"
    EmptyStateScreen:
        name: "empty_state"
    FeedbackScreen:
        name: "feedback"
    SettingsScreen:
        name: "settings"
    HomeScreen:
        name: "idle"
"""
        )

    def on_start(self) -> None:
        global _APP_READY
        _APP_READY = True
        Clock.schedule_interval(self._drain_ui_command_queue, 1 / 30.0)
        Clock.schedule_interval(self._feedback_autoreturn, 1 / 10.0)
        Clock.schedule_interval(self._poll_agent_progress, 0.15)
        self._apply_state()

    def on_stop(self) -> None:
        global _APP_READY
        _APP_READY = False
        # Clean up any open session on the server
        if self._remote_session_id:
            self._cleanup_remote_session()

    # ── Config helpers ────────────────────────────────────────────

    def _get_server_url(self) -> str:
        """Return the laptop server URL from config.json or env var."""
        if self._laptop_server_url:
            return self._laptop_server_url

        # 1. Env var override (handy for testing)
        env_url = os.getenv("LAPTOP_SERVER_URL", "").strip()
        if env_url:
            self._laptop_server_url = env_url.rstrip("/")
            return self._laptop_server_url

        # 2. config.json → "laptop_server" → "url"
        try:
            import json
            project_root = Path(__file__).resolve().parents[2]
            with (project_root / "config.json").open("r", encoding="utf-8") as fh:
                cfg = json.load(fh)
            url = cfg.get("laptop_server", {}).get("url", "").strip()
            if url:
                self._laptop_server_url = url.rstrip("/")
                return self._laptop_server_url
        except Exception as exc:
            logger.warning("Could not read laptop_server.url from config.json: %s", exc)

        # 3. Fallback default (update this to your laptop IP)
        default = "http://192.168.1.100:8000"
        logger.warning("Using default server URL: %s — set in config.json or LAPTOP_SERVER_URL env var", default)
        self._laptop_server_url = default
        return default

    def _cleanup_remote_session(self) -> None:
        """Tell the server to clean up the session (fire-and-forget)."""
        if not self._remote_session_id:
            return
        try:
            requests.delete(
                f"{self._get_server_url()}/session/{self._remote_session_id}",
                timeout=3,
            )
        except Exception:
            pass
        self._remote_session_id = None

    # ── Clock callbacks ───────────────────────────────────────────

    def _feedback_autoreturn(self, _dt: float) -> None:
        if self.root.current != "feedback":
            return
        if (time.monotonic() - self._last_feedback_ts) > 1.0:
            self.root.current = "practice_word"

    def _poll_agent_progress(self, _dt: float) -> None:
        if not self.state.session_busy:
            return
        try:
            from agentic.progress_bridge import drain_progress_events
        except ImportError:
            return
        events = drain_progress_events(24)
        if not events:
            return
        last = events[-1]
        hint = (last.get("detail") or last.get("step") or "").strip()
        if hint:
            self.state.mic_hint = str(hint)[:140]
            self._apply_state()

    def _drain_ui_command_queue(self, _dt: float) -> None:
        for _ in range(12):
            try:
                payload = _UI_COMMAND_QUEUE.get_nowait()
            except Empty:
                break
            self._apply_payload(payload)

    # ── State application ─────────────────────────────────────────

    def _apply_payload(self, payload: Dict[str, Any]) -> None:
        screen = _parse_screen(payload)
        words = payload.get("words")
        if isinstance(words, list) and words:
            self.state.words = [str(x) for x in words]
        if "current_index" in payload:
            try:
                idx = int(payload.get("current_index", 0))
                self.state.current_index = max(0, min(idx, len(self.state.words) - 1))
            except Exception:
                self.state.current_index = 0
        if "word" in payload:
            self.state.word = str(payload.get("word") or self.state.word)
        elif self.state.words:
            self.state.word = self.state.words[self.state.current_index]

        self.state.category = str(payload.get("category", self.state.category))
        self.state.category_text = f"Category: {self.state.category}"
        total_words = max(len(self.state.words), 1)
        self.state.progress_text = f"Word {self.state.current_index + 1} of {total_words}"
        self.state.progress_value = float((self.state.current_index + 1) / total_words)
        if "progress" in payload:
            try:
                self.state.progress_value = max(0.0, min(float(payload["progress"]), 1.0))
            except Exception:
                pass

        self.state.message          = str(payload.get("message", self.state.message))
        self.state.feedback_message = str(payload.get("message", self.state.feedback_message))
        feedback = str(payload.get("feedback", "correct")).lower()
        self.state.feedback_icon    = "SUCCESS" if feedback == "correct" else "FAIL"
        self.state.settings_volume      = float(payload.get("volume", self.state.settings_volume))
        self.state.settings_server_url  = str(payload.get("server_url", self.state.settings_server_url))
        self.state.settings_device_id   = str(payload.get("device_id", self.state.settings_device_id))
        self.state.screen = screen
        if screen == "feedback":
            self._last_feedback_ts = time.monotonic()
        self._apply_state()

    def _apply_state(self) -> None:
        if not self.root:
            return
        current_target = self.state.screen
        if current_target not in self.root.screen_names:
            current_target = "home"
        self.root.current = current_target

        practice = self.root.get_screen("practice_word")
        practice.word           = self.state.word
        practice.progress_text  = self.state.progress_text
        practice.category_text  = self.state.category_text
        practice.progress_value = self.state.progress_value
        practice.mic_hint       = self.state.mic_hint

        feedback = self.root.get_screen("feedback")
        feedback.feedback_icon    = self.state.feedback_icon
        feedback.feedback_message = self.state.feedback_message

        settings = self.root.get_screen("settings")
        settings.volume_text = f"{int(self.state.settings_volume)}%"
        settings.server_url  = self.state.settings_server_url
        settings.device_id   = self.state.settings_device_id

    # ── Event emitters ────────────────────────────────────────────

    def emit_touch_event(self, event_type: str, **payload: Any) -> None:
        _safe_put(
            _UI_EVENT_QUEUE,
            {"type": event_type, "payload": payload, "timestamp": time.time()},
        )

    # ── Navigation callbacks (unchanged) ─────────────────────────

    def on_nav_home(self) -> None:
        # If a session is in progress, clean it up gracefully
        if self._remote_session_id:
            Thread(target=self._cleanup_remote_session, daemon=True).start()
        self.state.screen = "home"
        self._apply_state()
        self.emit_touch_event("back_home")

    def on_start_session(self) -> None:
        self.state.screen = "practice_word"
        self._apply_state()
        self.emit_touch_event("start_session")

    def on_self_practice(self) -> None:
        self.state.screen = "category_selection"
        self._apply_state()
        self.emit_touch_event("self_practice")

    def on_select_category(self, category: str) -> None:
        self.state.category      = category
        self.state.category_text = f"Category: {category}"
        self.state.words         = list(DEFAULT_WORDS_BY_CATEGORY.get(category, DEFAULT_WORDS_BY_CATEGORY["all"]))
        self.state.current_index = 0
        if self.state.words:
            self.state.word = self.state.words[0]
        self.state.screen = "practice_word"
        self._apply_state()
        self.emit_touch_event("select_category", category=category)

    def on_prev_word(self) -> None:
        self.state.current_index = max(0, self.state.current_index - 1)
        self._apply_payload({"screen": "practice_word"})
        self.emit_touch_event("prev")

    def on_next_word(self) -> None:
        self.state.current_index = min(len(self.state.words) - 1, self.state.current_index + 1)
        self._apply_payload({"screen": "practice_word"})
        self.emit_touch_event("next")

    def on_open_settings(self) -> None:
        self.state.screen = "settings"
        self._apply_state()
        self.emit_touch_event("open_settings")

    def on_close_app(self) -> None:
        """Stop the Kivy app and exit the process cleanly."""
        if self._remote_session_id:
            self._cleanup_remote_session()
        self.stop()

    # ── Speak tap ─────────────────────────────────────────────────

    def on_speak_tap(self) -> None:
        """
        Called every time the mic button is pressed.
        - First press (no active session): pings server, starts session, records.
        - Subsequent presses (retry / next word): records and sends another attempt.
        """
        if self.state.session_busy:
            return
        if not self.state.patient_name:
            self._open_patient_name_popup()
            return
        self._start_session_worker(self.state.patient_name)

    def _open_patient_name_popup(self) -> None:
        box = BoxLayout(orientation="vertical", spacing=10, padding=12)
        label     = Label(text="Enter patient full name", size_hint_y=None, height=34)
        input_name = TextInput(
            multiline=False,
            hint_text="Patient name from Supabase profiles.full_name",
            size_hint_y=None,
            height=42,
        )
        feedback_lbl = Label(text="", color=(0.9, 0.2, 0.2, 1), size_hint_y=None, height=24)
        actions = BoxLayout(size_hint_y=None, height=42, spacing=8)
        popup = Popup(
            title="Start Therapy Session",
            content=box,
            size_hint=(None, None),
            size=(520, 250),
            auto_dismiss=False,
        )

        def _cancel(_btn: Button) -> None:
            popup.dismiss()

        def _confirm(_btn: Button) -> None:
            name = (input_name.text or "").strip()
            if not name:
                feedback_lbl.text = "Patient name is required."
                return
            self.state.patient_name = name
            popup.dismiss()
            self._start_session_worker(name)

        cancel_btn  = Button(text="Cancel")
        confirm_btn = Button(text="Start")
        cancel_btn.bind(on_release=_cancel)
        confirm_btn.bind(on_release=_confirm)
        actions.add_widget(cancel_btn)
        actions.add_widget(confirm_btn)
        box.add_widget(label)
        box.add_widget(input_name)
        box.add_widget(feedback_lbl)
        box.add_widget(actions)
        popup.open()
        Clock.schedule_once(lambda _dt: setattr(input_name, "focus", True), 0.2)

    # ── Session worker (Pi → HTTP → laptop → Pi speaker) ─────────

    def _start_session_worker(self, patient_name: str) -> None:
        """
        Background thread that:
        1. Starts a session on the laptop server (first call only).
        2. Records audio from the Pi mic.
        3. POSTs the audio to the laptop server.
        4. Handles the response:
           - retry   → update mic hint, allow next button press
           - audio   → play TTS on Pi speaker, then either show next word or complete
        """
        if self.state.session_busy:
            return
        self.state.session_busy = True
        try:
            from agentic.progress_bridge import clear_progress_events
            clear_progress_events()
        except ImportError:
            pass

        server_url = self._get_server_url()

        # Show recording state immediately so the user knows it's listening
        self.state.mic_hint = "🎤 Recording…"
        self._apply_state()
        self.emit_touch_event("speak_tap", word=self.state.word, patient_name=patient_name)

        def _runner() -> None:
            release_busy_in_finally = True
            audio_path: str | None = None

            try:
                # ── Step 1: Start session on first press ─────────────
                if self._remote_session_id is None:
                    self.state.mic_hint = "Connecting to server…"
                    Clock.schedule_once(lambda _: self._apply_state(), 0)

                    resp = requests.post(
                        f"{server_url}/session/start",
                        data={"patient_name": patient_name},
                        timeout=15,
                    )
                    resp.raise_for_status()
                    session_data = resp.json()
                    self._remote_session_id = session_data["session_id"]

                    # Update GUI with words from Supabase
                    target_words  = session_data.get("target_words", self.state.words)
                    target_word   = session_data.get("target_word", self.state.word)

                    def _init_words(_dt: float) -> None:
                        self._apply_payload({
                            "screen":        "practice_word",
                            "words":         target_words,
                            "current_index": 0,
                            "word":          target_word,
                            "category":      self.state.category,
                        })
                    Clock.schedule_once(_init_words, 0)

                self.state.mic_hint = "🎤 Recording…"
                Clock.schedule_once(lambda _: self._apply_state(), 0)

                # ── Step 2: Record audio from Pi mic ──────────────────
                audio_path = _record_pi_audio()

                self.state.mic_hint = "Processing…"
                Clock.schedule_once(lambda _: self._apply_state(), 0)

                # ── Step 3: POST audio to laptop server ───────────────
                with open(audio_path, "rb") as audio_file:
                    resp = requests.post(
                        f"{server_url}/session/{self._remote_session_id}/attempt",
                        files={"audio": ("recording.wav", audio_file, "audio/wav")},
                        timeout=90,  # graph + TTS can take a while
                    )
                resp.raise_for_status()

                # ── Step 4: Handle response ───────────────────────────
                content_type = resp.headers.get("content-type", "")

                if "audio/wav" in content_type:
                    # ── Got TTS audio ─────────────────────────────────
                    status        = resp.headers.get("X-Session-Status", "complete")
                    feedback_text = resp.headers.get("X-Feedback-Text", "")
                    next_word     = resp.headers.get("X-Target-Word", "")
                    current_index = int(resp.headers.get("X-Current-Index", "0") or "0")

                    # Save TTS audio to a temp file and play it
                    tts_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                    tts_tmp.write(resp.content)
                    tts_tmp.close()
                    try:
                        _play_audio_on_pi(tts_tmp.name)
                    finally:
                        try:
                            os.unlink(tts_tmp.name)
                        except OSError:
                            pass

                    if status == "complete":
                        # Session finished — show feedback screen
                        self._remote_session_id = None

                        def _complete(_dt: float) -> None:
                            self._apply_payload({
                                "screen":   "feedback",
                                "message":  feedback_text or "Session complete!",
                                "feedback": "correct",
                            })
                            self.state.mic_hint = "Click to speak"
                        Clock.schedule_once(_complete, 0)

                    else:
                        # More words — update GUI and allow next press
                        release_busy_in_finally = False  # UI callback handles it

                        def _next_word(_dt: float) -> None:
                            self._apply_payload({
                                "screen":        "practice_word",
                                "word":          next_word,
                                "current_index": current_index,
                            })
                            self.state.mic_hint = "Click to speak"
                            self.state.session_busy = False
                            self._apply_state()
                        Clock.schedule_once(_next_word, 0)

                else:
                    # ── JSON response (retry or text-only complete) ───
                    data   = resp.json()
                    status = data.get("status", "retry")

                    if status == "retry":
                        hint = data.get("hint", "Please try again.")
                        release_busy_in_finally = False  # UI callback handles it

                        def _retry(_dt: float) -> None:
                            self.state.mic_hint = hint
                            self.state.session_busy = False
                            self._apply_state()
                        Clock.schedule_once(_retry, 0)

                    elif status == "complete":
                        self._remote_session_id = None
                        feedback_text = data.get("feedback_text", "Session complete.")

                        def _text_complete(_dt: float) -> None:
                            self._apply_payload({
                                "screen":   "feedback",
                                "message":  feedback_text,
                                "feedback": "correct",
                            })
                            self.state.mic_hint = "Click to speak"
                        Clock.schedule_once(_text_complete, 0)

                    else:
                        # next_word text-only
                        next_word     = data.get("target_word", self.state.word)
                        current_index = int(data.get("current_index", 0))
                        release_busy_in_finally = False

                        def _text_next(_dt: float) -> None:
                            self._apply_payload({
                                "screen":        "practice_word",
                                "word":          next_word,
                                "current_index": current_index,
                            })
                            self.state.mic_hint = "Click to speak"
                            self.state.session_busy = False
                            self._apply_state()
                        Clock.schedule_once(_text_next, 0)

            except requests.exceptions.ConnectionError:
                self._remote_session_id = None
                self._on_session_error(
                    f"Cannot reach laptop server at {server_url}. "
                    "Check your Wi-Fi and that the server is running."
                )
            except requests.exceptions.Timeout:
                self._on_session_error("Server timed out. The laptop may be busy.")
            except Exception as exc:
                self._remote_session_id = None
                self._on_session_error(str(exc))
            finally:
                # Delete audio file
                if audio_path:
                    try:
                        os.unlink(audio_path)
                    except OSError:
                        pass
                # Reset busy flag (unless a UI callback will do it)
                if release_busy_in_finally:
                    def _reset_busy(_dt: float) -> None:
                        self.state.session_busy = False
                        self._apply_state()
                    Clock.schedule_once(_reset_busy, 0)

        Thread(target=_runner, name="pi-session-thread", daemon=True).start()

    # ── Session outcome callbacks ─────────────────────────────────

    def _on_session_error(self, error_message: str) -> None:
        def _apply(_dt: float) -> None:
            self._apply_payload({
                "screen":   "feedback",
                "message":  f"Session failed: {error_message}",
                "feedback": "incorrect",
            })
            self.state.mic_hint     = "Click to speak"
            self.state.session_busy = False
            self.emit_touch_event("session_error", error=error_message)
        Clock.schedule_once(_apply, 0)

    # ── Keep original show_ui / queue-driven update path intact ──

    def _load_graph_module(self):
        """Kept for backward-compat; not used in remote HTTP mode."""
        if self._graph_module is not None:
            return self._graph_module
        here = Path(__file__).resolve()
        repo_root = here
        for p in [here, *here.parents]:
            if (p / "agentic" / "graph.py").is_file():
                repo_root = p
                break
        if str(repo_root) not in sys.path:
            sys.path.insert(0, str(repo_root))
        self._graph_module = importlib.import_module("agentic.graph")
        return self._graph_module


# ── Public API (unchanged) ────────────────────────────────────────────────────

def ensure_app_running(
    *,
    width: int | None = None,
    height: int | None = None,
    fullscreen: bool | None = None,
) -> bool:
    project_root = Path(__file__).resolve().parents[2]
    cfg = load_display_config(project_root)
    return start_ui_app(
        width=int(cfg["width"] if width is None else width),
        height=int(cfg["height"] if height is None else height),
        fullscreen=bool(cfg["fullscreen"] if fullscreen is None else fullscreen),
    )


def start_ui_app(*, width: int = 800, height: int = 480, fullscreen: bool = False) -> bool:
    global _APP_THREAD
    if _APP_THREAD and _APP_THREAD.is_alive():
        return True

    def _runner() -> None:
        app = SpeechTherapyApp(display_width=width, display_height=height, fullscreen=fullscreen)
        app.run()

    _APP_THREAD = Thread(target=_runner, name="kivy-ui-thread", daemon=True)
    _APP_THREAD.start()
    return True


def is_ui_ready() -> bool:
    return _APP_READY


async def show_ui(payload: Dict[str, Any]) -> Dict[str, Any]:
    screen = _parse_screen(payload)
    accepted = _safe_put(_UI_COMMAND_QUEUE, {"type": "show_ui", "screen": screen, **payload})
    logger.info("[UI] show_ui queued screen=%s accepted=%s", screen, accepted)
    return {
        "driver":   "body_app",
        "action":   "show_ui",
        "screen":   screen,
        "status":   "ok" if accepted else "queue_full",
        "ui_ready": _APP_READY,
    }


def load_display_config(project_root: Path) -> Dict[str, Any]:
    import json
    default = {"width": 800, "height": 480, "fullscreen": False}
    try:
        with (project_root / "config.json").open("r", encoding="utf-8") as fh:
            cfg = json.load(fh)
        display = cfg.get("display", {})
        return {
            "width":      int(display.get("width",      default["width"])),
            "height":     int(display.get("height",     default["height"])),
            "fullscreen": bool(display.get("fullscreen", default["fullscreen"])),
        }
    except Exception as exc:
        logger.warning("Failed to load display config, using defaults: %s", exc)
        return default


def maybe_start_ui_from_env(project_root: Path) -> bool:
    if os.getenv("EXECUTION_AGENT_START_UI", "0") != "1":
        return False
    display = load_display_config(project_root)
    return start_ui_app(
        width=display["width"],
        height=display["height"],
        fullscreen=display["fullscreen"],
    )


__all__ = [
    "SpeechTherapyApp",
    "ensure_app_running",
    "show_ui",
    "start_ui_app",
    "is_ui_ready",
    "dequeue_ui_events",
    "has_pending_ui_events",
    "load_display_config",
    "maybe_start_ui_from_env",
]