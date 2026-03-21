import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import logo from "../../assets/black_logo.svg";

const TherapistLayout = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
        setUserData({
          fullName: session.user.user_metadata.full_name || "User",
          clinicName: "Unknown Clinic",
          role: "therapist",
        });
      } else {
        setUserData({
          fullName: profile.full_name,
          clinicName: profile.clinic_name,
          role: profile.role,
        });
      }
      setLoading(false);
    };

    getProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleNav = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#012b1d]"></div>
      </div>
    );

    return (
      <div 
        className="flex h-screen w-full bg-cover bg-center bg-fixed font-sans antialiased text-slate-900 overflow-hidden"
        style={{ backgroundImage: "url('/backgroundpic.jpg')"}}
      >
        {/* MOBILE HEADER */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[100] flex items-center justify-between px-6">
        <img src={logo} alt="Logo" className="h-8" />
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-[#012b1d] text-white rounded-xl shadow-lg"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* FIXED SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-[120] w-72 bg-[#012b1d] flex flex-col transition-transform duration-500 ease-in-out lg:translate-x-0 lg:static lg:h-full ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-8">
          <img
            src={logo}
            alt="Logo"
            className="h-16 mb-4 brightness-0 invert filter drop-shadow-md"
          />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
            Therapist Portal
          </span>
        </div>

        <nav className="relative z-10 flex-1 px-6 space-y-3 overflow-y-auto no-scrollbar py-4">
          <NavItem
            label="Home"
            active={isActive("/dashboard")}
            onClick={() => handleNav("/dashboard")}
          />
          <NavItem
            label="My Patients"
            active={isActive("/therapist-patients")}
            onClick={() => handleNav("/therapist-patients")}
          />
          <NavItem
            label="Agent pipeline"
            active={isActive("/therapist-agent-pipeline")}
            onClick={() => handleNav("/therapist-agent-pipeline")}
          />
          <NavItem
            label="Calendar"
            active={isActive("/therapist-calendar")}
            onClick={() => handleNav("/therapist-calendar")}
          />
          <NavItem
            label="Reports"
            active={isActive("/therapist-reports")}
            onClick={() => handleNav("/therapist-reports")}
          />
          <NavItem
            label="Messages"
            active={isActive("/therapist-messages")}
            onClick={() => handleNav("/therapist-messages")}
          />
          <NavItem
            label="My Profile"
            active={isActive("/therapist-settings")}
            onClick={() => handleNav("/therapist-settings")}
          />
        </nav>

        <div className="relative z-10 p-8 border-t border-white/10 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 text-white/50 hover:text-white p-4 rounded-2xl hover:bg-red-500/10"
          >
            <LogOut size={16} />
            <span className="font-black text-[10px] uppercase tracking-[0.3em]">
              LOG OUT
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="px-6 lg:px-12 pt-20 lg:pt-12 mb-4 shrink-0 relative z-20">
          <div className="bg-white/70 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white shadow-sm inline-flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-[#5cb338] animate-pulse" />
            <h2 className="text-[10px] font-black text-[#012b1d] uppercase tracking-[0.2em]">
              Verified User:{" "}
              <span className="text-slate-500 ml-1">{userData?.fullName}</span>
            </h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 lg:px-12 pb-12 relative z-10 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* Pass userData down to Dashboard and Profile */}
            <Outlet context={{ userData }} />
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

export default TherapistLayout;
