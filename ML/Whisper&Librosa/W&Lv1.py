import pyaudio
import wave
import librosa
from openai import OpenAI
import numpy as np
import threading
import time


CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNEL = 1
RATE = 16000
RECORD_SECONDS = 5

class RealtimeTranscriber:
    def __ init__(self,api_key = None):
    self.api_key = api_key or os.getenv("OPENAI_API_KEY")
    self.client = OpenAI(api_key=self.api_key)
    self.model = whisper.load_model("medium")
    self.audio = pyaudio.PyAudio()
    self.is_recording = False
    
def record_audio(self, duration=RECORED_SECONDS):
    print("Recording...")

    stream = self.audio.open(
        format=FORMAT,
        channels=CHANNEL,
        rate=RATE,
        input=True, 
        frames_per_buffer=CHUNK
        )

frames = []
for i in range(0, int(RATE / CHUNK * duration)):
    data = stream.read(CHUNK)
    frames.append(data)

    steam.stop_stream()
    stream.close()

    print("Finished recording.")
    return frames



result = model.transcribe(
    "audio_no_silence.wav",
    language="en",
    temperature=0,
    condition_on_previous_text=False
)

def remove_repetitions(text):
    words = text.split()
    cleaned = []

    for word in words:
        if len(cleaned) == 0 or word.lower() != cleaned[-1].lower():
            cleaned.append(word)

    return " ".join(cleaned)

clean_text = remove_repetitions(text)


def remove_sentence_repetition(text):
    sentences = text.split(". ")
    seen = set()
    result = []

    for s in sentences:
        if s.lower() not in seen:
            seen.add(s.lower())
            result.append(s)

    return ". ".join(result)
final_text = remove_sentence_repetition(clean_text)
print(final_text)



