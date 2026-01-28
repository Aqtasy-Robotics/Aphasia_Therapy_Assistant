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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4f6ef7]"></div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Aqtasy Logo" className="h-12 mb-2" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Patient Portal
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem label="Home" active={isActive('/patient-dashboard')} onClick={() => handleNav("/patient-dashboard")} />
          <NavItem label="My Progress" active={isActive('/patient-progress')} onClick={() => handleNav("/patient-progress")} />
          <NavItem label="My Words" active={isActive('/patient-words')} onClick={() => handleNav("/patient-words")} />
          <NavItem label="My Sessions" active={isActive('/patient-sessions')} onClick={() => handleNav("/patient-sessions")} />
          <NavItem label="Chat" active={isActive('/patient-chat')} onClick={() => handleNav("/patient-chat")} />
          <NavItem label="Profile" active={isActive('/profile')} onClick={() => handleNav("/profile")} />
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 text-gray-400 hover:text-red-500 transition-all p-3 rounded-xl hover:bg-red-50 mt-auto group">
          <span className="font-bold text-sm">Logout</span>
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <h2 className="text-sm font-bold text-[#4f6ef7] bg-blue-50 px-4 py-2 rounded-full">
            Logged in as: {userName}
          </h2>
        </header>

        <Outlet /> 
      </main>
    </div>
  );
};

const NavItem = ({ label, active, onClick }) => (
  <div onClick={onClick} className={`px-4 py-3 rounded-xl cursor-pointer transition-all ${active ? "bg-[#f0f4ff] text-[#4f6ef7] font-bold" : "text-gray-400 hover:bg-gray-50"}`}>
    <span className="text-sm">{label}</span>
  </div>
);

export default PatientLayout;