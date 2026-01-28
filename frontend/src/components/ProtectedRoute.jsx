import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Handles role-based access control using Supabase session metadata
const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Retrieves current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        // Role is pulled from user_metadata set during signup
        setRole(session.user.user_metadata.role);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Listens for authentication state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setRole(session.user.user_metadata.role);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-[#4f6ef7]">
        Loading Aqtasy...
      </div>
    );

  // Redirects unauthenticated users to login
  if (!user) return <Navigate to="/login" replace />;

  // Redirects users to their specific dashboard if they attempt to access the wrong portal
  if (requiredRole && role !== requiredRole) {
    return (
      <Navigate
        to={role === "therapist" ? "/dashboard" : "/patient-dashboard"}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;