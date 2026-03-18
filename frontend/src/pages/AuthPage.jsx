import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import black_logo from "../assets/black_logo.svg";
import backgroundImage from "../assets/authentication_bgimage.png"; 

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

  // Swapped to Deep Navy (#172554) for Patient and Forest Green (#064e3b) for Therapist
  const themeColor = role === "therapist" ? "bg-[#064e3b]" : "bg-[#172554]";
  const textColor = role === "therapist" ? "text-[#064e3b]" : "text-[#172554]";
  const ringColor = role === "therapist" ? "focus:ring-[#064e3b]/20" : "focus:ring-[#172554]/20";

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
    <div className="h-screen flex flex-col md:flex-row font-sans selection:bg-[#172554]/10 bg-white overflow-hidden antialiased">
      
      {/* LEFT PANEL: NARRATIVE (70% Width) */}
      <div 
        className="w-full md:w-[70%] h-full relative overflow-hidden p-12 md:p-24 flex flex-col justify-center bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
        
        {/* Soft Ambient Glow - Dynamic based on role */}
        <div className={`absolute w-[600px] h-[600px] rounded-full blur-[140px] animate-pulse transition-colors duration-1000 ${role === 'therapist' ? 'bg-[#064e3b]/30' : 'bg-[#172554]/30'}`}></div>

        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left duration-1000">
          <div className="space-y-8">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-none mb-6 text-white drop-shadow-2xl">
                Meet <br /> Waabi.
              </h1>
              <div className={`h-2 w-24 rounded-full transition-colors duration-1000 ${themeColor}`}></div>
            </div>

            <div className="space-y-6 text-lg font-semibold leading-relaxed text-white/90 drop-shadow-md pr-8">
              <p>
                At the heart of our platform is <span className="font-extrabold text-white border-b-2 border-white/20 pb-1">Waabi</span>—an intelligent speech therapy companion designed to support every voice.
              </p>
              <p>
                Whether you are a <b className="text-white">therapist</b> guiding a clinical journey or a <b className="text-white">patient</b> finding your words again, Waabi bridges the gap between the clinic and the home.
              </p>
              <p>
                By combining <b className="text-white">empathetic AI</b> with <b className="text-white">personalized care</b>, we make recovery more consistent, data-driven, and human.
              </p>
            </div>
            
            <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
              <p className={`text-[10px] font-extrabold uppercase tracking-[0.8em] text-white/40`}>
                The Future of Aphasia Recovery
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: AUTHENTICATION (30% Width) */}
      <div className="w-full md:w-[30%] h-full bg-white flex flex-col items-center justify-center p-10 border-l border-gray-100 relative shadow-[-20px_0_60px_rgba(0,0,0,0.08)]">
        
        <div className="w-full max-w-[340px] z-10 animate-in fade-in slide-in-from-right duration-1000">
          
          <div className="flex flex-col items-center mb-12 text-center">
            <img src={black_logo} alt="Logo" className="h-14 w-auto mb-10 cursor-pointer hover:scale-110 transition-transform duration-500" />
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              {isLogin ? "Welcome Back" : "Join Us"}
            </h2>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 italic">Clinical Portal Access</p>

            {error && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl w-full">
                <p className="text-red-600 text-[10px] font-extrabold uppercase tracking-widest text-center italic">⚠️ {error}</p>
              </div>
            )}
          </div>

          {/* Role Switcher - Updated with Deep Navy and Forest Green */}
          <div className="flex bg-gray-50 rounded-2xl p-1.5 mb-10 border border-gray-100 shadow-inner">
            <button
              type="button" onClick={() => setRole("patient")}
              className={`flex-1 py-4 text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-xl transition-all duration-500 ${
                role === "patient" ? "bg-[#172554] text-white shadow-xl shadow-[#172554]/20" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Patient
            </button>
            <button
              type="button" onClick={() => setRole("therapist")}
              className={`flex-1 py-4 text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-xl transition-all duration-500 ${
                role === "therapist" ? "bg-[#064e3b] text-white shadow-xl shadow-[#064e3b]/20" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Therapist
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                {role === "therapist" && (
                  <div className="flex gap-3 animate-in slide-in-from-top-4 duration-500">
                    <div className="w-24">
                      <select
                        className={`w-full bg-gray-50 border border-transparent rounded-xl px-3 py-4 text-xs font-bold text-gray-700 outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                        value={title} onChange={(e) => setTitle(e.target.value)}
                      >
                        <option value="Mr.">Mr.</option><option value="Ms.">Ms.</option><option value="Dr.">Dr.</option><option value="SLP">SLP</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text" placeholder="Clinic Name"
                        className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                        onChange={(e) => setClinicName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <input
                  type="text" placeholder="Full Name" value={fullName} required
                  className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </>
            )}

            <input
              type="email" placeholder="Email Address" value={email} required
              className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password" placeholder="Password" value={password} required
              className={`w-full bg-gray-50 border border-transparent rounded-xl px-5 py-4 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white focus:border-gray-100`}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit" disabled={isSubmitting}
              className={`w-full ${themeColor} text-white font-extrabold uppercase tracking-[0.3em] py-5 rounded-2xl shadow-2xl shadow-black/5 mt-6 active:scale-95 transition-all duration-300 disabled:opacity-50 text-[11px]`}
            >
              {isSubmitting ? "Syncing..." : (isLogin ? "Sign In" : "Register Now")}
            </button>
          </form>

          <div className="mt-12 text-center text-[11px] font-bold text-gray-400 tracking-wide">
            {isLogin ? "Don't have an account? " : "Already registered? "}
            <Link
              to={isLogin ? "/signup" : "/login"}
              className={`font-extrabold ${textColor} hover:underline ml-1 decoration-2 underline-offset-4 transition-all`}
            >
              {isLogin ? "Create account" : "Log In"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;