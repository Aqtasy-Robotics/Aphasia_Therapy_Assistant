# Pipecat Aphasia Voice Assistant

This module provides a Pipecat-based, real-time voice assistant designed for **post-therapy support** for aphasia and related speech disorders.

It is intentionally tuned for:

- short, clear responses
- one-question-at-a-time pacing
- confirmation loops when speech is unclear
- supportive coaching (not diagnosis)

## What this bot does

- Listens to patient speech (Deepgram STT)
- Generates supportive responses (OpenAI LLM)
- Speaks back naturally (Cartesia TTS)
- Runs over Pipecat WebRTC transport for low-latency voice interaction

## Safety boundaries

The agent is configured to:

- avoid medical diagnosis or medication advice
- escalate to emergency services/caregiver language for urgent warning signs
- maintain a therapist-aligned coaching tone

This is **not** a replacement for clinician care.

## Project files

- `bot.py` - main Pipecat voice agent
- `.env.example` - required API variables
- `requirements.txt` - Python dependencies

## Quick start (Windows PowerShell)

From this folder:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `.env` and set:

- `DEEPGRAM_API_KEY`
- `OPENAI_API_KEY`
- `CARTESIA_API_KEY`

Then run:

```powershell
python bot.py
```

You should see a local WebRTC URL in logs (typically `http://localhost:7860/client`) to connect from browser.

## Configuration for therapists

Use environment variables to tailor behavior:

- `THERAPY_FOCUS` - e.g. "word retrieval and sentence initiation"
- `ASSISTANT_LANGUAGE_HINT` - e.g. "Use simple Spanish and short phrases"
- `ASSISTANT_NAME` - custom assistant name for familiarity

## Next improvements you can add

- Persist session summaries to your backend for therapist review
- Add personalized phrase banks from each patient's home program
- Add visual fallback prompts when voice confidence is low
- Add caregiver mode for guided home practice
