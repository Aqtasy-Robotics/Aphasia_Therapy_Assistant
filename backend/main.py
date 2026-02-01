import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# ---------------------------------------------------------
# 1. SETUP & SECURITY
# ---------------------------------------------------------
# Load the secrets from your .env file
load_dotenv()

# Verify keys exist (Sanity Check)
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("CRITICAL ERROR: Supabase keys are missing from .env file!")

# Initialize the connection to Supabase (The Memory)
supabase: Client = create_client(
    os.getenv("https://vqjtcniicxoxvqqsbeog.supabase.co"), 
    os.getenv("SUPABASE_KEY")
)

app = FastAPI(title="Aqtasy Robotics Backend")

# ---------------------------------------------------------
# 2. DATA MODELS (The "Systematic Output" Recipes)
# ---------------------------------------------------------
# This ensures the robot only receives strict, valid commands.

class PatientInput(BaseModel):
    patient_id: str
    audio_text: str  # Text from Whisper (Agent 1)
    detected_object: str = None  # From Camera (Agent 1)

class RobotCommand(BaseModel):
    action: str  # "speak", "listen", "wait"
    text_to_speak: str
    face_expression: str # "happy", "thinking", "listening"
    screen_display: str # "star_reward", "next_exercise"

# ---------------------------------------------------------
# 3. API ENDPOINTS (The Robot's Actions)
# ---------------------------------------------------------

@app.get("/")
def health_check():
    """Simple check to see if the server is alive."""
    return {
        "status": "online",
        "system": "Aqtasy Core"
        }

@app.post("/start-session")
def start_session(patient_id: str):
    """
    Called when the Therapist clicks 'Start Session' on the dashboard.
    """
    try:
        # 1. Log the start time in Supabase
        data = {
            "patient_id": patient_id,
            "status": "active",
            "notes": "Session started via Robot"
        }
        # This inserts a row into your 'sessions' table
        response = supabase.table("sessions").insert(data).execute()
        
        return {
            "message": "Session started", 
            "session_id": response.data[0]['id']
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-interaction", response_model=RobotCommand)
def process_interaction(input_data: PatientInput):
    """
    THE CORE LOOP: 
    1. Receives input (Text/Vision)
    2. Decides what to do (The 'Brain')
    3. Returns a command for the robot (The 'Execution Agent')
    """
    
    # --- PHASE 2: AI LOGIC GOES HERE ---
    # In the future, you will put your OpenAI / Azure code here.
    # For now, we will simulate the "Reasoning Agent" logic.
    
    print(f"Received input from Patient {input_data.patient_id}: {input_data.audio_text}")

    # SIMULATED LOGIC (The "Brain"):
    response_text = ""
    emotion = "neutral"
    
    if "hello" in input_data.audio_text.lower():
        response_text = "Hello! I am ready to help you practice."
        emotion = "happy"
    elif "cup" in input_data.audio_text.lower():
        response_text = "Great job! That is indeed a cup."
        emotion = "excited"
    else:
        response_text = "I didn't quite catch that. Can you try again?"
        emotion = "listening"

    # --- RETURN THE SYSTEMATIC OUTPUT ---
    # This JSON is exactly what the Raspberry Pi needs to move and speak.
    return RobotCommand(
        action="speak",
        text_to_speak=response_text,
        face_expression=emotion,
        screen_display="default_view"
    )