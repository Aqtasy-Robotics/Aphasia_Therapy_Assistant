import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import PatientDashboard from "./pages/PatientDashboard";

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

        {/* Fallback if anything happens*/}
        <Route
          path="*"
          element={<div className="p-10 text-center">404 - Not Found</div>}
        />
      </Routes>
    </Router>
  );
}

export default App;
