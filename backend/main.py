import os
from uuid import UUID
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

#Creating the Fast API App
app = FastAPI(
    title="Waabi Robot Bridge API",
    description="Backend bridge between Waabi hardware and Aqtasy Supabase DB",
    version="1.1.0"
)

# Initialize Supabase Client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise RuntimeError("Missing Supabase credentials in environment variables.")

# Connecting to Supabase
supabase: Client = create_client(url, key)


# --- DATA MODELS (PYDANTIC) ---

class SessionUpdate(BaseModel):
    """Schema for updating session status from the robot."""
    status: str = Field(..., pattern="^(upcoming|in-progress|completed|cancelled)$")

# This session response structure is based on the way the supabase tables were created
class SessionResponse(BaseModel):
    """Schema for session data returned to the robot."""
    id: int
    patient_id: UUID
    therapist_id: UUID
    session_date: str
    session_time: str
    bot_name: str
    status: str


class PatientProfile(BaseModel):
    """Simplified profile for robot greeting logic."""
    full_name: str
#the only data the robot need is the patient name


# --- ROBOT ENDPOINTS ---

@app.get("/", tags=["Health"]) # Check if the bridge is active
async def health_check():
    return {"status": "online", "robot": "Waabi", "bridge": "Active"} # Monitors status of the robot

# GEts the robot agenda for that particular day
@app.get(
    "/robot/agenda/{therapist_id}",
    response_model=List[SessionResponse],
    tags=["Robot Core"]
)

# The robot gets the therapist id to obtain the agenda
async def get_robot_agenda(therapist_id: UUID):
    """
    Fetches all 'upcoming' sessions for Waabi's specific therapist.
    Ensures the robot knows who it is seeing today.
    """
    try:
        # Query sessions filtered by therapist and 'upcoming' status
        response = supabase.table("sessions") \
            .select("*") \
            .eq("therapist_id", str(therapist_id)) \
            .eq("status", "upcoming") \
            .order("session_date", desc=False) \
            .execute()

        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch agenda: {str(e)}"
        )


@app.patch(
    "/robot/session/{session_id}",
    response_model=SessionResponse,
    tags=["Robot Core"]
)

# The session data is taken from the session table in supabase
async def update_session_status(session_id: int, update: SessionUpdate):
    """
    Updates session status (e.g., Robot moves session to 'in-progress' upon start).
    """
    try:
        response = supabase.table("sessions") \
            .update({"status": update.status}) \
            .eq("id", session_id) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session ID not found in database."
            )

        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status update failed: {str(e)}"
        )

# Gets the patient name from the profiles table
@app.get(
    "/robot/patient/{patient_id}",
    response_model=PatientProfile,
    tags=["Utility"]
)
async def get_patient_name(patient_id: UUID):
    """
    Allows Waabi to fetch a patient's name for personalized greetings.
    """
    try:
        response = supabase.table("profiles") \
            .select("full_name") \
            .eq("id", str(patient_id)) \
            .single() \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found."
            )

        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching patient data: {str(e)}"
        )


# --- SERVER START ---

if __name__ == "__main__":
    import uvicorn

    # Use 0.0.0.0 so the Raspberry Pi can connect over your local network
    uvicorn.run(app, host="0.0.0.0", port=8000)