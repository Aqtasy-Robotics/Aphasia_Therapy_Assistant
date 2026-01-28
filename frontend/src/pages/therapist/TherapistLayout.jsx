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
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Data comes from the user_metadata we set during signup
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

    // Listen for auth changes (like sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path) => location.pathname === path;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center text-[#5cb338] font-bold">
      Loading Aqtasy Portal...
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <aside className="w-64 bg-white border-r flex flex-col p-6 sticky top-0 h-screen z-10">
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Logo" className="h-12 mb-2" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Therapist Portal
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem label="Dashboard" active={isActive('/dashboard')} onClick={() => navigate('/dashboard')} />
          <NavItem label="My Patients" active={isActive('/therapist-patients')} onClick={() => navigate('/therapist-patients')} />
          <NavItem label="Calendar" active={isActive('/therapist-calendar')} onClick={() => navigate('/therapist-calendar')} />
          <NavItem label="Reports" active={isActive('/therapist-reports')} onClick={() => navigate('/therapist-reports')} />
          <NavItem label="Messages" active={isActive('/therapist-messages')} onClick={() => navigate('/therapist-messages')} />
          <NavItem label="Settings" active={isActive('/therapist-settings')} onClick={() => navigate('/therapist-settings')} />
        </nav>

        <button 
          onClick={handleLogout} 
          className="text-gray-400 hover:text-red-500 font-bold text-sm p-3 mt-auto flex items-center gap-2 transition-all"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-10 ml-2 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet context={{ userData }} />
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`px-4 py-3 rounded-xl cursor-pointer transition-all ${
      active ? "bg-[#f0fff4] text-[#5cb338] font-bold shadow-sm" : "text-gray-400 hover:bg-gray-50"
    }`}
  >
    <span className="text-sm">{label}</span>
  </div>
);

export default TherapistLayout;