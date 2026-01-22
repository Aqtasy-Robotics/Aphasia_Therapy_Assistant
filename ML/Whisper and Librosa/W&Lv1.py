import librosa
import whisper
import soundfile as sf
import numpy as np
import os

# ===============================
# 1. Load audio
# ===============================
y, sr = librosa.load("Audio sample/1738.wav", sr=None)
print("Sample rate:", sr)
duration = librosa.get_duration(y=y, sr=sr)
print("Duration (sec):", duration)

# ===============================
# 2. Remove silence
# ===============================
yt, _ = librosa.effects.trim(
    y,
    top_db=30
)

sf.write("audio_no_silence.wav", yt, sr)
print("Silence removed and saved.")

# ===============================
# 3. Split into 5-minute chunks (OPTION 2)
# ===============================
chunk_length_sec = 5 * 60  # 5 minutes
chunk_samples = chunk_length_sec * sr

chunks = []
for i in range(0, len(yt), chunk_samples):
    chunk = yt[i:i + chunk_samples]
    chunk_file = f"chunk_{i//chunk_samples}.wav"
    sf.write(chunk_file, chunk, sr)
    chunks.append(chunk_file)

print(f"Created {len(chunks)} chunks.")

# ===============================
# 4. Load Whisper model
# ===============================
model = whisper.load_model("medium")  # change to "small" or "tiny" for speed

# ===============================
# 5. Transcribe chunks with progress (OPTION 3)
# ===============================
full_text = ""

for idx, chunk_file in enumerate(chunks, start=1):
    print(f"\n--- Transcribing chunk {idx}/{len(chunks)}: {chunk_file} ---")

    result = model.transcribe(
        chunk_file,
        language="en",
        temperature=0,
        condition_on_previous_text=False,
        verbose=True  # shows Whisper progress
    )

    full_text += " " + result["text"]


# ===============================
# 6. Remove repeated words
# ===============================
def remove_repetitions(text):
    words = text.split()
    cleaned = []

    for word in words:
        if not cleaned or word.lower() != cleaned[-1].lower():
            cleaned.append(word)

    return " ".join(cleaned)

clean_text = remove_repetitions(full_text)


# ===============================
# 7. Remove repeated sentences
# ===============================
def remove_sentence_repetition(text):
    sentences = text.split(". ")
    seen = set()
    result = []

    for s in sentences:
        s_lower = s.lower().strip()
        if s_lower not in seen:
            seen.add(s_lower)
            result.append(s)

    return ". ".join(result)

final_text = remove_sentence_repetition(clean_text)
print("\nFinal cleaned transcription:\n")
print(final_text)
