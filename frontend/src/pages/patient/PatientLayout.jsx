import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import logo from "../../assets/black_logo.svg";

const PatientLayout = () => {
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserName(session.user.user_metadata.full_name || "User");
        setLoading(false);
      } else {
        navigate("/login");
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNav = (path) => navigate(path);
  const isActive = (path) => location.pathname === path;

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#172554]"></div>
      </div>
    );

  return (
    /* font-sans will now point to 'Inter' via your tailwind config */
    <div className="flex h-screen w-full bg-[#f8fafc] relative overflow-hidden font-sans antialiased">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#172554]/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#064e3b]/5 rounded-full blur-[100px] pointer-events-none animate-bounce delay-1000 duration-[10s]"></div>

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#172554] flex flex-col p-8 h-full z-50 shadow-[10px_0_40px_rgba(0,0,0,0.2)] relative">
        <div className="absolute inset-y-0 right-0 w-[1px] bg-white/10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center mb-16 transition-transform duration-500 hover:scale-105">
          <img 
            src={logo} 
            alt="Aqtasy Logo" 
            className="h-16 mb-4 brightness-0 invert opacity-100 filter drop-shadow-md" 
          />
          {/* SIDEBAR SUB-HEADER: 10px */}
          <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em] text-center">
            Patient Portal
          </span>
        </div>

        <nav className="relative z-10 flex-1 space-y-5">
          <NavItem
            label="Home"
            active={isActive("/patient-dashboard")}
            onClick={() => handleNav("/patient-dashboard")}
          />
          <NavItem
            label="My Progress"
            active={isActive("/patient-progress")}
            onClick={() => handleNav("/patient-progress")}
          />
          <NavItem
            label="My Words"
            active={isActive("/patient-words")}
            onClick={() => handleNav("/patient-words")}
          />
          <NavItem
            label="My Sessions"
            active={isActive("/patient-sessions")}
            onClick={() => handleNav("/patient-sessions")}
          />
          <NavItem
            label="Chat"
            active={isActive("/patient-chat")}
            onClick={() => handleNav("/patient-chat")}
          />
          <NavItem
            label="My Profile"
            active={isActive("/profile")}
            onClick={() => handleNav("/profile")}
          />
        </nav>

        <div className="relative z-10 pt-8 mt-auto border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 text-white/60 hover:text-white transition-all duration-300 p-4 rounded-2xl hover:bg-white/5 group border border-transparent hover:border-white/20"
          >
            {/* LOGOUT BUTTON: 10px */}
            <span className="font-black text-[10px] uppercase tracking-[0.3em]">
              LOG OUT
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full overflow-y-auto p-12 relative z-10">
        <header className="mb-12 flex justify-between items-center animate-in slide-in-from-top duration-700">
          <div className="bg-white/80 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white shadow-lg flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#172554] animate-pulse shadow-[0_0_8px_rgba(23,37,84,0.3)]"></div>
            {/* ACTIVE USER BADGE: 10px */}
            <h2 className="text-[10px] font-black text-[#172554] uppercase tracking-[0.3em]">
              Active Clinical User: {userName}
            </h2>
          </div>
        </header>

        <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-700 pb-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`group px-6 py-4 rounded-[1.5rem] cursor-pointer transition-all duration-500 ease-out flex items-center gap-5
      ${
        active
          ? "bg-white/15 text-white font-black shadow-[0_12px_24px_rgba(0,0,0,0.3)] ring-1 ring-white/30 translate-x-2"
          : "text-white/70 hover:bg-white/5 hover:text-white hover:translate-x-1"
      }`}
  >
    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${active ? 'bg-white shadow-[0_0_12px_white] scale-110' : 'bg-transparent scale-0'}`} />
    
    {/* MAIN NAVIGATION LINKS: 11px */}
    <span className="text-[11px] uppercase tracking-[0.2em] font-black leading-none">
      {label}
    </span>
  </div>
);

export default PatientLayout;