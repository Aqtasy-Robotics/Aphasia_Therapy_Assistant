import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Auth & Core Components
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import TherapistLayout from "./pages/therapist/TherapistLayout"; // Import the layout we created

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
import Profile from "./pages/patient/Profile";

function App() {
  return (
    <Router>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<AuthPage type="login" />} />
        <Route path="/signup" element={<AuthPage type="signup" />} />

        {/* --- PROTECTED PATIENT ROUTES --- */}
        {/* If patients need a sidebar too, you would follow the same layout pattern here */}
        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute requiredRole="patient">
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient-progress"
          element={
            <ProtectedRoute requiredRole="patient">
              <MyProgress />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient-words"
          element={
            <ProtectedRoute requiredRole="patient">
              <MyWords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient-sessions"
          element={
            <ProtectedRoute requiredRole="patient">
              <MySessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient-chat"
          element={
            <ProtectedRoute requiredRole="patient">
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute requiredRole="patient">
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* --- PROTECTED THERAPIST ROUTES (NESTED) --- */}
        <Route
          element={
            <ProtectedRoute requiredRole="therapist">
              <TherapistLayout />
            </ProtectedRoute>
          }
        >
          {/* All routes inside here will render the Sidebar from TherapistLayout */}
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