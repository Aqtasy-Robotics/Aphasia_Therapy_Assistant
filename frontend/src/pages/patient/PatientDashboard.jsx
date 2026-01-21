import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import ProgressChart from "../../components/ProgressChart";
import logo from "../../assets/black_logo.svg";

const PatientDashboard = () => {
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserName(docSnap.data().fullName);
        setLoading(false);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleNav = (path) => navigate(path);
  const isActive = (path) => location.pathname === path;

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
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

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 space-y-1">
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
            label="Profile"
            active={isActive("/profile")}
            onClick={() => handleNav("/profile")}
          />
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-400 hover:text-red-500 transition-all p-3 rounded-xl hover:bg-red-50 group mt-auto"
        >
          <span className="font-bold text-sm">Logout</span>
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-gray-500 mt-1 font-medium">
              Here's how you're doing this week
            </p>
          </div>
          <div className="text-sm font-bold text-[#4f6ef7] bg-blue-50 px-4 py-2 rounded-full">
            Patient Account
          </div>
        </header>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-8">
            Therapy Progress
          </h2>
          <ProgressChart />
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`px-4 py-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
      active
        ? "bg-[#f0f4ff] text-[#4f6ef7] font-bold"
        : "text-gray-400 hover:bg-gray-50"
    }`}
  >
    <span className="text-sm">{label}</span>
  </div>
);

export default PatientDashboard;
