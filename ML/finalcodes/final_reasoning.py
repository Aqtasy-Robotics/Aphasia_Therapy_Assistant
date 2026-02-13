import os 
import json
from openai import openAI
from typing import Dict, Any ,Optional
from datetime import datetime

def generate_feedback(error_report:Dict[str,Any], 
                      target_word: str,
                      patient_name:str = "friend",
                      api_key: optional[str] = None ,
                      model : str = "gpt-4o-mini") -> Dict[str, str]:
    
    """
    Generate speech therapy feedback based on the error report given by the analyzer agent 

    Args:
        error_report: Error report dictionary from analyzer
        target_word: Word the patient attempted to say
        patient_name: Patient's name for personalization
        api_key: OpenAI API key (reads from env if not provided)
        model: OpenAI model to use (gpt-4o-mini recommended)
    
    Returns:
        Dictionary with feedback_text, accuracy, model_used, etc.
    
    """

    #getting the api key
api_key=os.getenv("GROQ_API")  
if not api_key:
    print("Warning no API key is used ")
    return _fallback_feedback(error_report, target_word, patient_name) 

#Buidling prompts 
system_prompt= _get_system_prompt()
user_prompt= _build_user_prompt(error_report, target_word, patient_name)

try:
    #call openai llm 
    client=openAI(api_key=api_key)
    response=client.chat.completions.create(
        model=model,
        messages=[
            {"role":"system","content": system_prompt},
            {"role":"user", "content": user_prompt}
        ],
        temperature=0.7,
        max_tokens=200,
        top_p=0.9
    )
    feedback_text=response.choices[0].message.content.strip()

    return {
        "feedback_text": feedback_text,
        "model-used": model,
        "accuracy": error_report.get('accuracy',0),
        "total_errors": error_report.get('total_errors', 0),
        "timestamp": datetime.now().isoformat()
    }
except Exception as e :
    print(f"Error calling OpenAI API:{str(e)}")
    return fallback_feedback(error_report, target_word, patient_name)

def get_system_prompt():
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
