import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import ProgressChart from "../components/ProgressChart";
import logo from "../assets/black_logo.svg";

const PatientDashboard = () => {
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserName(docSnap.data().fullName); // Dynamically set the Full Name
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        navigate("/login"); // Redirect if not authenticated
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth); // Clear Firebase session
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4f6ef7]"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar Section */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Aqtasy Logo" className="h-12 mb-2" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Patient Portal
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem
            label="Home"
            active
            onClick={() => navigate("/patient-dashboard")}
          />
          <NavItem label="My Progress" onClick={() => {}} />
          <NavItem label="My Words" onClick={() => {}} />
          <NavItem label="Sessions" onClick={() => {}} />
          <NavItem label="Profile" onClick={() => {}} />
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-400 hover:text-red-500 transition-all p-3 rounded-xl hover:bg-red-50 group mt-auto"
        >
          <span className="font-bold text-sm">Logout</span>
        </button>
      </aside>

      {/* Main Content Area */}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Words Mastered"
            value="24"
            sub="+6 this week"
            color="border-blue-500"
          />
          <StatCard
            title="Session Time"
            value="1.5h"
            sub="Next session tomorrow"
            color="border-green-500"
          />
          <StatCard
            title="Daily Streak"
            value="12"
            sub="Keep the momentum!"
            color="border-orange-500"
          />
        </div>

        {/* Chart Section */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Therapy Progress
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Average speech accuracy (%)
              </p>
            </div>
          </div>
          <ProgressChart />
        </div>
      </main>
    </div>
  );
};

// Reusable Sub-components
const NavItem = ({ label, active = false, onClick }) => (
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

const StatCard = ({ title, value, sub, color }) => (
  <div
    className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color} hover:shadow-md transition-shadow`}
  >
    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
      {title}
    </p>
    <h3 className="text-4xl font-bold text-gray-800">{value}</h3>
    <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
  </div>
);

export default PatientDashboard;
