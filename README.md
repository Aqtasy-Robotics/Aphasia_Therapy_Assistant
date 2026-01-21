<h1>Meet Waabi: Your Aphasia Recovery Robot by Aqtasy Robotics</h1>


## 🚀 Tech Stack

### Frontend (Client)
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **Visualization:** Recharts (Analytics & Progress Charts)
* **Routing:** React Router v6 (Protected Routes & RBAC)

### Backend (Server)
* **API Framework:** Python FastAPI
* **ML Integration:** Microsoft Azure (Speech-to-Text)
* **Database:** Supabase PostgreSQL / Firebase Firestore
* **Authentication:** Supabase Auth / Firebase Auth

---

## 📂 Project Architecture

The project follows a modular structure separated by domain (`Hardware`, `Backend`, `Frontend`, `ML`) to ensure clean architecture and role-based security.

```bash
/aqtasy-robotics
  ├── /hardware          # 🤖 Hardware & Raspberry Pi Logic
  │   ├── /drivers       # Servo & Motor Control Scripts
  │   ├── /sensors       # Microphone & Camera Modules
  │   └── robot_main.py  # Main Entry Point for Robot
  │
  ├── /backend           # 🐍 Python FastAPI Server
  │   ├── /app
  │   │   ├── /routers   # API Endpoints (Auth, Sessions)
  │   │   ├── /models    # Database Schemas (Pydantic/SQLAlchemy)
  │   │   └── main.py    # Server Entry Point
  │   └── requirements.txt
  │
  ├── /ml                # 🧠 AI & Machine Learning Models
  │   ├── /models        # Trained Models (Speech Analysis)
  │   ├── /scripts       # Training & Evaluation Scripts
  │   └── /azure         # Azure Speech Services Integration
  │
  └── /frontend          # ⚛️ React.js Web Application
      ├── /public        # Static Assets
      ├── /src
      │   ├── /assets           # Images & Icons
      │   ├── /components       # Reusable UI (StatCards, ProtectedRoute)
      │   ├── /pages
      │   │   ├── /auth         # Login & Signup
      │   │   ├── /patient      # 🟢 PATIENT PORTAL (Restricted)
      │   │   │   ├── PatientDashboard.jsx
      │   │   │   ├── MyProgress.jsx
      │   │   │   └── Chat.jsx
      │   │   └── /therapist    # 🔵 THERAPIST PORTAL (Restricted)
      │   │       ├── TherapistDashboard.jsx
      │   │       └── MyPatients.jsx
      │   ├── App.jsx           # Main Router
      │   ├── firebase.js       # DB Configuration
      │   └── supabaseClient.js # Auth Configuration
      └── package.json
