import os

from dotenv import load_dotenv
from loguru import logger

from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams

# NOTE: OpenAILLMContext is still compatible with current Pipecat versions.
# If you later migrate to the universal LLMContext aggregator pair, this bot
# can be updated with minimal pipeline changes.
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext

load_dotenv(override=True)


def _env(name: str, default: str = "") -> str:
    value = os.getenv(name, default).strip()
    return value if value else default


def build_system_instruction() -> str:
    assistant_name = _env("ASSISTANT_NAME", "Waabi Voice Coach")
    language_hint = _env("ASSISTANT_LANGUAGE_HINT", "Use clear, everyday English.")
    therapy_focus = _env(
        "THERAPY_FOCUS",
        "post-therapy carryover, confidence, and communication participation",
    )

    return (
        f"You are {assistant_name}, a calm and supportive post-therapy voice assistant for "
        "people with aphasia and related speech disorders. "
        "Your role is to help the patient practice communication skills between therapist-led sessions.\n\n"
        "Core behavior:\n"
        "- Speak slowly and clearly.\n"
        "- Keep each response short (1-2 short sentences unless asked for more).\n"
        "- Ask one question at a time.\n"
        "- Offer choices and confirmation prompts when speech is unclear.\n"
        "- Use encouragement without sounding childish.\n"
        "- Pause naturally and avoid rushing the user.\n\n"
        "Communication support style:\n"
        "- Repeat back what you understood and ask: 'Did I get that right?'\n"
        "- If unsure, give 2-3 likely options and ask the user to pick one.\n"
        "- Suggest multimodal options: gesture, typing, drawing, or yes/no.\n"
        "- Celebrate effort, not just correctness.\n\n"
        "Safety and scope:\n"
        "- You are not a doctor and do not diagnose.\n"
        "- Do not change medications or provide emergency advice beyond escalation.\n"
        "- If there is mention of severe symptoms, self-harm, chest pain, stroke warning signs, "
        "or urgent distress: tell the user to contact local emergency services immediately and notify a caregiver.\n"
        "- Stay aligned with therapist goals and avoid introducing high-complexity tasks unless requested.\n\n"
        f"Therapy focus: {therapy_focus}.\n"
        f"Language guidance: {language_hint}."
    )


transport_params = {
    "daily": lambda: DailyParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
    ),
    "webrtc": lambda: TransportParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
    ),
}


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments) -> None:
    logger.info("Starting aphasia support voice assistant")

    stt = DeepgramSTTService(api_key=_env("DEEPGRAM_API_KEY"))
    tts = CartesiaTTSService(
        api_key=_env("CARTESIA_API_KEY"),
        settings=CartesiaTTSService.Settings(
            voice=_env("CARTESIA_VOICE_ID", "71a7ad14-091c-4e8e-a314-022ece01c121"),
        ),
    )
    llm = OpenAILLMService(
        api_key=_env("OPENAI_API_KEY"),
        settings=OpenAILLMService.Settings(
            model=_env("OPENAI_MODEL", "gpt-4.1-mini"),
            system_instruction=build_system_instruction(),
        ),
    )

    context = OpenAILLMContext()
    context_aggregator = llm.create_context_aggregator(context)

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        idle_timeout_secs=runner_args.pipeline_idle_timeout_secs,
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(_transport, _client):
        logger.info("Client connected")
        context.add_message(
            {
                "role": "user",
                "content": (
                    "Please greet me warmly in one short sentence and ask one easy "
                    "check-in question for post-therapy practice."
                ),
            }
        )
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(_transport, _client):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)
    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Pipecat Cloud and local runner entrypoint."""
    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
