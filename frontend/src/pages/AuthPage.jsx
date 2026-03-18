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
    // SET TO h-screen FOR EXACT 100 VIEWPORT HEIGHT
    <div className="h-screen flex flex-col md:flex-row font-sans selection:bg-blue-100 bg-white overflow-hidden">
      
      {/* LEFT PANEL: NARRATIVE (70% Width) */}
      <div 
        className="w-full md:w-[70%] h-full relative overflow-hidden p-12 md:p-24 flex flex-col justify-center bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/30 pointer-events-none"></div>
        
        {/* Soft Ambient Glow */}
        <div className={`absolute w-[600px] h-[600px] rounded-full blur-[140px] animate-pulse transition-colors duration-1000 ${role === 'therapist' ? 'bg-green-400/20' : 'bg-blue-400/20'}`}></div>

        {/* REFINED WORDING AREA (Smaller Fonts) */}
        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left duration-1000">
          <div className="space-y-8">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              {/* Header scaled down to 6xl */}
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight mb-4 text-white drop-shadow-xl">
                Meet <br /> Waabi.
              </h1>
              <div className={`h-1.5 w-20 rounded-full transition-colors duration-1000 ${themeColor}`}></div>
            </div>

            {/* Body text scaled down to text-lg */}
            <div className="space-y-6 text-lg font-bold leading-relaxed text-white drop-shadow-md pr-8">
              <p>
                At the heart of our platform is <span className="font-black text-white border-b-2 border-white/20 pb-1">Waabi</span>—an intelligent speech therapy companion designed to support every voice.
              </p>
              <p>
                Whether you are a <b className="text-white">therapist</b> guiding a clinical journey or a <b className="text-white">patient</b> finding your words again, Waabi bridges the gap between the clinic and the home.
              </p>
              <p>
                By combining <b className="text-white">empathetic AI</b> with <b className="text-white">personalized care</b>, we make recovery more consistent, data-driven, and human.
              </p>
            </div>
            
            <div className="pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
              <p className={`text-[10px] font-black uppercase tracking-[0.8em] text-white/50`}>
                The Future of Aphasia Recovery
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: AUTHENTICATION (30% Width) */}
      <div className="w-full md:w-[30%] h-full bg-white flex flex-col items-center justify-center p-8 border-l border-gray-100 relative shadow-[-20px_0_50px_rgba(0,0,0,0.05)]">
        
        <div className="w-full max-w-[340px] z-10 animate-in fade-in slide-in-from-right duration-1000">
          
          <div className="flex flex-col items-center mb-10 text-center">
            <img src={black_logo} alt="Logo" className="h-12 w-auto mb-8 cursor-pointer hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              {isLogin ? "Welcome Back" : "Join Us"}
            </h2>
            <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mt-2 italic">Clinical Portal Access</p>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl w-full">
                <p className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center">⚠️ {error}</p>
              </div>
            )}
          </div>

          {/* Role Switcher */}
          <div className="flex bg-gray-50 rounded-xl p-1.5 mb-8 border border-gray-100">
            <button
              type="button" onClick={() => setRole("patient")}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-500 ${
                role === "patient" ? "bg-[#4f6ef7] text-white shadow-lg" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Patient
            </button>
            <button
              type="button" onClick={() => setRole("therapist")}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-500 ${
                role === "therapist" ? "bg-[#5cb338] text-white shadow-lg" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Therapist
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {role === "therapist" && (
                  <div className="flex gap-3 animate-in slide-in-from-top-4 duration-500">
                    <div className="w-20">
                      <select
                        className={`w-full bg-gray-50 border-none rounded-xl px-2 py-3.5 text-xs font-bold text-gray-700 outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                        value={title} onChange={(e) => setTitle(e.target.value)}
                      >
                        <option value="Mr.">Mr.</option><option value="Ms.">Ms.</option><option value="Dr.">Dr.</option><option value="SLP">SLP</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text" placeholder="Clinic Name"
                        className={`w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                        onChange={(e) => setClinicName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <input
                  type="text" placeholder="Full Name" value={fullName} required
                  className={`w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </>
            )}

            <input
              type="email" placeholder="Email Address" value={email} required
              className={`w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password" placeholder="Password" value={password} required
              className={`w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition-all ${ringColor} focus:ring-4 focus:bg-white`}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit" disabled={isSubmitting}
              className={`w-full ${themeColor} text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-xl mt-4 active:scale-95 transition-all duration-300 disabled:opacity-50 text-[10px]`}
            >
              {isSubmitting ? "Syncing..." : (isLogin ? "Sign In" : "Register Now")}
            </button>
          </form>

          <div className="mt-10 text-center text-[10px] font-bold text-gray-400">
            {isLogin ? "Don't have an account? " : "Already registered? "}
            <Link
              to={isLogin ? "/signup" : "/login"}
              className={`font-black ${textColor} hover:underline ml-1 decoration-2 underline-offset-4`}
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