import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react"; // Added icons
import logo from "../../assets/black_logo.svg";

const PatientLayout = () => {
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserName(session.user.user_metadata.full_name || "User");
        setLoading(false);
      } else {
        navigate("/login");
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNav = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close menu on navigation
  };

  const isActive = (path) => location.pathname === path;

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#172554]"></div>
      </div>
    );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] relative overflow-hidden font-sans antialiased">
      {/* MOBILE HEADER - Only visible on small screens */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[100] flex items-center justify-between px-6">
        <img src={logo} alt="Logo" className="h-8" />
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-[#0f172a] text-white rounded-xl shadow-lg"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* SIDEBAR BACKDROP - Blurs the content when menu is open on mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#0f172a]/20 backdrop-blur-sm z-[110] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR - Fixed to prevent white space at bottom */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-[120] w-72 bg-[#0f172a] flex flex-col p-8 transition-transform duration-500 ease-in-out
        lg:translate-x-0 lg:static lg:h-screen
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Sidebar Interior - Dynamic Accents inside sidebar */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center mb-12">
          <img
            src={logo}
            alt="Aqtasy Logo"
            className="h-16 mb-4 brightness-0 invert filter drop-shadow-md"
          />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] text-center">
            Patient Portal
          </span>
        </div>

        <nav className="relative z-10 flex-1 space-y-3 overflow-y-auto no-scrollbar -mx-4 px-4 py-4">
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
            className="w-full flex items-center justify-center gap-3 text-white/50 hover:text-white transition-all duration-300 p-4 rounded-2xl hover:bg-red-500/10 group"
          >
            <LogOut size={16} />
            <span className="font-black text-[10px] uppercase tracking-[0.3em]">
              LOG OUT
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Dynamic Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#172554]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#5cb338]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Content Header - Pushed down on mobile to clear fixed mobile bar */}
        <header className="px-6 lg:px-12 pt-20 lg:pt-12 mb-8 shrink-0 relative z-20">
          <div className="flex justify-between items-center animate-in slide-in-from-top duration-700">
            <div className="bg-white/70 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white shadow-sm flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-[#5cb338] animate-pulse" />
              <h2 className="text-[10px] font-black text-[#172554] uppercase tracking-[0.2em]">
                Verified User:{" "}
                <span className="text-slate-500 ml-1">{userName}</span>
              </h2>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-12 pb-12 relative z-10 no-scrollbar">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`group px-6 py-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 flex items-center gap-5
      ${
        active
          ? "bg-white/15 text-white font-black shadow-[0_12px_24px_rgba(0,0,0,0.3)] ring-1 ring-white/30 translate-x-2"
          : "text-white/70 hover:bg-white/5 hover:text-white hover:translate-x-1"
      }`}
  >
    <div
      className={`w-2 h-2 rounded-full transition-all duration-500 ${
        active
          ? "bg-white shadow-[0_0_12px_white] scale-110"
          : "bg-transparent scale-0"
      }`}
    />

    {/* MAIN NAVIGATION LINKS: 11px */}
    <span className="text-[11px] uppercase tracking-[0.2em] font-black leading-none">
      {label}
    </span>
  </div>
);

export default PatientLayout;
