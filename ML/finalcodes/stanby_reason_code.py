import os 
import json
from groq import Groq  # Changed from openai to groq
from typing import Dict, Any, Optional  # Fixed: Optional with capital O
from datetime import datetime

def generate_feedback(error_report: Dict[str, Any], 
                      target_word: str,
                      patient_name: str = "friend",
                      api_key: Optional[str] = None,  # Fixed: Optional with capital O
                      model: str = "llama-3.3-70b-versatile") -> Dict[str, str]:  # Changed default model for Groq
    
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
    api_key =  os.getenv("GROQ_REASON")  # Fixed: More standard env var name
    if not api_key:
        print("Warning: No API key found. Using fallback feedback.")
        return _fallback_feedback(error_report, target_word, patient_name)  # Fixed: Added underscore prefix

    # Building prompts - Fixed: Added missing function call parameters
    system_prompt = _get_system_prompt()
    user_prompt = _build_user_prompt(error_report, target_word, patient_name)  # Fixed: Added parameters

    try:
        # Call Groq LLM - Fixed: Changed from OpenAI to Groq
        client = Groq(api_key=api_key)  # Fixed: Changed OpenAI to Groq
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=200,
            top_p=0.9
        )
        feedback_text = response.choices[0].message.content.strip()

        return {
            "feedback_text": feedback_text,
            "model_used": model,  # Fixed: Changed "model-used" to "model_used" (consistent naming)
            "accuracy": error_report.get('accuracy', 0),
            "total_errors": error_report.get('total_errors', 0),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error calling Groq API: {str(e)}")
        return _fallback_feedback(error_report, target_word, patient_name)  # Fixed: Added return and underscore


def _get_system_prompt() -> str:  # Fixed: Added underscore prefix and return type
    """Return the system prompt for Broca's aphasia feedback"""
    return """You are a compassionate speech therapist providing feedback to a patient with Broca's aphasia.

CRITICAL GUIDELINES FOR BROCA'S APHASIA PATIENTS:
1. Use VERY SHORT sentences (5-8 words maximum)
2. Use SIMPLE, common words only
3. Avoid complex grammar
4. Be CONCRETE and specific
5. Focus on ONE thing at a time
6. Be encouraging and positive
7. Use repetition to reinforce key points
8. Avoid medical jargon completely

PATIENT CHARACTERISTICS:
- Broca's aphasia: Can understand but struggles with speech production
- Needs clear, simple instructions
- Benefits from positive reinforcement
- May feel frustrated - be extra encouraging

RESPONSE STRUCTURE:
1. Start with praise (1 sentence)
2. Point out the error simply (1-2 sentences)
3. Give ONE clear tip (1 sentence)
4. Encourage practice (1 sentence)

Keep total response under 5 sentences."""


def _build_user_prompt(error_report: Dict[str, Any], 
                       target_word: str, 
                       patient_name: str) -> str:  # Fixed: Added underscore prefix
    """Build the user prompt from error report"""
    
    prompt = f"""Patient tried to say: "{target_word}"

PERFORMANCE:
- Accuracy: {error_report.get('accuracy', 0)}%
- Total Errors: {error_report.get('total_errors', 0)}
- Substitutions: {error_report['error_summary']['substitutions']}
- Omissions: {error_report['error_summary']['omissions']}
- Insertions: {error_report['error_summary']['insertions']}

TARGET PHONEMES: {' '.join(error_report.get('target_phonemes', []))}
PATIENT SAID: {' '.join(error_report.get('attempt_phonemes', []))}

SPECIFIC ERRORS:
"""
    # Fixed: Moved this outside the for loop
    for i, error in enumerate(error_report.get('errors', [])[:3], 1):
        prompt += f"{i}. {error['type'].upper()}: {error['description']}\n"
    
    # Fixed: This should be outside the loop
    prompt += f"""
Generate simple, encouraging feedback for {patient_name}.
Remember: Very short sentences. Simple words. Be positive and specific.
Focus on the MOST IMPORTANT error to fix first."""
    
    return prompt


def _fallback_feedback(error_report: Dict[str, Any], 
                       target_word: str, 
                       patient_name: str) -> Dict[str, str]:  # Fixed: Added underscore prefix
    """Generate simple fallback feedback if Groq API fails"""
    accuracy = error_report.get('accuracy', 0)
    errors = error_report.get('errors', [])  # Fixed: Get errors list, not total_errors
    
    # Simple template-based feedback
    if accuracy >= 80:
        feedback = f"Great job, {patient_name}! You said '{target_word}' very well. Keep practicing!"
    elif accuracy >= 50:
        feedback = f"Good try, {patient_name}! You got most sounds right. "
        if errors:  # Fixed: Now checking the errors list
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
                                target_word: str) -> str:
    """
    Generate a simple practice exercise based on errors
    
    Args:
        error_report: Error report from analyzer
        target_word: Target word
    
    Returns:
        Practice exercise string
    """
    
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
    
    else:  # insertion
        return f"Say '{target_word}' slowly. Don't rush. You can do it!"


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
    print("FEEDBACK FOR PATIENT")
    print("="*50)
    print(feedback['feedback_text'])
    print("="*50)
    print(f"Accuracy: {feedback['accuracy']}%")
    print(f"Total Errors: {feedback['total_errors']}")
    print(f"Model: {feedback['model_used']}")
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
    
    # Generate feedback
    feedback = generate_feedback(
        error_report=sample_report,
        target_word="cat",
        patient_name="Sarah"
    )
    
    # Display feedback
    print_feedback(feedback)
    
    # Generate practice exercise
    exercise = generate_practice_exercise(sample_report, "cat")
    print("PRACTICE EXERCISE:")
    print(exercise)
    print()
    
    # Save to log (optional)
    # save_feedback_log(feedback, patient_id="patient_001")