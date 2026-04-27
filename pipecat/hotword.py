"""
Wake-word → ElevenLabs ConvAI (Raspberry Pi / Linux).

Uses EfficientWord-Net at 16 kHz internally. If the mic rejects 16 kHz (PortAudio
-9997), capture at HOTWORD_MIC_SAMPLE_RATE (default 48000) and resample to 16 kHz.

Env: HOTWORD_DEBUG=1 — log why the wake word is not firing (VAD vs low confidence).
"""

from __future__ import annotations

import os
from typing import Callable
import queue
import signal
import threading
import time

import numpy as np
import pyaudio
from scipy.signal import resample_poly

from eff_word_net import RATE
from eff_word_net.audio_processing import Resnet50_Arc_loss
from eff_word_net.engine import HotwordDetector
from eff_word_net.streams import CustomAudioStream

from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import (
    AudioInterface,
    Conversation,
    ConversationInitiationData,
)

# Mic rate your hardware actually supports (try 44100 if 48000 fails)
HARDWARE_RATE = int(os.getenv("HOTWORD_MIC_SAMPLE_RATE", "48000"))

# Set to a PortAudio input index to avoid wrong default / ALSA probing spam on Pi.
# Run once with HOTWORD_LIST_DEVICES=1 to print indices, then e.g. HOTWORD_INPUT_DEVICE_INDEX=1
_INPUT_DEVICE_RAW = os.getenv("HOTWORD_INPUT_DEVICE_INDEX", "").strip()

# Optional separate playback device (USB adapter may be mic-only)
_OUTPUT_DEVICE_RAW = os.getenv("CONVAI_OUTPUT_DEVICE_INDEX", "").strip()

# ElevenLabs SDK expects 16 kHz PCM; DefaultAudioInterface opens the mic at 16 kHz,
# which many USB devices reject — use hardware rate + resampling instead.
CONVAI_RATE = 16000

# Set HOTWORD_DEBUG=1 to print near-miss scores (helps when wake word never fires)
HOTWORD_DEBUG = os.getenv("HOTWORD_DEBUG", "").strip().lower() in ("1", "true", "yes")

convai_active = False
_last_debug_print = 0.0


def _parse_input_device_index() -> int | None:
    if not _INPUT_DEVICE_RAW:
        return None
    return int(_INPUT_DEVICE_RAW, 10)


def _parse_output_device_index() -> int | None:
    if not _OUTPUT_DEVICE_RAW:
        return None
    return int(_OUTPUT_DEVICE_RAW, 10)


class ResamplingConvaiAudioInterface(AudioInterface):
    """Open PyAudio at HARDWARE_RATE; SDK still receives / sends 16 kHz PCM."""

    INPUT_FRAMES_16K = 4000
    OUTPUT_FRAMES_16K = 1000

    def __init__(self) -> None:
        self._pyaudio = pyaudio
        self._input_callback: Callable[[bytes], None] | None = None
        self._output_queue: queue.Queue[bytes] | None = None
        self._should_stop: threading.Event | None = None
        self._output_thread: threading.Thread | None = None
        self._p: pyaudio.PyAudio | None = None
        self._in_stream = None
        self._out_stream = None
        g = int(np.gcd(CONVAI_RATE, HARDWARE_RATE))
        self._up_hw_to_16 = CONVAI_RATE // g
        self._down_hw_to_16 = HARDWARE_RATE // g
        self._up_16_to_hw = HARDWARE_RATE // g
        self._down_16_to_hw = CONVAI_RATE // g

    def start(self, input_callback: Callable[[bytes], None]) -> None:
        self._input_callback = input_callback
        self._output_queue = queue.Queue()
        self._should_stop = threading.Event()
        fpb_in = int(round(self.INPUT_FRAMES_16K * HARDWARE_RATE / CONVAI_RATE))
        fpb_out = int(round(self.OUTPUT_FRAMES_16K * HARDWARE_RATE / CONVAI_RATE))

        self._p = self._pyaudio.PyAudio()
        in_idx = _parse_input_device_index()
        out_idx = _parse_output_device_index()
        if in_idx is not None:
            print(f"ConvAI input device index: {in_idx}")
        if out_idx is not None:
            print(f"ConvAI output device index: {out_idx}")
        print(
            f"ConvAI audio: device I/O at {HARDWARE_RATE} Hz, "
            f"SDK sees {CONVAI_RATE} Hz (scipy resample_poly)"
        )

        def _in_callback(in_data, frame_count, time_info, status):
            if self._input_callback and in_data:
                hw = np.frombuffer(in_data, dtype=np.int16)
                y = resample_poly(
                    hw.astype(np.float64),
                    self._up_hw_to_16,
                    self._down_hw_to_16,
                ).astype(np.int16)
                self._input_callback(y.tobytes())
            return (None, self._pyaudio.paContinue)

        in_kw: dict = {
            "format": self._pyaudio.paInt16,
            "channels": 1,
            "rate": HARDWARE_RATE,
            "input": True,
            "stream_callback": _in_callback,
            "frames_per_buffer": fpb_in,
            "start": True,
        }
        if in_idx is not None:
            in_kw["input_device_index"] = in_idx
        self._in_stream = self._p.open(**in_kw)

        out_kw: dict = {
            "format": self._pyaudio.paInt16,
            "channels": 1,
            "rate": HARDWARE_RATE,
            "output": True,
            "frames_per_buffer": fpb_out,
            "start": True,
        }
        if out_idx is not None:
            out_kw["output_device_index"] = out_idx
        self._out_stream = self._p.open(**out_kw)

        self._output_thread = threading.Thread(target=self._output_thread_fn)
        self._output_thread.start()

    def _output_thread_fn(self) -> None:
        assert self._should_stop and self._output_queue and self._out_stream
        while not self._should_stop.is_set():
            try:
                audio = self._output_queue.get(timeout=0.25)
            except queue.Empty:
                continue
            if not audio:
                continue
            pcm16 = np.frombuffer(audio, dtype=np.int16)
            y = resample_poly(
                pcm16.astype(np.float64),
                self._up_16_to_hw,
                self._down_16_to_hw,
            ).astype(np.int16)
            self._out_stream.write(y.tobytes())

    def stop(self) -> None:
        if self._should_stop:
            self._should_stop.set()
        if self._output_thread:
            self._output_thread.join(timeout=5.0)
            self._output_thread = None
        if self._in_stream:
            self._in_stream.stop_stream()
            self._in_stream.close()
            self._in_stream = None
        if self._out_stream:
            self._out_stream.stop_stream()
            self._out_stream.close()
            self._out_stream = None
        if self._p:
            self._p.terminate()
            self._p = None

    def output(self, audio: bytes) -> None:
        if self._output_queue is not None:
            self._output_queue.put(audio)

    def interrupt(self) -> None:
        if self._output_queue is None:
            return
        try:
            while True:
                self._output_queue.get(block=False)
        except queue.Empty:
            pass


def list_input_devices() -> None:
    """Print capture devices; run with HOTWORD_LIST_DEVICES=1 python hotword.py"""
    p = pyaudio.PyAudio()
    try:
        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            if int(info.get("maxInputChannels", 0)) > 0:
                print(f"  [{i}] {info.get('name', '?')}")
    finally:
        p.terminate()

elevenlabs = ElevenLabs()
agent_id = os.getenv("ELEVENLABS_AGENT_ID")
api_key = os.getenv("ELEVENLABS_API_KEY")

dynamic_vars = {
    "user_name": "Thor",
    "greeting": "Hey",
}

config = ConversationInitiationData(dynamic_variables=dynamic_vars)

base_model = Resnet50_Arc_loss()

eleven_hw = HotwordDetector(
    hotword="hey_eleven",
    model=base_model,
    reference_file=os.path.join("hotword_refs", "hey_eleven_ref.json"),
    threshold=0.7,
    relaxation_time=2,
)


def make_resampling_mic_stream(
    *,
    window_length_secs: float = 1.5,
    sliding_window_secs: float = 0.75,
) -> CustomAudioStream:
    """Open the mic at HARDWARE_RATE; resample chunks to RATE (16000) for the detector."""
    if HARDWARE_RATE <= 0:
        raise ValueError("HOTWORD_MIC_SAMPLE_RATE must be positive")

    sliding_16k = int(sliding_window_secs * RATE)
    chunk_hw = int(sliding_window_secs * HARDWARE_RATE)
    if chunk_hw <= 0:
        raise ValueError("sliding_window_secs too small for HARDWARE_RATE")

    g = np.gcd(RATE, HARDWARE_RATE)
    up = RATE // g
    down = HARDWARE_RATE // g

    print(f"Hotword mic: capture {HARDWARE_RATE} Hz → resample {up}/{down} → {RATE} Hz")
    print(f"Chunk (HW samples per read): {chunk_hw}")

    p = pyaudio.PyAudio()
    in_idx = _parse_input_device_index()
    if in_idx is not None:
        print(f"Using input device index: {in_idx}")
    open_kw: dict = {
        "format": pyaudio.paInt16,
        "channels": 1,
        "rate": HARDWARE_RATE,
        "input": True,
        "frames_per_buffer": chunk_hw,
    }
    if in_idx is not None:
        open_kw["input_device_index"] = in_idx
    mic = p.open(**open_kw)
    mic.stop_stream()

    def read_frame() -> np.ndarray:
        raw = np.frombuffer(
            mic.read(chunk_hw, exception_on_overflow=False),
            dtype=np.int16,
        )
        out = resample_poly(raw.astype(np.float64), up, down).astype(np.int16)
        if out.shape[0] != sliding_16k:
            raise RuntimeError(
                f"Resample length mismatch: got {out.shape[0]}, expected {sliding_16k}"
            )
        return out

    return CustomAudioStream(
        open_stream=mic.start_stream,
        close_stream=mic.stop_stream,
        get_next_frame=read_frame,
        window_length_secs=window_length_secs,
        sliding_window_secs=sliding_window_secs,
    )


def create_conversation():
    """Create a new conversation instance"""
    return Conversation(
        elevenlabs,
        agent_id,
        config=config,
        requires_auth=bool(api_key),
        audio_interface=ResamplingConvaiAudioInterface(),
        callback_agent_response=lambda response: print(f"Agent: {response}"),
        callback_agent_response_correction=lambda original, corrected: print(
            f"Agent: {original} -> {corrected}"
        ),
        callback_user_transcript=lambda transcript: print(f"User: {transcript}"),
    )


def start_mic_stream():
    """Start or restart the microphone stream"""
    global mic_stream
    try:
        mic_stream = make_resampling_mic_stream(
            window_length_secs=1.5,
            sliding_window_secs=0.75,
        )
        mic_stream.start_stream()
        print("Microphone stream started")
    except Exception as e:
        print(f"Error starting microphone stream: {e}")
        mic_stream = None
        time.sleep(1)


def stop_mic_stream():
    """Stop the microphone stream safely"""
    global mic_stream
    try:
        if mic_stream:
            mic_stream = None
            print("Microphone stream stopped")
    except Exception as e:
        print(f"Error stopping microphone stream: {e}")


if os.getenv("HOTWORD_LIST_DEVICES", "").strip() in ("1", "true", "yes"):
    print("PyAudio input devices (use HOTWORD_INPUT_DEVICE_INDEX=<n>):")
    list_input_devices()
    raise SystemExit(0)

mic_stream = None
start_mic_stream()

print("Say Hey Eleven ")
while True:
    if not convai_active:
        try:
            if mic_stream is None:
                start_mic_stream()
                continue

            frame = mic_stream.getFrame()
            result = eleven_hw.scoreFrame(frame)
            if result is None:
                if HOTWORD_DEBUG:
                    now = time.time()
                    if now - _last_debug_print >= 2.0:
                        print(
                            "[hotword debug] no voice activity in frame — "
                            "mic may be wrong device, muted, or too quiet"
                        )
                        _last_debug_print = now
                continue
            if HOTWORD_DEBUG and not result["match"]:
                now = time.time()
                if now - _last_debug_print >= 0.4:
                    print(
                        f"[hotword debug] speech seen, no match yet — "
                        f"confidence={float(result['confidence']):.3f} "
                        f"(threshold={eleven_hw.threshold})"
                    )
                    _last_debug_print = now
            if result["match"]:
                print("Wakeword uttered", result["confidence"])

                stop_mic_stream()

                print("Start ConvAI Session")
                convai_active = True

                try:
                    conversation = create_conversation()
                    conversation.start_session()

                    def signal_handler(sig, frame):
                        print("Received interrupt signal, ending session...")
                        try:
                            conversation.end_session()
                        except Exception as e:
                            print(f"Error ending session: {e}")

                    signal.signal(signal.SIGINT, signal_handler)

                    conversation_id = conversation.wait_for_session_end()
                    print(f"Conversation ID: {conversation_id}")

                except Exception as e:
                    print(f"Error during conversation: {e}")
                finally:
                    convai_active = False
                    print("Conversation ended, cleaning up...")

                    time.sleep(1)

                    start_mic_stream()
                    print("Ready for next wake word...")

        except Exception as e:
            print(f"Error in wake word detection: {e}")
            mic_stream = None
            time.sleep(1)
            start_mic_stream()
