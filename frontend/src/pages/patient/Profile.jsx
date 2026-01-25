import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Mail, User, Calendar, Phone, Activity, Settings } from "lucide-react";
import profilePlaceholder from "../../assets/taahir.jpeg";

// Profile component for patient personal data and app settings
const Profile = () => {
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "+94 77 123 4567",
    dob: "1985-06-12",
    condition: "Non-fluent Aphasia",
    therapist: "Dr. Emily Chen",
    audioSpeed: "Normal (1x)",
  });
  const [loading, setLoading] = useState(true);

  // Fetches user profile from Firestore on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile((prev) => ({
            ...prev,
            ...docSnap.data(),
            email: user.email,
          }));
        }
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  if (loading)
    return <div className="p-10 text-gray-400">Loading Profile...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
          My Profile
        </h1>
        <p className="text-gray-500 font-medium mt-1">
          Manage your account details and therapy preferences
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-6 mb-10">
            <img
              src={profilePlaceholder}
              alt="Profile"
              className="w-24 h-24 rounded-3xl object-cover border-4 border-blue-50"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {profile.fullName}
              </h2>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] font-bold px-3 py-1 bg-blue-50 text-[#4f6ef7] rounded-full uppercase tracking-wider">
                  Patient ID: AQ-9921
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <ProfileInput
                label="Full Name"
                value={profile.fullName}
                icon={<User size={16} />}
              />
              <ProfileInput
                label="Email Address"
                value={profile.email}
                icon={<Mail size={16} />}
                disabled
              />
            </div>
            <div className="space-y-6">
              <ProfileInput
                label="Phone Number"
                value={profile.phone}
                icon={<Phone size={16} />}
              />
              <ProfileInput
                label="Date of Birth"
                value={profile.dob}
                icon={<Calendar size={16} />}
                type="date"
              />
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-50 flex gap-4">
            <button className="px-8 py-3 bg-[#4f6ef7] text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100">
              Save Changes
            </button>
            <button className="px-8 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Therapist & Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Therapist Info */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="font-bold text-gray-800">Assigned Therapist</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 text-xl font-bold">
              EC
            </div>
            <div>
              <p className="font-bold text-gray-800">{profile.therapist}</p>
              <p className="text-xs text-gray-400 font-medium">
                Speech-Language Pathologist
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable input component for profile fields
const ProfileInput = ({
  label,
  value,
  icon,
  disabled = false,
  type = "text",
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
      {icon} {label}
    </label>
    <input
      type={type}
      defaultValue={value}
      disabled={disabled}
      className={`w-full px-5 py-3 rounded-2xl border-none bg-gray-50 text-gray-700 font-medium transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "focus:ring-2 focus:ring-[#4f6ef7] focus:bg-white"
      }`}
    />
  </div>
);

export default Profile;
