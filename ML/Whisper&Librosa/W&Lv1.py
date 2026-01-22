import librosa
import whisper
import soundfile as sf
import numpy as np

y, sr = librosa.load("Audio sample/1738.wav", sr=None)
print("Sample rate:", sr)
print("Duration (sec):", librosa.get_duration(y=y, sr=sr))

# Remove silence
yt, _ = librosa.effects.trim(
    y,
    top_db=30   # higher = more aggressive silence removal
)

# Save cleaned audio
sf.write("audio_no_silence.wav", yt, sr)

model = whisper.load_model("medium")  # or "small" for speed
result = model.transcribe("audio_no_silence.wav")

text = result["text"]


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



