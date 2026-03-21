import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Auth & Core Components
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import TherapistLayout from "./pages/therapist/TherapistLayout";
import PatientLayout from "./pages/patient/PatientLayout";

// Therapist Pages
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import MyPatients from "./pages/therapist/MyPatients";
import Calender from "./pages/therapist/Calender";
import Reports from "./pages/therapist/Reports";
import Messages from "./pages/therapist/Messages";
import Settings from "./pages/therapist/Settings";

// Patient Pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import MyProgress from "./pages/patient/MyProgress";
import MyWords from "./pages/patient/MyWords";
import MySessions from "./pages/patient/MySessions";
import Chat from "./pages/patient/Chat";
import Profile from "./pages/patient/Profile"; // Generic Profile component

function App() {
  return (
    <Router>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<AuthPage type="login" />} />
        <Route path="/signup" element={<AuthPage type="signup" />} />

        {/* --- PROTECTED PATIENT ROUTES --- */}
        <Route
          element={
            <ProtectedRoute requiredRole="patient">
              <PatientLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/patient-progress" element={<MyProgress />} />
          <Route path="/patient-words" element={<MyWords />} />
          <Route path="/patient-sessions" element={<MySessions />} />
          <Route path="/patient-chat" element={<Chat />} />
          <Route path="/patient-profile" element={<Profile />} />
        </Route>

        {/* --- PROTECTED THERAPIST ROUTES --- */}
        <Route
          element={
            <ProtectedRoute requiredRole="therapist">
              <TherapistLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<TherapistDashboard />} />
          <Route path="/therapist-patients" element={<MyPatients />} />
          <Route path="/therapist-calendar" element={<Calender />} />
          <Route path="/therapist-reports" element={<Reports />} />
          <Route path="/therapist-messages" element={<Messages />} />
          <Route path="/therapist-settings" element={<Settings />} />
        </Route>

        {/* --- FALLBACK (404) --- */}
        <Route
          path="*"
          element={
            <div className="p-10 text-center text-gray-500 font-bold mt-10">
              404 - Page Not Found
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
