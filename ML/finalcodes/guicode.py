import sys
import os
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QPushButton,
    QLabel, QTextEdit
)
from PySide6.QtCore import QThread, Signal
import os 
from dotenv import load_dotenv
load_dotenv
from faster_whisper import WhisperModel
from sentence_transformers import SentenceTransformer, util
from wordfreq import zipf_frequency
from groq import Groq

# =========================
# CONFIG
# =========================

TARGET_WORD = "banana"
AUDIO_PATH = "recorded.wav"   # replace with your recording output
SEMANTIC_THRESHOLD = 0.6

GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # set this in your environment

# =========================
# LOAD MODELS (ONCE)
# =========================

whisper_model = WhisperModel("base", compute_type="int8")
semantic_model = SentenceTransformer("all-MiniLM-L6-v2")
groq_client = Groq(api_key=GROQ_API_KEY)

# =========================
# UTILS
# =========================

def text_to_phonemes(word):
    # crude fallback if you don't have phonemizer
    return list(word.lower())


def transcribe(audio_path):
    segments, _ = whisper_model.transcribe(audio_path)
    text = ""
    for seg in segments:
        text += seg.text
    return text.strip().lower()


def detect_error(target_word, spoken_word):
    target_ph = text_to_phonemes(target_word)
    spoken_ph = text_to_phonemes(spoken_word)

    if len(spoken_ph) < len(target_ph):
        return "Omission"

    if zipf_frequency(spoken_word, "en") == 0:
        return "Neologistic"

    emb_t = semantic_model.encode(target_word, convert_to_tensor=True)
    emb_s = semantic_model.encode(spoken_word, convert_to_tensor=True)
    sim = float(util.cos_sim(emb_t, emb_s))

    if sim > SEMANTIC_THRESHOLD and spoken_word != target_word:
        return "Semantic"

    if spoken_word != target_word:
        return "Phonemic"

    return "Correct"


def analyze_word(target_word, spoken_word):
    error_type = detect_error(target_word, spoken_word)

    accuracy = 100 if error_type == "Correct" else 70

    return {
        "target_word": target_word,
        "spoken_word": spoken_word,
        "error_type": error_type,
        "accuracy": accuracy,
        "target_phonemes": text_to_phonemes(target_word),
        "attempt_phonemes": text_to_phonemes(spoken_word),
    }


def generate_feedback(report):
    prompt = f"""
You are a speech therapist.

Target word: {report['target_word']}
Spoken word: {report['spoken_word']}
Error type: {report['error_type']}

Give short clinical feedback.
"""

    response = groq_client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
    )

    return response.choices[0].message.content.strip()


# =========================
# WORKER THREAD
# =========================

class AnalysisWorker(QThread):
    finished_signal = Signal(dict)

    def run(self):
        try:
            transcript = transcribe(AUDIO_PATH)

            report = analyze_word(TARGET_WORD, transcript)

            feedback = generate_feedback(report)

            report["feedback"] = feedback

            self.finished_signal.emit(report)

        except Exception as e:
            self.finished_signal.emit({"error": str(e)})


# =========================
# GUI
# =========================

class SpeechApp(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Speech Therapy Analyzer")
        self.setMinimumSize(500, 400)

        layout = QVBoxLayout()

        self.target_label = QLabel(f"Target Word: {TARGET_WORD}")
        self.analyze_button = QPushButton("Analyze Recording")
        self.result_label = QLabel("")
        self.feedback_box = QTextEdit()
        self.feedback_box.setReadOnly(True)

        layout.addWidget(self.target_label)
        layout.addWidget(self.analyze_button)
        layout.addWidget(self.result_label)
        layout.addWidget(self.feedback_box)

        self.setLayout(layout)

        self.analyze_button.clicked.connect(self.start_analysis)

    def start_analysis(self):
        self.result_label.setText("Processing...")
        self.feedback_box.clear()
        self.analyze_button.setEnabled(False)

        self.worker = AnalysisWorker()
        self.worker.finished_signal.connect(self.display_results)
        self.worker.start()

    def display_results(self, report):
        self.analyze_button.setEnabled(True)

        if "error" in report:
            self.result_label.setText("Error occurred")
            self.feedback_box.setText(report["error"])
            return

        self.result_label.setText(
            f"Spoken: {report['spoken_word']} | "
            f"Type: {report['error_type']} | "
            f"Score: {report['accuracy']}%"
        )

        self.feedback_box.setText(report["feedback"])


# =========================
# MAIN
# =========================

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = SpeechApp()
    window.show()
    sys.exit(app.exec())