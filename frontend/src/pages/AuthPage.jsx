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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("Mr.");
  const [clinicName, setClinicName] = useState("");

  // Dynamic Theme Logic
  const themeColor = role === "therapist" ? "bg-[#5cb338]" : "bg-[#4f6ef7]";
  const textColor = role === "therapist" ? "text-[#5cb338]" : "text-[#4f6ef7]";
  const ringColor = role === "therapist" ? "focus:ring-[#5cb338]/20" : "focus:ring-[#4f6ef7]/20";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw new Error("Incorrect email or password. Please try again.");
        const userRole = data.user.user_metadata.role;
        navigate(userRole === "therapist" ? "/dashboard" : "/patient-dashboard");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, role: role } },
        });
        if (signUpError) throw signUpError;
        if (role === "therapist" && data.user) {
          await supabase.from("profiles").update({ title, clinic_name: clinicName }).eq("id", data.user.id);
        }
        navigate(role === "therapist" ? "/dashboard" : "/patient-dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans selection:bg-blue-100">
      
      {/* LEFT PANEL: The Narrative Experience */}
      <div className={`hidden md:flex md:w-5/12 relative overflow-hidden transition-colors duration-1000 ease-in-out p-16 flex-col justify-center text-white ${themeColor}`}>
        
        {/* Animated Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-black/5 rounded-full blur-2xl animate-bounce duration-[10s]"></div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <h1 className="text-6xl font-black tracking-tighter leading-[0.9] mb-4">
              Meet <br /> Waabi.
            </h1>
            <div className="h-1.5 w-20 bg-white rounded-full"></div>
          </div>

          <div className="space-y-6 text-lg font-medium leading-relaxed opacity-90 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <p>
              At the heart of our platform is <span className="font-black border-b-2 border-white/30 pb-1">Waabi</span>—an intelligent speech therapy companion designed to support every voice.
            </p>
            <p>
              Whether you are a <b>therapist</b> guiding a clinical journey or a <b>patient</b> finding your words again, Waabi bridges the gap between the clinic and the home.
            </p>
            <p>
              By combining <b>empathetic AI</b> with <b>personalized care</b>, we make recovery more consistent, data-driven, and human.
            </p>
          </div>
          <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: The Form Interface */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#f8fafc]">
        <div className="w-full max-w-[460px] animate-in fade-in zoom-in-95 duration-1000">
          
          <div className="bg-white rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-10 md:p-12 border border-white relative">
            
            <div className="flex flex-col items-center mb-10 text-center">
              <img src={black_logo} alt="Logo" className="h-16 w-auto mb-8 hover:scale-110 transition-transform duration-500 cursor-pointer" />
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                {isLogin ? "Welcome Back" : "Start your Journey"}
              </h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Access your Aqtasy Portal</p>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl w-full animate-in shake duration-500">
                  <p className="text-red-600 text-[10px] font-black uppercase tracking-widest">⚠️ {error}</p>
                </div>
              )}
            </div>

            {/* Role Switcher */}
            <div className="flex bg-gray-50 rounded-2xl p-1.5 mb-10 border border-gray-100">
              <button
                type="button" onClick={() => setRole("patient")}
                className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-[1.25rem] transition-all duration-500 ${
                  role === "patient" ? "bg-[#4f6ef7] text-white shadow-xl shadow-blue-200" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Patient
              </button>
              <button
                type="button" onClick={() => setRole("therapist")}
                className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-[1.25rem] transition-all duration-500 ${
                  role === "therapist" ? "bg-[#5cb338] text-white shadow-xl shadow-green-200" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Therapist
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  {role === "therapist" && (
                    <div className="flex gap-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="w-28">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Title</label>
                        <select
                          className={`w-full bg-gray-50 border-none rounded-2xl px-3 py-4 mt-1 text-sm font-bold text-gray-700 outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                          value={title} onChange={(e) => setTitle(e.target.value)}
                        >
                          <option value="Mr.">Mr.</option><option value="Ms.">Ms.</option><option value="Dr.">Dr.</option><option value="SLP">SLP</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Clinic Name</label>
                        <input
                          type="text" placeholder="Clinic Name"
                          className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 mt-1 text-sm font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                          onChange={(e) => setClinicName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  <div className="animate-in fade-in duration-500 delay-100">
                    <input
                      type="text" placeholder="Full Name" value={fullName} required
                      className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </>
              )}

              <input
                type="email" placeholder="Email Address" value={email} required
                className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password" placeholder="Password" value={password} required
                className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="submit" disabled={isSubmitting}
                className={`w-full ${themeColor} text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.75rem] shadow-2xl mt-6 active:scale-95 transition-all duration-300 disabled:opacity-50 text-[11px]`}
              >
                {isSubmitting ? "Authenticating..." : (isLogin ? "Sign In" : "Register Now")}
              </button>
            </form>

            <p className="mt-10 text-center text-sm font-bold text-gray-300">
              {isLogin ? "Need an account? " : "Already have an account? "}
              <Link
                to={isLogin ? "/signup" : "/login"}
                className={`font-black ${textColor} hover:brightness-90 ml-1 transition-all underline decoration-2 underline-offset-4`}
              >
                {isLogin ? "Sign up" : "Log In"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;