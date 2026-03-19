# Speech Therapy GUI Integration

## Overview

The Kivy-based speech therapy GUI has been integrated into the robot's execution agent. It runs on the 7" touchscreen display and manages pronunciation practice sessions with real-time feedback.

## Architecture

### Components

- **body_app.py** - Main UI driver with Kivy integration
- **speech_therapy_app.kv** - Kivy layout definition (UI structure)
- **pronunciation.py** - Pronunciation analysis engine
- **storage.py** - Persistent storage for practiced words

### Threading Model

The GUI runs in a background thread to maintain async compatibility with the dispatcher:

1. **Main dispatcher thread** - Async coroutines handle commands
2. **UI thread** - Kivy event loop runs continuously
3. **Command queue** - Thread-safe queue passes commands from dispatcher to UI

## Usage

### Basic UI Update

From the dispatcher, send commands via the `show_ui` function:

```python
# Show a new word
payload = {
    "action": "show_word",
    "word": "apple",
    "category": "food"
}
result = await show_ui(payload)

# Show feedback
payload = {
    "action": "show_feedback",
    "feedback": "Great pronunciation!",
    "accuracy": 92
}
result = await show_ui(payload)

# Display analysis stats
payload = {
    "action": "show_stats",
    "accuracy": "92%",
    "vowel": "88%",
    "consonant": "95%",
    "phoneme_errors": "1",
    "detected_word": "apple"
}
result = await show_ui(payload)
```

### Available Actions

| Action | Parameters | Description |
|--------|-----------|-------------|
| `show_word` | word, category | Display a word to practice |
| `show_feedback` | feedback, accuracy | Show result feedback (color-coded) |
| `show_stats` | accuracy, vowel, consonant, phoneme_errors, detected_word | Display pronunciation statistics |
| `next_word` | - | Move to next word in session |
| `previous_word` | - | Go back to previous word |
| `restart_session` | - | Reset session to beginning |
| `set_header` | text | Set custom header text |
| `set_instruction` | text | Set instruction text |

## Features

### UI Elements

- **Word Display** - Large, centered word in blue
- **Recording Controls** - Start/stop button with countdown timer
- **Progress Bar** - Visual feedback during recording
- **Feedback Card** - Color-coded results (green=good, yellow=ok, red=needs work)
- **Stats Display** - Accuracy percentage, vowel/consonant scores, phoneme errors

### Word Session Management

- Tracks practiced words in persistent storage (`~/.speech_therapy_practiced_words.json`)
- Two modes:
  - **"new"** - Shows only unpracticed words
  - **"all"** - Shows all words regardless of practice status
- Auto-marks words as practiced when accuracy ≥ 78%

### Audio Analysis

The pronunciation analysis module (`pronunciation.py`) is a demo stub. Integrate with real audio processing:

- Replace with **Vosk** (offline speech-to-text)
- Or **Whisper** (OpenAI's transcription) 
- Add phoneme scoring algorithm
- Connect to robot's microphone via `audio_utils.py`

## Starting the App

The Kivy app starts automatically when the first `show_ui` command is dispatched:

```python
from src.ui.body_app import ensure_app_running

# Explicitly start app (optional)
app = ensure_app_running()
```

The app runs in a daemon thread and handles all UI updates via the command queue.

## Configuration

### Window Size

Edit in `body_app.py`:
```python
Window.size = (1024, 600)  # 7" touchscreen resolution
```

### Word List

Update `DEFAULT_WORD_LIST` in `body_app.py` to customize words:
```python
DEFAULT_WORD_LIST = [
    WordItem(word_id=1, text="Apple", category="food"),
    WordItem(word_id=2, text="Cat", category="animals"),
    # ... add more words
]
```

### Recording Duration

Change `TOTAL_TIME_SEC` in `body_app.py`:
```python
TOTAL_TIME_SEC = 7  # seconds for recording countdown
```

## Error Handling

The module is wrapped in try-catch blocks to prevent crashes:

- Failed commands log errors and return error status
- UI thread exceptions are logged but don't crash the dispatcher
- Command queue has size limit to prevent memory leaks

## Next Steps

1. **Audio Integration** - Connect real audio capture to the analyze function
2. **Backend Integration** - Call backend transcription API or local Whisper model
3. **Phoneme Scoring** - Implement accurate phoneme-level analysis
4. **Therapist Controls** - Add backend commands to customize word lists per patient
5. **Progress Sync** - Send progress data back to backend for therapist dashboard

## Testing

Run the UI independently for testing:

```bash
cd hardware/execution_agent
python -m src.ui.body_app
```

Or use the test dispatcher to send commands:

```python
import asyncio
from src.ui.body_app import show_ui

async def test():
    await show_ui({"action": "show_word", "word": "apple", "category": "food"})
    await show_ui({"action": "show_feedback", "feedback": "Great!", "accuracy": 95})
    
asyncio.run(test())
```
