import os 
from dotenv import load_dotenv
load_dotenv()  # must call it
import json
from groq import Groq
from typing import Dict, Any, Optional
from datetime import datetime

def generate_feedback(error_report: Dict[str, Any], 
                      target_word: str,
                      patient_name: str = "friend",
                      api_key: Optional[str] = None,
                      model: str = "llama-3.3-70b-versatile") -> Dict[str, str]:
    
    """
    Generate speech therapy feedback based on the error report given by the analyzer agent 

    Args:
        error_report: Error report dictionary from analyzer
        target_word: Word the patient attempted to say
        patient_name: Patient's name for personalization
        api_key: Groq API key (reads from env if not provided)
        model: Groq model to use (llama-3.3-70b-versatile recommended)
    
    Returns:
        Dictionary with feedback_text, accuracy, model_used, etc.
    
    """

    # Getting the api key
    api_key = api_key or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: No API key found. Using fallback feedback.")
        return _fallback_feedback(error_report, target_word, patient_name)

    # Building prompts - LLM will generate everything
    system_prompt = _get_system_prompt()
    user_prompt = _build_user_prompt(error_report, target_word, patient_name)
 
    try:
        # Call Groq LLM
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.8,  # Increased for more natural, varied responses
            max_tokens=300,   # Increased to allow fuller responses
            top_p=0.95
        )
        feedback_text = response.choices[0].message.content.strip()

        return {
            "feedback_text": feedback_text,
            "model_used": model,
            "accuracy": error_report.get('accuracy', 0),
            "total_errors": error_report.get('total_errors', 0),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error calling Groq API: {str(e)}")
        return _fallback_feedback(error_report, target_word, patient_name)


def _get_system_prompt() -> str:
    """Return the system prompt for Broca's aphasia feedback - LLM generates everything"""
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
    """Build detailed user prompt with complete error analysis"""
    
    # Get basic metrics
    accuracy = error_report.get('accuracy', 0)
    total_errors = error_report.get('total_errors', 0)
    target_phonemes = error_report.get('target_phonemes', [])
    attempt_phonemes = error_report.get('attempt_phonemes', [])
    
    # Build detailed prompt
    prompt = f"""PATIENT INFORMATION:
- Patient name: {patient_name}
- Target word: "{target_word}"
- What patient said: {' '.join(attempt_phonemes) if attempt_phonemes else '(unclear/no sound)'}

PERFORMANCE SUMMARY:
- Overall accuracy: {accuracy}%
- Total phoneme errors: {total_errors}
- Substitution errors: {error_report['error_summary']['substitutions']}
- Omission errors (missing sounds): {error_report['error_summary']['omissions']}
- Insertion errors (extra sounds): {error_report['error_summary']['insertions']}

PHONEME ANALYSIS:
- Target phonemes (what they should say): {' '.join(target_phonemes)}
- Attempted phonemes (what they actually said): {' '.join(attempt_phonemes) if attempt_phonemes else 'No clear phonemes detected'}
"""
    
    # Add detailed error breakdown if errors exist
    errors = error_report.get('errors', [])
    if errors:
        prompt += "\nDETAILED ERROR BREAKDOWN:\n"
        for i, error in enumerate(errors, 1):
            error_type = error['type']
            description = error['description']
            position = error.get('position', 'unknown')
            
            if error_type == 'substitution':
                prompt += f"{i}. SUBSTITUTION at position {position}: {description}\n"
                prompt += f"   - Target sound: /{error['target_phoneme']}/\n"
                prompt += f"   - Said instead: /{error['actual_phoneme']}/\n"
            elif error_type == 'omission':
                prompt += f"{i}. OMISSION at position {position}: {description}\n"
                prompt += f"   - Missing sound: /{error['target_phoneme']}/\n"
            elif error_type == 'insertion':
                prompt += f"{i}. INSERTION: {description}\n"
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


def _fallback_feedback(error_report: Dict[str, Any], 
                       target_word: str, 
                       patient_name: str) -> Dict[str, str]:
    """Generate simple fallback feedback if Groq API fails"""
    accuracy = error_report.get('accuracy', 0)
    errors = error_report.get('errors', [])
    
    # Simple template-based feedback
    if accuracy >= 80:
        feedback = f"Great job, {patient_name}! You said '{target_word}' very well. Keep practicing!"
    elif accuracy >= 50:
        feedback = f"Good try, {patient_name}! You got most sounds right. "
        if errors:
            first_error = errors[0]
            if first_error['type'] == 'substitution':
                feedback += f"Try the '{first_error['target_phoneme']}' sound again. You can do it!"
            elif first_error['type'] == 'omission':
                feedback += f"Don't forget the '{first_error['target_phoneme']}' sound. Try again!"
            else:
                feedback += "Practice slowly. You're doing well!"
    else:
        feedback = f"That's okay, {patient_name}. Let's try again. Say it slowly. You're learning!"
    
    return {
        "feedback_text": feedback,
        "model_used": "fallback_template",
        "accuracy": accuracy,
        "total_errors": error_report.get('total_errors', 0),
        "timestamp": datetime.now().isoformat()
    }


def generate_practice_exercise(error_report: Dict[str, Any], 
                                target_word: str,
                                api_key: Optional[str] = None,
                                model: str = "llama-3.3-70b-versatile") -> str:
    """
    Generate a personalized practice exercise using LLM
    
    Args:
        error_report: Error report from analyzer
        target_word: Target word
        api_key: Groq API key
        model: Groq model to use
    
    Returns:
        Practice exercise string
    """
    
    api_key =  os.getenv("GROQ_API_KEY")
    if not api_key:
        # Fallback to simple template
        errors = error_report.get('errors', [])
        if not errors:
            return f"Great! Now practice '{target_word}' three times."
        
        first_error = errors[0]
        if first_error['type'] == 'omission':
            missing_sound = first_error['target_phoneme']
            return f"Practice this sound: '{missing_sound}'. Say it five times. Then say '{target_word}' slowly."
        elif first_error['type'] == 'substitution':
            target_sound = first_error['target_phoneme']
            return f"Focus on this sound: '{target_sound}'. Listen carefully. Now try '{target_word}' again."
        else:
            return f"Say '{target_word}' slowly. Don't rush. You can do it!"
    
    try:
        client = Groq(api_key=api_key)
        
        # Build prompt for practice exercise
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
                {"role": "user", "content": exercise_prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating practice exercise: {str(e)}")
        return f"Practice saying '{target_word}' slowly. Say each sound clearly. Try it three times."


def save_feedback_log(feedback: Dict[str, str], 
                      patient_id: str, 
                      filename: str = "feedback_log.json"):
    """
    Save feedback to log file for tracking patient progress
    
    Args:
        feedback: Feedback dictionary from generate_feedback()
        patient_id: Unique patient identifier
        filename: Log file name
    """
    
    log_entry = {
        "patient_id": patient_id,
        "timestamp": feedback['timestamp'],
        "accuracy": feedback['accuracy'],
        "total_errors": feedback['total_errors'],
        "feedback": feedback['feedback_text'],
        "model": feedback['model_used']
    }
    
    try:
        # Load existing log
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                log = json.load(f)
        else:
            log = []
        
        # Append new entry
        log.append(log_entry)
        
        # Save
        with open(filename, 'w') as f:
            json.dump(log, indent=2, fp=f)
        
        print(f"✓ Feedback logged to {filename}")
        
    except Exception as e:
        print(f"✗ Error saving feedback log: {str(e)}")


def print_feedback(feedback: Dict[str, str]):
    """Pretty print feedback for terminal display"""
    
    print("\n" + "="*50)
    print("💬 FEEDBACK FOR PATIENT")
    print("="*50)
    print(f"\n{feedback['feedback_text']}\n")
    print("="*50)
    print(f"📊 Accuracy: {feedback['accuracy']}%")
    print(f"❌ Total Errors: {feedback['total_errors']}")
    print(f"🤖 Model: {feedback['model_used']}")
    print(f"⏰ Timestamp: {feedback['timestamp']}")
    print("="*50 + "\n")


# Example usage / testing
if __name__ == "__main__":
    # Example error report from analyzer
    sample_report = {
        'target_phonemes': ['k', 'æ', 't'],
        'attempt_phonemes': ['k', 'ɑ'],
        'total_errors': 2,
        'accuracy': 33.33,
        'errors': [
            {
                'type': 'substitution',
                'position': 1,
                'target_phoneme': 'æ',
                'actual_phoneme': 'ɑ',
                'description': 'æ → ɑ'
            },
            {
                'type': 'omission',
                'position': 2,
                'target_phoneme': 't',
                'actual_phoneme': None,
                'description': 'missing t'
            }
        ],
        'error_summary': {
            'substitutions': 1,
            'omissions': 1,
            'insertions': 0
        }
    }
    
    print("="*50)
    print("TESTING SPEECH THERAPY FEEDBACK SYSTEM")
    print("="*50)
    
    # Generate feedback
    feedback = generate_feedback(
        error_report=sample_report,
        target_word="cat",
        patient_name="Sarah"
    )
    
    # Display feedback
    print_feedback(feedback)
    
    # Generate practice exercise
    print("📝 PRACTICE EXERCISE:")
    exercise = generate_practice_exercise(sample_report, "cat")
    print(f"   {exercise}")
    print()
    
    # Test with perfect pronunciation
    print("\n" + "="*50)
    print("TESTING WITH PERFECT PRONUNCIATION")
    print("="*50)
    
    perfect_report = {
        'target_phonemes': ['k', 'æ', 't'],
        'attempt_phonemes': ['k', 'æ', 't'],
        'total_errors': 0,
        'accuracy': 100.0,
        'errors': [],
        'error_summary': {
            'substitutions': 0,
            'omissions': 0,
            'insertions': 0
        }
    }
    
    perfect_feedback = generate_feedback(
        error_report=perfect_report,
        target_word="cat",
        patient_name="Sarah"
    )
    
    print_feedback(perfect_feedback)
    
    # Save to log (optional)
    # save_feedback_log(feedback, patient_id="patient_001")

   