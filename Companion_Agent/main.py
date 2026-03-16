import asyncio
from dotenv import load_dotenv

from livekit.plugins import silero
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    AutoSubscribe,
    WorkerOptions,
    cli,
    inference,
)

load_dotenv()


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=inference.STT("deepgram/nova-3-general", language="en"),
        llm=inference.LLM("groq/llama-3.3-70b-versatile"),
        tts=inference.TTS("cartesia/sonic-3")
    )

    agent = Agent(
        instructions=(
            "You are a voice assistant created by LiveKit. "
            "Keep responses short, clear, and easy to speak."
        )
    )

    await session.start(agent=agent, room=ctx.room)
    await asyncio.sleep(1)
    await session.generate_reply(instructions="Greet the user and ask how you can help.")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))