"""
This is the code that was used to show to Sir Sanjula (THE CODE WAS RAN IN GOOGLE COLAB), this logic will be used to Redefine the Agentic codes 
DO NOT CHANGE <ONLY REFER cHNAGES WILL BE DONE BY THE ML TEAM 
"""


import whisper
from phonemizer import phonemize
from wordfreq import zipf_frequency
from sentence_transformers import SentenceTransformer, util

# ---------------- CONFIG ----------------
TARGET_WORD = "boring"
SEMANTIC_THRESHOLD = 0.55
AUDIO_FILE = list(uploaded.keys())[0]   # updated to use the uploaded file name

#----------------------Audio------------
def load_audio_file(path):
    return path

# ---------------- MODELS ----------------
print("Loading Whisper...")
whisper_model = whisper.load_model("base")

print("Loading semantic model...")
semantic_model = SentenceTransformer("all-MiniLM-L6-v2")

# ---------------- PHONEMES ----------------
def text_to_phonemes(text: str):
    return phonemize(
        text,
        language="en-us",
        backend="espeak",
        strip=True,
        preserve_punctuation=False,
        with_stress=False,
    ).split()

# ---------------- ERROR ANALYSIS ----------------
def detect_error(target_word, spoken_word):
    target_ph = text_to_phonemes(target_word)
    spoken_ph = text_to_phonemes(spoken_word)

    # Omission
    if len(spoken_ph) < len(target_ph):
        return "Omission"

    # Neologism
    if zipf_frequency(spoken_word, "en") == 0:
        return "Neologistic"

    # Semantic paraphasia
    emb_t = semantic_model.encode(target_word, convert_to_tensor=True)
    emb_s = semantic_model.encode(spoken_word, convert_to_tensor=True)
    sim = float(util.cos_sim(emb_t, emb_s))

    if sim > SEMANTIC_THRESHOLD and spoken_word != target_word:
        return "Semantic"

    return "Correct"

# ---------------- MAIN ----------------
print("Transcribing...")
result = whisper_model.transcribe(AUDIO_FILE, language="en")
spoken_text = result["text"].strip().lower()

print("Whisper output:", spoken_text)

error = detect_error(TARGET_WORD, spoken_text)
print("Detected error:", error)
