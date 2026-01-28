import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import black_logo from "../assets/black_logo.svg";

const AuthPage = ({ type }) => {
  const navigate = useNavigate();
  const isLogin = type === "login";

  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [preferredPassword, setPreferredPassword] = useState("");
  const [title, setTitle] = useState("Mr.");
  const [clinicName, setClinicName] = useState("");

  const themeColor = role === "therapist" ? "bg-[#5cb338]" : "bg-[#4f6ef7]";
  const textColor = role === "therapist" ? "text-[#5cb338]" : "text-[#4f6ef7]";

  // Updates therapist-specific details in the profiles table
  const updateTherapistProfile = async (userId) => {
    if (role === "therapist") {
      await supabase
        .from("profiles")
        .update({ title, clinic_name: clinicName })
        .eq("id", userId);
    }
  };

  // Handles Email/Password Authentication
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");

    try {
      if (isLogin) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;

        const userRole = data.user.user_metadata.role;
        navigate(userRole === "therapist" ? "/dashboard" : "/patient-dashboard");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });
        if (signUpError) throw signUpError;

        if (role === "therapist") await updateTherapistProfile(data.user.id);
        navigate(role === "therapist" ? "/dashboard" : "/patient-dashboard");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Handles Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setError("");
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + (role === "therapist" ? "/dashboard" : "/patient-dashboard"),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    if (googleError) setError(googleError.message);
  };

  // Handles Password Reset Requests
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address above to reset your password.");
      return;
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login",
      });
      if (resetError) throw resetError;
      setResetMessage("Password reset email sent! Check your inbox.");
      setError("");
    } catch (err) {
      setError("Could not send reset email. Verify the address is correct.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f9ff] to-[#f0fff4] px-4 py-12">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
        <div className="flex flex-col items-center mb-8 text-center">
          <img src={black_logo} alt="Logo" className="h-20 w-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          {error && (
            <p className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded w-full font-medium">
              {error}
            </p>
          )}
          {resetMessage && (
            <p className="text-green-600 text-xs mt-2 bg-green-50 p-2 rounded w-full font-medium">
              {resetMessage}
            </p>
          )}
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button
            type="button"
            onClick={() => setRole("patient")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === "patient" ? "bg-[#4f6ef7] text-white" : "text-gray-500"
            }`}
          >
            Patient
          </button>
          <button
            type="button"
            onClick={() => setRole("therapist")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === "therapist" ? "bg-[#5cb338] text-white" : "text-gray-500"
            }`}
          >
            Therapist
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {role === "therapist" && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-24">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Title</label>
                    <select
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-3 mt-1 text-sm font-medium"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="SLP">SLP</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Clinic Name</label>
                    <input
                      type="text"
                      placeholder="e.g. City Rehab"
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 mt-1 text-sm outline-none focus:ring-2 focus:ring-gray-100"
                      onChange={(e) => setClinicName(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <input
                type="text"
                placeholder="Full Name"
                required
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
                onChange={(e) => setFullName(e.target.value)}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            required
            className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
              onChange={(e) => setPassword(e.target.value)}
            />
            {isLogin && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className={`text-[11px] font-bold ${textColor} hover:underline`}
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`w-full ${themeColor} text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 active:scale-95 transition-all`}
          >
            {isLogin ? "Sign In" : "Create Account"}
          </button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          {isLogin ? "New to Aqtasy? " : "Joined us before? "}
          <Link
            to={isLogin ? "/signup" : "/login"}
            className={`font-bold ${textColor} hover:underline`}
          >
            {isLogin ? "Create Account" : "Log In"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;