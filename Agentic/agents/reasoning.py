from typing import Any, Dict

from openai import OpenAI
import anthropic

from config import config


def _get_openai_client() -> OpenAI:
    if not config.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set for OpenAI LLM calls.")
    return OpenAI(api_key=config.openai_api_key)


def _get_anthropic_client() -> anthropic.Anthropic:
    if not config.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set for Anthropic LLM calls.")
    return anthropic.Anthropic(api_key=config.anthropic_api_key)


def _build_prompt(error_report: Dict[str, Any], target_word: str) -> str:
    phonemes_target = error_report.get("phonemes_target", [])
    phonemes_transcribed = error_report.get("phonemes_transcribed", [])
    errors = error_report.get("errors", [])
    match_score = error_report.get("match_score", 0.0)
    primary_error = error_report.get("primary_error_type", "Unknown")

    return (
        "You are an expert speech therapist helping a learner practice pronunciation.\n"
        "Your tone is always encouraging, patient, and professional.\n\n"
        f"Target word: {target_word}\n"
        f"Target phonemes: {phonemes_target}\n"
        f"Attempt phonemes: {phonemes_transcribed}\n"
        f"Match score: {match_score:.2f}\n"
        f"Primary error type: {primary_error}\n"
        f"Detailed errors: {errors}\n\n"
        "Explain in simple, concrete terms what went wrong with the pronunciation, "
        "naming the sounds using letters or easy phonetic descriptions the learner can understand.\n"
        "Then give 1–2 specific, actionable tips on how to move the tongue, lips, or jaw to improve.\n"
        "Keep the response under 5 sentences.\n"
    )


def _call_llm(prompt: str) -> str:
    if config.llm_provider == "anthropic":
        client = _get_anthropic_client()
        resp = client.messages.create(
            model=config.llm_model or "claude-3-5-sonnet-20240620",
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
        )
        # Anthropic returns content as a list of blocks
        text_parts = [b.text for b in resp.content if getattr(b, "text", None)]
        return "".join(text_parts).strip()
    else:
        client = _get_openai_client()
        chat = client.chat.completions.create(
            model=config.llm_model or "gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a supportive speech therapist for children and adults.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=350,
        )
        return chat.choices[0].message.content.strip()  # type: ignore[return-value]


def run_reasoning(
    target_word: str,
    error_report: Dict[str, Any],
    is_perfect_match: bool,
) -> Dict[str, Any]:
    """
    Turn the error_report into an encouraging feedback_text.
    """
    if is_perfect_match:
        feedback_text = (
            f"Great job! Your pronunciation of '{target_word}' sounded clear and accurate. "
            "Keep practicing it just like that."
        )
        return {"feedback_text": feedback_text, "is_perfect_match": True}

    prompt = _build_prompt(error_report, target_word)
    try:
        feedback_text = _call_llm(prompt)
    except Exception as exc:
        # Fallback if LLM is unavailable
        feedback_text = (
            "You were very close, but there were a few sounds that did not match the target word. "
            "Try saying it more slowly, listening carefully to each sound in the word."
            f" (Technical details: {exc})"
        )

    return {"feedback_text": feedback_text, "is_perfect_match": False}

