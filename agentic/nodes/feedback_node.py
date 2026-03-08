"""
nodes/feedback_node.py — LLM feedback generation wrapped as a LangGraph node.

All original logic from final_reasoning.py is preserved exactly.
Changes made:
  1. generate_feedback() and generate_practice_exercise() are called from
     the node instead of being triggered inline from the analyser.
  2. Node returns a state-dict patch instead of printing + returning dicts.
  3. Retry logic is handled by the LangGraph conditional edge (check_feedback_quality).
"""

from __future__ import annotations

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from groq import Groq

from state import SpeechTherapyState

load_dotenv()


# ── System / user prompts (unchanged from original) ─────────────────────────

def _get_system_prompt() -> str:
    return """You are a compassionate, expert speech therapist providing personalized feedback to a patient with Broca's aphasia.

CRITICAL GUIDELINES FOR BROCA'S APHASIA PATIENTS:
1. Use VERY SHORT sentences (maximum 5-8 words per sentence)
2. Use SIMPLE, everyday words only - avoid complex vocabulary
3. Use simple sentence structures - no complex grammar
4. Be CONCRETE and specific - use real examples
5. Focus on ONE main point at a time
6. Be warm, encouraging, and positive throughout
7. Use repetition naturally to reinforce key points
8. NEVER use medical jargon or technical terms
9. Address the patient by name to build connection

ABOUT BROCA'S APHASIA:
- Patients CAN understand what you say
- They struggle with speaking/producing words
- They get frustrated easily - be extra patient and kind
- They respond well to positive reinforcement
- Clear, simple instructions work best

YOUR TASK:
Analyze the error report provided and generate natural, conversational feedback that:
- Acknowledges their effort warmly
- Explains what went wrong in the simplest possible terms
- Gives ONE clear, actionable tip they can try immediately
- Encourages them to keep practicing
- Sounds natural and human, NOT like a template

IMPORTANT:
- Generate your own natural feedback based on the specific errors
- Don't follow a rigid structure - be conversational
- Vary your language based on the situation
- If they did well, celebrate it genuinely
- If they struggled, be extra encouraging and patient
- Make it feel like a real conversation, not a report

Keep your total response under 6 sentences."""


def _build_user_prompt(error_report: Dict[str, Any],
                       target_word: str,
                       patient_name: str) -> str:
    accuracy       = error_report.get("accuracy", 0)
    total_errors   = error_report.get("total_errors", 0)
    target_ph      = error_report.get("target_phonemes", [])
    attempt_ph     = error_report.get("attempt_phonemes", [])

    prompt = f"""PATIENT INFORMATION:
- Patient name: {patient_name}
- Target word: "{target_word}"
- What patient said: {' '.join(attempt_ph) if attempt_ph else '(unclear/no sound)'}

PERFORMANCE SUMMARY:
- Overall accuracy: {accuracy}%
- Total phoneme errors: {total_errors}
- Substitution errors: {error_report['error_summary']['substitutions']}
- Omission errors (missing sounds): {error_report['error_summary']['omissions']}
- Insertion errors (extra sounds): {error_report['error_summary']['insertions']}

PHONEME ANALYSIS:
- Target phonemes (what they should say): {' '.join(target_ph)}
- Attempted phonemes (what they actually said): {' '.join(attempt_ph) if attempt_ph else 'No clear phonemes detected'}
"""

    errors = error_report.get("errors", [])
    if errors:
        prompt += "\nDETAILED ERROR BREAKDOWN:\n"
        for i, error in enumerate(errors, 1):
            etype = error["type"]
            desc  = error["description"]
            pos   = error.get("position", "unknown")
            if etype == "substitution":
                prompt += f"{i}. SUBSTITUTION at position {pos}: {desc}\n"
                prompt += f"   - Target sound: /{error['target_phoneme']}/\n"
                prompt += f"   - Said instead: /{error['actual_phoneme']}/\n"
            elif etype == "omission":
                prompt += f"{i}. OMISSION at position {pos}: {desc}\n"
                prompt += f"   - Missing sound: /{error['target_phoneme']}/\n"
            elif etype == "insertion":
                prompt += f"{i}. INSERTION: {desc}\n"
                prompt += f"   - Extra sound added: /{error['actual_phoneme']}/\n"
    else:
        prompt += "\n✓ NO ERRORS DETECTED - Perfect pronunciation!\n"

    prompt += f"""
CONTEXT FOR YOUR FEEDBACK:
- If accuracy is 90%+: Celebrate their success enthusiastically but briefly
- If accuracy is 70-89%: Praise what they got right, gently point out the main error
- If accuracy is 50-69%: Be encouraging, focus on just ONE error to fix
- If accuracy is below 50%: Be extra patient and supportive, suggest starting slower

YOUR TASK:
Generate natural, warm, conversational feedback for {patient_name} about their attempt to say "{target_word}".
Use the error information above to create specific, personalized guidance.
Remember: Very short sentences, simple words, ONE main tip, be encouraging.
Make it sound natural and human - like a caring therapist talking to their patient."""
    return prompt


# ── Core functions (unchanged logic from original) ──────────────────────────

def generate_feedback(error_report: Dict[str, Any],
                      target_word: str,
                      patient_name: str = "friend",
                      api_key: Optional[str] = None,
                      model: str = "llama-3.3-70b-versatile") -> Dict[str, Any]:

    api_key = api_key or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: No API key found. Using fallback feedback.")
        return _fallback_feedback(error_report, target_word, patient_name)

    system_prompt = _get_system_prompt()
    user_prompt   = _build_user_prompt(error_report, target_word, patient_name)

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.8,
            max_tokens=300,
            top_p=0.95,
        )
        feedback_text = response.choices[0].message.content.strip()
        return {
            "feedback_text": feedback_text,
            "model_used":    model,
            "accuracy":      error_report.get("accuracy", 0),
            "total_errors":  error_report.get("total_errors", 0),
            "timestamp":     datetime.now().isoformat(),
        }
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return _fallback_feedback(error_report, target_word, patient_name)


def generate_practice_exercise(error_report: Dict[str, Any],
                                target_word: str,
                                api_key: Optional[str] = None,
                                model: str = "llama-3.3-70b-versatile") -> str:

    api_key = api_key or os.getenv("GROQ_API_KEY")
    if not api_key:
        return _fallback_exercise(error_report, target_word)

    try:
        client = Groq(api_key=api_key)
        exercise_prompt = f"""Based on this speech error analysis, create a simple practice exercise:

Target word: {target_word}
Errors made: {error_report.get('total_errors', 0)}
Error details: {', '.join([e['description'] for e in error_report.get('errors', [])])}

Create ONE simple, specific practice exercise that:
1. Is very easy to understand (simple words only)
2. Takes 1-2 minutes to do
3. Directly addresses the main error
4. Is encouraging and actionable

Keep it to 2-3 short sentences maximum."""

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a speech therapist creating simple practice exercises for Broca's aphasia patients. Use very simple language and short sentences."},
                {"role": "user",   "content": exercise_prompt},
            ],
            temperature=0.7,
            max_tokens=150,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating practice exercise: {e}")
        return _fallback_exercise(error_report, target_word)


def _fallback_feedback(error_report, target_word, patient_name) -> Dict[str, Any]:
    accuracy = error_report.get("accuracy", 0)
    errors   = error_report.get("errors", [])
    if accuracy >= 80:
        text = f"Great job, {patient_name}! You said '{target_word}' very well. Keep practicing!"
    elif accuracy >= 50:
        text = f"Good try, {patient_name}! You got most sounds right. "
        if errors:
            fe = errors[0]
            if fe["type"] == "substitution":
                text += f"Try the '{fe['target_phoneme']}' sound again. You can do it!"
            elif fe["type"] == "omission":
                text += f"Don't forget the '{fe['target_phoneme']}' sound. Try again!"
            else:
                text += "Practice slowly. You're doing well!"
    else:
        text = f"That's okay, {patient_name}. Let's try again. Say it slowly. You're learning!"
    return {
        "feedback_text": text,
        "model_used":    "fallback_template",
        "accuracy":      accuracy,
        "total_errors":  error_report.get("total_errors", 0),
        "timestamp":     datetime.now().isoformat(),
    }


def _fallback_exercise(error_report, target_word) -> str:
    errors = error_report.get("errors", [])
    if not errors:
        return f"Great! Now practice '{target_word}' three times."
    fe = errors[0]
    if fe["type"] == "omission":
        return f"Practice this sound: '{fe['target_phoneme']}'. Say it five times. Then say '{target_word}' slowly."
    elif fe["type"] == "substitution":
        return f"Focus on this sound: '{fe['target_phoneme']}'. Listen carefully. Now try '{target_word}' again."
    return f"Say '{target_word}' slowly. Don't rush. You can do it!"


def print_feedback(feedback: Dict[str, Any]) -> None:
    """Pretty-print feedback to terminal — unchanged from original."""
    print("\n" + "=" * 50)
    print("💬 FEEDBACK FOR PATIENT")
    print("=" * 50)
    print(f"\n{feedback['feedback_text']}\n")
    print("=" * 50)
    print(f"📊 Accuracy:     {feedback['accuracy']}%")
    print(f"❌ Total Errors: {feedback['total_errors']}")
    print(f"🤖 Model:        {feedback['model_used']}")
    print(f"⏰ Timestamp:    {feedback['timestamp']}")
    print("=" * 50 + "\n")


def save_feedback_log(feedback: Dict[str, Any],
                      patient_id: str,
                      filename: str = "feedback_log.json") -> None:
    """Save feedback to rolling JSON log — unchanged from original."""
    log_entry = {
        "patient_id": patient_id,
        "timestamp":  feedback["timestamp"],
        "accuracy":   feedback["accuracy"],
        "total_errors": feedback["total_errors"],
        "feedback":   feedback["feedback_text"],
        "model":      feedback["model_used"],
    }
    try:
        log = []
        if os.path.exists(filename):
            with open(filename, "r") as f:
                log = json.load(f)
        log.append(log_entry)
        with open(filename, "w") as f:
            json.dump(log, indent=2, fp=f)
        print(f"✓ Feedback logged to {filename}")
    except Exception as e:
        print(f"✗ Error saving feedback log: {e}")


# ── LangGraph node ───────────────────────────────────────────────────────────

def feedback_generation_node(state: SpeechTherapyState) -> dict:
    """
    LangGraph node: call Groq LLM → generate feedback + practice exercise → update state.
    Tracks feedback_attempts so the conditional edge can cap retries.
    """
    error_report  = state.get("error_report", {})
    target_word   = state.get("target_word", "")
    patient_name  = state.get("patient_name", "friend")

    print("\nGenerating personalised feedback...")
    feedback = generate_feedback(
        error_report=error_report,
        target_word=target_word,
        patient_name=patient_name,
    )
    print_feedback(feedback)

    print("Generating practice exercise...")
    exercise = generate_practice_exercise(error_report, target_word)
    print("PRACTICE EXERCISE:")
    print(exercise)

    return {
        **state,
        "feedback":          feedback,
        "practice_exercise": exercise,
        "feedback_attempts": state.get("feedback_attempts", 0) + 1,
        "current_error":     None,
    }
