"""
Pure Demo - No recording, just visual demonstration
"""
import sys
import random
import time
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                               QHBoxLayout, QPushButton, QLabel, QTextEdit, 
                               QProgressBar, QListWidget, QFrame, QTabWidget,
                               QSplitter, QMessageBox, QInputDialog)
from PySide6.QtCore import Qt, Signal, QTimer, QThread

# =================== RECORDING WIDGET ===================
class RecordingWidget(QWidget):
    recording_started = Signal()
    recording_finished = Signal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.is_recording = False
        self.recording_duration = 5
        self.elapsed_time = 0
        self.setup_ui()
        self.setup_timer()
    
    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(20)
        
        # Target word
        self.target_word_label = QLabel("Ready")
        self.target_word_label.setStyleSheet("""
            font-size: 48px; font-weight: bold; color: #3498db;
            background-color: white; border: 3px solid #3498db;
            border-radius: 15px; padding: 30px; margin: 20px;
        """)
        self.target_word_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.target_word_label)
        
        # Status
        self.status_label = QLabel("Press the button to start recording")
        self.status_label.setStyleSheet("font-size: 14px; color: #7f8c8d;")
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setMaximum(100)
        self.progress_bar.setValue(0)
        self.progress_bar.setFormat("Ready")
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                border: 2px solid #bdc3c7; border-radius: 10px;
                text-align: center; background-color: white; height: 30px;
            }
            QProgressBar::chunk {
                background-color: #3498db; border-radius: 8px;
            }
        """)
        layout.addWidget(self.progress_bar)
        
        # Record button
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        self.record_button = QPushButton("🎤 Start Recording")
        self.record_button.setStyleSheet("""
            QPushButton {
                font-size: 18px; font-weight: bold; color: white;
                background-color: #e74c3c; border: none;
                border-radius: 25px; padding: 15px 40px; min-height: 50px;
            }
            QPushButton:hover { background-color: #c0392b; }
        """)
        self.record_button.clicked.connect(self.toggle_recording)
        self.record_button.setCursor(Qt.PointingHandCursor)
        button_layout.addWidget(self.record_button)
        button_layout.addStretch()
        layout.addLayout(button_layout)
        
        # Timer
        self.timer_label = QLabel("")
        self.timer_label.setAlignment(Qt.AlignCenter)
        self.timer_label.setStyleSheet("font-size: 24px; color: #e74c3c; font-weight: bold;")
        layout.addWidget(self.timer_label)
        
        layout.addStretch()
        self.setLayout(layout)
    
    def setup_timer(self):
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_recording)
        self.timer.setInterval(100)
    
    def set_target_word(self, word: str):
        self.target_word_label.setText(word.upper())
        self.status_label.setText(f"Say '{word}' clearly when recording starts")
        self.progress_bar.setValue(0)
        self.progress_bar.setFormat("Ready")
    
    def toggle_recording(self):
        if not self.is_recording:
            self.start_recording()
        else:
            self.stop_recording()
    
    def start_recording(self):
        self.is_recording = True
        self.elapsed_time = 0
        
        self.record_button.setText("⏹️ Stop Recording")
        self.record_button.setStyleSheet("""
            QPushButton {
                font-size: 18px; font-weight: bold; color: white;
                background-color: #27ae60; border: none;
                border-radius: 25px; padding: 15px 40px; min-height: 50px;
            }
            QPushButton:hover { background-color: #229954; }
        """)
        
        self.status_label.setText("🔴 RECORDING... Speak now! (Simulated)")
        self.progress_bar.setFormat("Recording... %p%")
        self.timer.start()
        self.recording_started.emit()
    
    def stop_recording(self):
        self.is_recording = False
        self.timer.stop()
        
        self.record_button.setText("🎤 Start Recording")
        self.record_button.setStyleSheet("""
            QPushButton {
                font-size: 18px; font-weight: bold; color: white;
                background-color: #e74c3c; border: none;
                border-radius: 25px; padding: 15px 40px; min-height: 50px;
            }
            QPushButton:hover { background-color: #c0392b; }
        """)
        
        self.status_label.setText("✓ Recording complete! Analyzing...")
        self.progress_bar.setFormat("Processing...")
        self.timer_label.setText("")
        self.recording_finished.emit()
    
    def update_recording(self):
        self.elapsed_time += 0.1
        progress = min(100, int((self.elapsed_time / self.recording_duration) * 100))
        self.progress_bar.setValue(progress)
        
        remaining = max(0, self.recording_duration - self.elapsed_time)
        self.timer_label.setText(f"{remaining:.1f}s")
        
        if self.elapsed_time >= self.recording_duration:
            self.stop_recording()
    
    def reset(self):
        self.is_recording = False
        self.elapsed_time = 0
        self.timer.stop()
        self.record_button.setText("🎤 Start Recording")
        self.record_button.setEnabled(True)
        self.status_label.setText("Press the button to start recording")
        self.progress_bar.setValue(0)
        self.progress_bar.setFormat("Ready")
        self.timer_label.setText("")

# =================== FEEDBACK WIDGET ===================
class FeedbackWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout()
        
        title = QLabel("Pronunciation Feedback")
        title.setStyleSheet("font-size: 16px; color: #7f8c8d;")
        layout.addWidget(title)
        
        # Score
        score_frame = QFrame()
        score_frame.setStyleSheet("""
            QFrame {
                background-color: white; border-radius: 15px;
                padding: 20px; border: 1px solid #ecf0f1;
            }
        """)
        score_layout = QHBoxLayout()
        score_layout.addWidget(QLabel("Accuracy:"))
        
        self.score_label = QLabel("---%")
        self.score_label.setStyleSheet("""
            font-size: 36px; font-weight: bold; color: #27ae60;
            border: 3px solid #27ae60; border-radius: 15px; padding: 15px;
        """)
        self.score_label.setAlignment(Qt.AlignCenter)
        score_layout.addWidget(self.score_label)
        
        score_layout.addWidget(QLabel("Status:"))
        self.status_label = QLabel("Waiting...")
        self.status_label.setStyleSheet("font-size: 18px; font-weight: bold;")
        self.status_label.setAlignment(Qt.AlignCenter)
        score_layout.addWidget(self.status_label)
        
        score_frame.setLayout(score_layout)
        layout.addWidget(score_frame)
        
        # Phonemes
        phoneme_frame = QFrame()
        phoneme_frame.setStyleSheet("""
            QFrame {
                background-color: white; border-radius: 15px;
                padding: 20px; border: 1px solid #ecf0f1;
            }
        """)
        phoneme_layout = QVBoxLayout()
        
        phoneme_title = QLabel("Phoneme Analysis")
        phoneme_title.setStyleSheet("font-weight: bold;")
        phoneme_layout.addWidget(phoneme_title)
        
        target_layout = QHBoxLayout()
        target_layout.addWidget(QLabel("Target:"))
        self.target_phonemes_label = QLabel("---")
        self.target_phonemes_label.setStyleSheet("""
            font-family: 'Courier New'; background-color: #ecf0f1;
            border-radius: 5px; padding: 8px;
        """)
        target_layout.addWidget(self.target_phonemes_label, 1)
        phoneme_layout.addLayout(target_layout)
        
        detected_layout = QHBoxLayout()
        detected_layout.addWidget(QLabel("You said:"))
        self.detected_phonemes_label = QLabel("---")
        self.detected_phonemes_label.setStyleSheet("""
            font-family: 'Courier New'; background-color: #ecf0f1;
            border-radius: 5px; padding: 8px;
        """)
        detected_layout.addWidget(self.detected_phonemes_label, 1)
        phoneme_layout.addLayout(detected_layout)
        
        phoneme_frame.setLayout(phoneme_layout)
        layout.addWidget(phoneme_frame)
        
        # Feedback text
        self.feedback_text = QTextEdit()
        self.feedback_text.setReadOnly(True)
        self.feedback_text.setMaximumHeight(200)
        self.feedback_text.setStyleSheet("""
            QTextEdit {
                background-color: white; border: 2px solid #bdc3c7;
                border-radius: 10px; padding: 15px;
            }
        """)
        layout.addWidget(self.feedback_text)
        
        layout.addStretch()
        self.setLayout(layout)
    
    def display_demo_feedback(self, word: str, score: float):
        self.score_label.setText(f"{score:.1f}%")
        
        if score >= 85:
            self.score_label.setStyleSheet("""
                font-size: 36px; font-weight: bold; color: #27ae60;
                border: 3px solid #27ae60; border-radius: 15px; padding: 15px;
            """)
            self.status_label.setText("✓ Excellent!")
            self.status_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #27ae60;")
        elif score >= 70:
            self.score_label.setStyleSheet("""
                font-size: 36px; font-weight: bold; color: #f39c12;
                border: 3px solid #f39c12; border-radius: 15px; padding: 15px;
            """)
            self.status_label.setText("⚠ Good Effort")
            self.status_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #f39c12;")
        else:
            self.score_label.setStyleSheet("""
                font-size: 36px; font-weight: bold; color: #e74c3c;
                border: 3px solid #e74c3c; border-radius: 15px; padding: 15px;
            """)
            self.status_label.setText("✗ Keep Practicing")
            self.status_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #e74c3c;")
        
        phoneme_map = {
            'rabbit': ('R AE B IH T', 'W AE B IH T'),
            'red': ('R EH D', 'W EH D'),
            'flower': ('F L AW ER', 'F L AW ER'),
            'water': ('W AO T ER', 'W AO ER'),
            'table': ('T EY B AH L', 'T EY B L'),
        }
        
        target, detected = phoneme_map.get(word.lower(), ('? ? ?', '? ? ?'))
        self.target_phonemes_label.setText(target)
        self.detected_phonemes_label.setText(detected)
        
        if score >= 85:
            feedback = f'<p style="color: #27ae60; font-weight: bold;">🎉 Excellent! Perfect pronunciation!</p>'
        elif score >= 70:
            feedback = f'<p style="color: #f39c12; font-weight: bold;">👍 Good effort! {score:.0f}% correct.</p>'
        else:
            feedback = f'<p style="color: #e74c3c; font-weight: bold;">Keep practicing! {score:.0f}% correct.</p>'
        
        self.feedback_text.setHtml(feedback)
    
    def clear(self):
        self.score_label.setText("---%")
        self.status_label.setText("Waiting...")
        self.target_phonemes_label.setText("---")
        self.detected_phonemes_label.setText("---")
        self.feedback_text.clear()

# =================== PROGRESS WIDGET ===================
class ProgressWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.total_words = 0
        self.current_word_index = 0
        self.attempts = []
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout()
        
        title = QLabel("Session Progress")
        title.setStyleSheet("font-size: 16px; color: #7f8c8d;")
        layout.addWidget(title)
        
        # Progress bar
        self.overall_progress = QProgressBar()
        self.overall_progress.setStyleSheet("""
            QProgressBar {
                border: 2px solid #bdc3c7; border-radius: 10px;
                background-color: white; height: 30px;
            }
            QProgressBar::chunk { background-color: #3498db; border-radius: 8px; }
        """)
        layout.addWidget(self.overall_progress)
        
        # Stats
        stat_layout = QHBoxLayout()
        
        self.success_rate_label = QLabel("0%")
        self.success_rate_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #27ae60;")
        self.success_rate_label.setAlignment(Qt.AlignCenter)
        
        self.avg_score_label = QLabel("0%")
        self.avg_score_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #3498db;")
        self.avg_score_label.setAlignment(Qt.AlignCenter)
        
        self.attempts_label = QLabel("0")
        self.attempts_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #f39c12;")
        self.attempts_label.setAlignment(Qt.AlignCenter)
        
        stat_layout.addWidget(self.success_rate_label)
        stat_layout.addWidget(self.avg_score_label)
        stat_layout.addWidget(self.attempts_label)
        layout.addLayout(stat_layout)
        
        # History
        self.history_list = QListWidget()
        self.history_list.setMaximumHeight(150)
        layout.addWidget(self.history_list)
        
        layout.addStretch()
        self.setLayout(layout)
    
    def set_total_words(self, total: int):
        self.total_words = total
        self.current_word_index = 0
        self.update_progress()
    
    def set_current_word_index(self, index: int):
        self.current_word_index = index
        self.update_progress()
    
    def add_attempt(self, word: str, score: float, is_success: bool):
        self.attempts.append({'word': word, 'score': score, 'is_success': is_success})
        self.history_list.addItem(f"{'✓' if is_success else '✗'} {word}: {score:.1f}%")
        self.history_list.scrollToBottom()
        self.update_statistics()
    
    def update_progress(self):
        if self.total_words > 0:
            progress = int((self.current_word_index / self.total_words) * 100)
            self.overall_progress.setValue(progress)
    
    def update_statistics(self):
        if not self.attempts:
            return
        successes = sum(1 for a in self.attempts if a['is_success'])
        self.success_rate_label.setText(f"{successes/len(self.attempts)*100:.1f}%")
        self.avg_score_label.setText(f"{sum(a['score'] for a in self.attempts)/len(self.attempts):.1f}%")
        self.attempts_label.setText(str(len(self.attempts)))
    
    def reset(self):
        self.attempts = []
        self.current_word_index = 0
        self.history_list.clear()
        self.overall_progress.setValue(0)
        self.success_rate_label.setText("0%")
        self.avg_score_label.setText("0%")
        self.attempts_label.setText("0")

# =================== WORKER ===================
class DemoWorker(QThread):
    analysis_complete = Signal(float)
    
    def __init__(self, word):
        super().__init__()
        self.word = word
    
    def run(self):
        time.sleep(2)
        score = random.uniform(60, 100)
        self.analysis_complete.emit(score)

# =================== MAIN WINDOW ===================
class DemoMainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.practice_words = []
        self.current_word_index = 0
        self.worker = None
        self.setup_ui()
        self.set_practice_words(["rabbit", "red", "flower", "water", "table"])
    
    def setup_ui(self):
        self.setWindowTitle("Aphasia Speech Therapy - DEMO MODE")
        self.setMinimumSize(1200, 800)
        self.setStyleSheet("background-color: #f5f7fa;")
        
        central = QWidget()
        self.setCentralWidget(central)
        
        layout = QVBoxLayout()
        
        # Header
        header = QVBoxLayout()
        title = QLabel("🎙️ Speech Therapy Assistant - DEMO")
        title.setStyleSheet("font-size: 28px; font-weight: bold; color: #2c3e50;")
        title.setAlignment(Qt.AlignCenter)
        header.addWidget(title)
        
        demo_label = QLabel("⚠️ DEMO MODE - No actual recording (simulated)")
        demo_label.setStyleSheet("font-size: 14px; color: #e74c3c; font-weight: bold;")
        demo_label.setAlignment(Qt.AlignCenter)
        header.addWidget(demo_label)
        
        layout.addLayout(header)
        
        # Content
        splitter = QSplitter(Qt.Horizontal)
        
        # Left
        tabs = QTabWidget()
        self.recording_widget = RecordingWidget()
        self.recording_widget.recording_finished.connect(self.on_recording_finished)
        tabs.addTab(self.recording_widget, "🎤 Recording")
        
        self.feedback_widget = FeedbackWidget()
        tabs.addTab(self.feedback_widget, "📊 Feedback")
        
        splitter.addWidget(tabs)
        
        # Right
        self.progress_widget = ProgressWidget()
        splitter.addWidget(self.progress_widget)
        
        splitter.setSizes([840, 360])
        layout.addWidget(splitter, 1)
        
        # Buttons
        btn_layout = QHBoxLayout()
        
        new_btn = QPushButton("🔄 New Session")
        new_btn.clicked.connect(self.start_new_session)
        btn_layout.addWidget(new_btn)
        
        change_btn = QPushButton("📝 Change Words")
        change_btn.clicked.connect(self.change_words)
        btn_layout.addWidget(change_btn)
        
        btn_layout.addStretch()
        
        self.next_button = QPushButton("➡️ Next Word")
        self.next_button.setEnabled(False)
        self.next_button.clicked.connect(self.next_word)
        btn_layout.addWidget(self.next_button)
        
        layout.addLayout(btn_layout)
        
        central.setLayout(layout)
    
    def set_practice_words(self, words):
        self.practice_words = words
        self.current_word_index = 0
        self.progress_widget.set_total_words(len(words))
        if words:
            self.recording_widget.set_target_word(words[0])
    
    def on_recording_finished(self):
        self.recording_widget.record_button.setEnabled(False)
        word = self.practice_words[self.current_word_index]
        self.worker = DemoWorker(word)
        self.worker.analysis_complete.connect(self.on_analysis_complete)
        self.worker.start()
    
    def on_analysis_complete(self, score):
        word = self.practice_words[self.current_word_index]
        self.feedback_widget.display_demo_feedback(word, score)
        is_success = score >= 85
        self.progress_widget.add_attempt(word, score, is_success)
        self.recording_widget.record_button.setEnabled(True)
        self.next_button.setEnabled(True)
    
    def next_word(self):
        self.current_word_index += 1
        if self.current_word_index >= len(self.practice_words):
            QMessageBox.information(self, "Complete", "Session complete!")
            self.start_new_session()
            return
        
        self.recording_widget.reset()
        self.recording_widget.set_target_word(self.practice_words[self.current_word_index])
        self.feedback_widget.clear()
        self.progress_widget.set_current_word_index(self.current_word_index)
        self.next_button.setEnabled(False)
    
    def start_new_session(self):
        self.current_word_index = 0
        self.recording_widget.reset()
        self.feedback_widget.clear()
        self.progress_widget.reset()
        if self.practice_words:
            self.recording_widget.set_target_word(self.practice_words[0])
            self.progress_widget.set_total_words(len(self.practice_words))
        self.next_button.setEnabled(False)
    
    def change_words(self):
        text, ok = QInputDialog.getText(self, "Change Words", 
                                        "Enter words (comma-separated):",
                                        text=", ".join(self.practice_words))
        if ok and text:
            new_words = [w.strip() for w in text.split(',') if w.strip()]
            if new_words:
                self.set_practice_words(new_words)
                self.start_new_session()

def main():
    app = QApplication(sys.argv)
    window = DemoMainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()