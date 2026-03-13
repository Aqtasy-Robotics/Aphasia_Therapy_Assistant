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
      const { data: {session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserName(session.user.user_metadata.full_name || "User");
        setLoading(false);
      } else {
        navigate("/login");
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNav = (path) => navigate(path);
  const isActive = (path) => location.pathname === path;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4f6ef7]"></div>
    </div>
  );

  return (
    /* THE FIX: 'h-screen' and 'overflow-hidden' on the wrapper 
       ensures the page itself doesn't scroll, only the main content does.
    */
    <div className="flex h-screen w-full bg-[#f8fafc] relative overflow-hidden">
      
      {/* Background blobs for glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4f6ef7]/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#5cb338]/5 rounded-full blur-[100px] pointer-events-none animate-bounce delay-1000 duration-[10s]"></div>

      {/* SIDEBAR: Stationary at all costs */}
      <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 flex flex-col p-6 h-full z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-500">
        <div className="flex flex-col items-center mb-10 transition-transform duration-500 hover:scale-105">
          <img src={logo} alt="Aqtasy Logo" className="h-12 mb-2" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Patient Portal
          </span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem label="Home" active={isActive('/patient-dashboard')} onClick={() => handleNav("/patient-dashboard")} />
          <NavItem label="My Progress" active={isActive('/patient-progress')} onClick={() => handleNav("/patient-progress")} />
          <NavItem label="My Words" active={isActive('/patient-words')} onClick={() => handleNav("/patient-words")} />
          <NavItem label="My Sessions" active={isActive('/patient-sessions')} onClick={() => handleNav("/patient-sessions")} />
          <NavItem label="Chat" active={isActive('/patient-chat')} onClick={() => handleNav("/patient-chat")} />
          <NavItem label="Profile" active={isActive('/profile')} onClick={() => handleNav("/profile")} />
        </nav>

        <button 
          onClick={handleLogout} 
          className="flex items-center justify-center gap-3 text-gray-400 hover:text-red-500 transition-all duration-300 p-3 rounded-xl hover:bg-red-50/50 hover:backdrop-blur-md mt-auto group border border-transparent hover:border-red-100/50 shadow-sm hover:shadow-red-100/20"
        >
          <span className="font-black text-[10px] uppercase tracking-widest">Logout</span>
        </button>
      </aside>

      {/* MAIN CONTENT: The only part that scrolls */}
      <main className="flex-1 h-full overflow-y-auto p-10 relative z-10 transition-all duration-500">
        <header className="mb-10 flex justify-between items-center animate-in slide-in-from-top duration-700">
          <div className="bg-white/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/60 shadow-sm flex items-center gap-3 hover:bg-white/60 transition-colors duration-500">
            <div className="w-2 h-2 rounded-full bg-[#4f6ef7] animate-pulse"></div>
            <h2 className="text-[10px] font-black text-[#4f6ef7] uppercase tracking-[0.15em]">
              Logged in: {userName}
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
    className={`group px-4 py-3 rounded-2xl cursor-pointer transition-all duration-500 ease-out flex items-center gap-3
      ${active 
        ? "bg-white/60 backdrop-blur-md shadow-[0_8px_16px_rgba(79,110,247,0.08)] text-[#4f6ef7] font-black ring-1 ring-white/80 translate-x-2" 
        : "text-gray-400 hover:bg-white/40 hover:backdrop-blur-sm hover:text-gray-600 hover:translate-x-1"
      }`}
  >
    <span className="text-[11px] uppercase tracking-[0.1em] font-black">{label}</span>
  </div>
);

export default PatientLayout;