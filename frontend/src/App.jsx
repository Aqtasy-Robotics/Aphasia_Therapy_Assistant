import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import PatientDashboard from "./pages/PatientDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect base URL to login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth Routes */}
        <Route path="/login" element={<AuthPage type="login" />} />
        <Route path="/signup" element={<AuthPage type="signup" />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/therapist-dashboard" element={<TherapistDashboard />} />

        {/*Protected Therapist Routes*/}
        {/*Security checkpoint inside your code and wraps aroun your private pages*/}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="therapist">
              <TherapistDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback if anything happens*/}
        <Route
          path="*"
          //incase the app doesn't have any redirections installed
          element={<div className="p-10 text-center">404 - Not Found</div>}
        />
      </Routes>
    </Router>
  );
}

export default App;
