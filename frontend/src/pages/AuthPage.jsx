import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import black_logo from "../assets/black_logo.svg";
import backgroundImage from "../assets/authentication_bgimage.png";

const AuthPage = ({ type }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = type === "login";

  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState(""); // For recovery
  const [fullName, setFullName] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); // For success messages
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  const [title, setTitle] = useState("Mr.");
  const [clinicName, setClinicName] = useState("");

  const themeColor = role === "therapist" ? "bg-[#064e3b]" : "bg-[#172554]";
  const textColor = role === "therapist" ? "text-[#064e3b]" : "text-[#172554]";
  const ringColor =
    role === "therapist"
      ? "focus:ring-[#064e3b]/20"
      : "focus:ring-[#172554]/20";

  // 1. CATCH MESSAGES FROM REDIRECTS (e.g., from successful signup)
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      // Clear the route state so the message disappears if they refresh the page
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // 2. LISTEN FOR PASSWORD RECOVERY LINK CLICK
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecoveryFlow(true);
          setIsForgotPassword(false);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 3. STANDARD LOGIN / SIGNUP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (loginError) {
          // Check if the error is specifically because the email isn't verified
          if (loginError.message.includes("Email not confirmed")) {
            throw new Error(
              "Please verify your email address before signing in. Check your inbox!",
            );
          }
          // Otherwise, it's a standard wrong password/email error
          throw new Error("Incorrect email or password. Please try again.");
        }

        const userRole = data.user.user_metadata.role;
        navigate(
          userRole === "therapist"
            ? "/therapist-dashboard"
            : "/patient-dashboard",
        );
      } else {
        // --- SIGNUP FLOW ---
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              // Pass these directly into metadata so they save even before email is verified
              title: role === "therapist" ? title : null,
              clinic_name: role === "therapist" ? clinicName : null,
            },
          },
        });

        if (signUpError) throw signUpError;

        // If they are a therapist, update the extra profile info
        if (role === "therapist" && data.user) {
          await supabase
            .from("profiles")
            .update({ title, clinic_name: clinicName })
            .eq("id", data.user.id);
        }

        // FORCE A LOGOUT: This guarantees they don't bypass the email confirmation check
        await supabase.auth.signOut();

        // Redirect to the login view and pass the success message
        navigate("/login", {
          state: {
            message:
              "Registration successful! Please check your email inbox to verify your account before signing in for the first time.",
          },
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. SEND RESET LINK TO EMAIL
  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login",
      });
      if (error) throw error;
      setMessage(
        "Password reset link sent! Check your email inbox or spam folder.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. UPDATE THE ACTUAL PASSWORD
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setMessage("Password updated successfully! Redirecting...");

      setTimeout(() => {
        setIsRecoveryFlow(false);
        navigate(
          role === "therapist" ? "/therapist-dashboard" : "/patient-dashboard",
        );
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic Text Helpers
  let pageTitle = isLogin ? "Welcome Back" : "Join Us";
  let subTitle = "Clinical Portal Access";

  if (isRecoveryFlow) {
    pageTitle = "Set New Password";
    subTitle = "Secure Account Recovery";
  } else if (isForgotPassword) {
    pageTitle = "Reset Password";
    subTitle = "Account Recovery";
  }

  return (
    <div className="h-screen flex flex-col md:flex-row font-sans selection:bg-[#172554]/10 bg-white overflow-hidden antialiased">
      {/* LEFT PANEL: NARRATIVE */}
      <div
        className="w-full md:w-[70%] h-full relative overflow-hidden p-12 md:p-24 flex flex-col justify-center bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
        <div
          className={`absolute w-[600px] h-[600px] rounded-full blur-[140px] animate-pulse transition-colors duration-1000 ${role === "therapist" ? "bg-[#064e3b]/30" : "bg-[#172554]/30"}`}
        ></div>

        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left duration-1000">
          <div className="space-y-8">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-none mb-6 text-white drop-shadow-2xl">
                Meet <br /> Waabi.
              </h1>
              <div
                className={`h-2 w-24 rounded-full transition-colors duration-1000 ${themeColor}`}
              ></div>
            </div>

            <div className="space-y-6 text-lg font-semibold leading-relaxed text-white/90 drop-shadow-md pr-8">
              <p>
                At the heart of our platform is{" "}
                <span className="font-extrabold text-white border-b-2 border-white/20 pb-1">
                  Waabi
                </span>
                —an intelligent speech therapy companion designed to support
                every voice.
              </p>
              <p>
                Whether you are a <b className="text-white">therapist</b>{" "}
                guiding a clinical journey or a{" "}
                <b className="text-white">patient</b> finding your words again,
                Waabi bridges the gap between the clinic and the home.
              </p>
              <p>
                By combining <b className="text-white">empathetic AI</b> with{" "}
                <b className="text-white">personalized care</b>, we make
                recovery more consistent, data-driven, and human.
              </p>
            </div>

            <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
              <p
                className={`text-[10px] font-extrabold uppercase tracking-[0.8em] text-white/40`}
              >
                The Future of Aphasia Recovery
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: AUTHENTICATION */}
      <div className="w-full md:w-[30%] h-full bg-white flex flex-col items-center justify-center p-10 border-l border-gray-100 relative shadow-[-20px_0_60px_rgba(0,0,0,0.08)]">
        <div className="w-full max-w-[340px] z-10 animate-in fade-in slide-in-from-right duration-1000">
          <div className="flex flex-col items-center mb-12 text-center">
            <img
              src={black_logo}
              alt="Logo"
              className="h-14 w-auto mb-10 cursor-pointer hover:scale-110 transition-transform duration-500"
            />
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              {pageTitle}
            </h2>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 italic">
              {subTitle}
            </p>

            {error && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl w-full animate-in fade-in duration-300">
                <p className="text-red-600 text-[10px] font-extrabold uppercase tracking-widest text-center italic">
                  ⚠️ {error}
                </p>
              </div>
            )}
            {message && (
              <div className="mt-8 p-4 bg-green-50 border border-green-100 rounded-2xl w-full animate-in fade-in duration-300">
                <p className="text-green-600 text-[10px] font-extrabold uppercase tracking-widest text-center italic">
                  ✅ {message}
                </p>
              </div>
            )}
          </div>

          {/* Hide Role Switcher if in Forgot/Recover Password mode */}
          {!isForgotPassword && !isRecoveryFlow && (
            <div className="flex bg-gray-50 rounded-2xl p-1.5 mb-10 border border-gray-100 shadow-inner animate-in fade-in duration-500">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`flex-1 py-4 text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-xl transition-all duration-500 ${
                  role === "patient"
                    ? "bg-[#172554] text-white shadow-xl shadow-[#172554]/20"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole("therapist")}
                className={`flex-1 py-4 text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-xl transition-all duration-500 ${
                  role === "therapist"
                    ? "bg-[#064e3b] text-white shadow-xl shadow-[#064e3b]/20"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Therapist
              </button>
            </div>
          )}

          {/* DYNAMIC FORM */}
          <form
            onSubmit={
              isRecoveryFlow
                ? handleUpdatePassword
                : isForgotPassword
                  ? handlePasswordResetRequest
                  : handleSubmit
            }
            className="space-y-5"
          >
            {/* 1. UPDATE PASSWORD FLOW */}
            {isRecoveryFlow && (
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                required
                className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            )}

            {/* 2. NORMAL SIGNUP FLOW (Names & Clinic) */}
            {!isLogin && !isForgotPassword && !isRecoveryFlow && (
              <>
                {role === "therapist" && (
                  <div className="flex gap-3 animate-in slide-in-from-top-4 duration-500">
                    <div className="w-24">
                      <select
                        className={`w-full bg-gray-50 border border-transparent rounded-xl px-3 py-4 text-xs font-bold text-gray-700 outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
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
                      <input
                        type="text"
                        placeholder="Clinic Name"
                        className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                        onChange={(e) => setClinicName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  required
                  className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </>
            )}

            {/* 3. EMAIL INPUT (Used in Login, Signup, and Request Reset) */}
            {!isRecoveryFlow && (
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                required
                className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            {/* 4. PASSWORD INPUT (Used in Login & Signup only) */}
            {!isForgotPassword && !isRecoveryFlow && (
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  required
                  className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {/* Forgot Password Link */}
                {isLogin && (
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError("");
                        setMessage("");
                      }}
                      className={`text-[10px] font-extrabold uppercase tracking-widest ${textColor} hover:underline transition-all`}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full ${themeColor} text-white font-extrabold uppercase tracking-[0.3em] py-5 rounded-2xl shadow-2xl shadow-black/5 mt-6 active:scale-95 transition-all duration-300 disabled:opacity-50 text-[11px]`}
            >
              {isSubmitting
                ? "Processing..."
                : isRecoveryFlow
                  ? "Update Password"
                  : isForgotPassword
                    ? "Send Reset Link"
                    : isLogin
                      ? "Sign In"
                      : "Register Now"}
            </button>
          </form>

          {/* BOTTOM LINKS */}
          {!isRecoveryFlow && (
            <div className="mt-12 text-center text-[11px] font-bold text-gray-400 tracking-wide">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError("");
                    setMessage("");
                  }}
                  className={`font-extrabold ${textColor} hover:underline decoration-2 underline-offset-4 transition-all`}
                >
                  Back to Login
                </button>
              ) : (
                <>
                  {isLogin ? "Don't have an account? " : "Already registered? "}
                  <Link
                    to={isLogin ? "/signup" : "/login"}
                    className={`font-extrabold ${textColor} hover:underline ml-1 decoration-2 underline-offset-4 transition-all`}
                    onClick={() => {
                      setError("");
                      setMessage("");
                    }}
                  >
                    {isLogin ? "Create account" : "Log In"}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
