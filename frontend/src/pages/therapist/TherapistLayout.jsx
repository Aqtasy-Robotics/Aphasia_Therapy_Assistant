import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import logo from "../../assets/black_logo.svg";

const TherapistLayout = () => {
  const [userData, setUserData] = useState({
    fullName: "Therapist",
    title: "Dr.",
    clinicName: "Aqtasy Clinic",
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUserData({
          fullName: session.user.user_metadata.full_name || "Therapist",
          title: "Dr.",
          clinicName: "Aqtasy Clinic",
        });
      } else {
        navigate("/login");
      }
      setLoading(false);
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

  const isActive = (path) => location.pathname === path;

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        {/* Loading spinner updated to Midnight Emerald */}
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#012b1d]"></div>
      </div>
    );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] relative overflow-hidden font-sans antialiased">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#012b1d]/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#172554]/5 rounded-full blur-[100px] pointer-events-none animate-bounce delay-1000 duration-[10s]"></div>

      {/* SIDEBAR: Midnight Emerald (#012b1d) */}
      <aside className="w-64 bg-[#012b1d] flex flex-col p-8 h-full z-50 shadow-[10px_0_40px_rgba(0,0,0,0.3)] relative">
        
        {/* Vertical glass rim highlight */}
        <div className="absolute inset-y-0 right-0 w-[1px] bg-white/10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center mb-16 transition-transform duration-500 hover:scale-105">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-16 mb-4 brightness-0 invert opacity-100 filter drop-shadow-md" 
          />
          {/* SIDEBAR SUB-HEADER: 10px */}
          <span className="text-[10px] font-extrabold text-white/50 uppercase tracking-[0.4em] text-center">
            Therapist Portal
          </span>
        </div>

        <nav className="relative z-10 flex-1 space-y-5">
          <NavItem
            label="Home"
            active={isActive("/dashboard")}
            onClick={() => navigate("/dashboard")}
          />
          <NavItem
            label="My Patients"
            active={isActive("/therapist-patients")}
            onClick={() => navigate("/therapist-patients")}
          />
          <NavItem
            label="Calendar"
            active={isActive("/therapist-calendar")}
            onClick={() => navigate("/therapist-calendar")}
          />
          <NavItem
            label="Reports"
            active={isActive("/therapist-reports")}
            onClick={() => navigate("/therapist-reports")}
          />
          <NavItem
            label="Messages"
            active={isActive("/therapist-messages")}
            onClick={() => navigate("/therapist-messages")}
          />
          <NavItem
            label="My Profile"
            active={isActive("/therapist-settings")}
            onClick={() => navigate("/therapist-settings")}
          />
        </nav>

        {/* LOGOUT BUTTON SECTION: 10px */}
        <div className="relative z-10 pt-8 mt-auto border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 text-white/50 hover:text-white transition-all duration-300 p-4 rounded-2xl hover:bg-white/10 group border border-transparent hover:border-white/20"
          >
            <span className="font-extrabold text-[10px] uppercase tracking-[0.3em]">
              log out
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full overflow-y-auto p-12 relative z-10">
        <header className="mb-12 flex justify-between items-center animate-in slide-in-from-top duration-700">
          <div className="bg-white/80 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white shadow-lg flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#012b1d] animate-pulse shadow-[0_0_10px_rgba(1,43,29,0.4)]"></div>
            {/* ACTIVE USER BADGE: 10px */}
            <h2 className="text-[10px] font-extrabold text-[#012b1d] uppercase tracking-[0.3em]">
              {userData.title} {userData.fullName} • {userData.clinicName}
            </h2>
          </div>
        </header>

        <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-700 pb-20">
          <Outlet context={{ userData }} />
        </div>
      </main>
    </div>
  );
};

/* Reusable NavItem Component */
const NavItem = ({ label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`group px-6 py-4 rounded-[1.5rem] cursor-pointer transition-all duration-500 ease-out flex items-center gap-5
      ${
        active
          ? "bg-white/15 text-white font-extrabold shadow-[0_12px_24px_rgba(0,0,0,0.3)] ring-1 ring-white/30 translate-x-2"
          : "text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1"
      }`}
  >
    {/* Active Glow Dot */}
    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${active ? 'bg-white shadow-[0_0_12px_white] scale-110' : 'bg-transparent scale-0'}`} />
    
    {/* MAIN NAVIGATION LINKS: 11px */}
    <span className="text-[11px] uppercase tracking-[0.2em] font-extrabold leading-none">
      {label}
    </span>
  </div>
);

export default TherapistLayout;