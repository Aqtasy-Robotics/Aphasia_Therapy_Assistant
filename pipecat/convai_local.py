"""
Run ElevenLabs Conversational AI on your laptop (mic + speakers).

No wake-word model — starts talking to the agent immediately.

Requirements (PowerShell):
  pip install elevenlabs pyaudio

Environment:
  ELEVENLABS_AGENT_ID   — required
  ELEVENLABS_API_KEY    — required if the agent is private; key needs convai_write

If you get invalid sample rate on Windows, use WASAPI or try hotword.py with
HOTWORD_MIC_SAMPLE_RATE / ResamplingConvaiAudioInterface patterns from hotword.py.
"""

from __future__ import annotations

import os
import sys

def main() -> None:
    agent_id = (os.getenv("ELEVENLABS_AGENT_ID") or "").strip()
    if not agent_id:
        print("Set ELEVENLABS_AGENT_ID", file=sys.stderr)
        raise SystemExit(1)

    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()

    from elevenlabs.client import ElevenLabs
    from elevenlabs.conversational_ai.conversation import (
        Conversation,
        ConversationInitiationData,
    )
    from elevenlabs.conversational_ai.default_audio_interface import (
        DefaultAudioInterface,
    )

    elevenlabs = ElevenLabs(api_key=api_key) if api_key else ElevenLabs()

    config = ConversationInitiationData(
        dynamic_variables={
            "user_name": os.getenv("CONVAI_USER_NAME", "there"),
            "greeting": os.getenv("CONVAI_GREETING", "Hey"),
        }
    )

    conversation = Conversation(
        elevenlabs,
        agent_id,
        config=config,
        requires_auth=bool(api_key),
        audio_interface=DefaultAudioInterface(),
        callback_agent_response=lambda r: print(f"Agent: {r}"),
        callback_user_transcript=lambda t: print(f"User: {t}"),
    )

    print("Starting session — speak into the default microphone. Ctrl+C to stop.\n")
    conversation.start_session()
    try:
        cid = conversation.wait_for_session_end()
        print(f"\nConversation ID: {cid}")
    except KeyboardInterrupt:
        conversation.end_session()
        print("\nSession ended.")


if __name__ == "__main__":
    main()
