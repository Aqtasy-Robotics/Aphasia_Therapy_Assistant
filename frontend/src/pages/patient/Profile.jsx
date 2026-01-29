import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [therapists, setTherapists] = useState([]);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    date_of_birth: "",
    selected_therapist_id: "",
  });

  useEffect(() => {
    getProfileAndTherapists();
  }, []);

  const getProfileAndTherapists = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // 1. Fetch current user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          email: user.email || "", 
          date_of_birth: profileData.date_of_birth || "",
          selected_therapist_id: profileData.selected_therapist_id || "",
        });
      }

      // 2. Fetch all available therapists
      const { data: therapistData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .or('role.eq.therapist,role.eq.Therapist'); 

      setTherapists(therapistData || []);
    } catch (error) {
      console.error("Error loading profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // We use .update() instead of .upsert() here for more precise control
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          date_of_birth: profile.date_of_birth,
          selected_therapist_id: profile.selected_therapist_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      alert("Profile successfully updated!");
    } catch (error) {
      alert("Error updating profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-[400px] items-center justify-center font-bold text-[#4f6ef7] animate-pulse">
      Loading your Aqtasy Profile...
    </div>
  );

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">My Profile</h1>
        <p className="text-gray-500 font-medium">Manage your clinical details and account preferences</p>
      </header>

      <form onSubmit={handleUpdate} className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium text-gray-700"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          {/* Email (Disabled) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <input
              type="email"
              disabled
              className="w-full bg-gray-100 border-2 border-transparent rounded-2xl px-5 py-4 text-gray-400 cursor-not-allowed font-medium"
              value={profile.email}
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Date of Birth</label>
            <input
              type="date"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium text-gray-700"
              value={profile.date_of_birth}
              onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
            />
          </div>

          {/* Therapist Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Assigned Therapist</label>
            <div className="relative">
              <select
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium text-gray-700 appearance-none cursor-pointer"
                value={profile.selected_therapist_id}
                onChange={(e) => setProfile({ ...profile, selected_therapist_id: e.target.value })}
              >
                <option value="">Choose a therapist...</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                ▼
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-50 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="group relative bg-[#4f6ef7] text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200/50 hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className={saving ? "opacity-0" : "opacity-100"}>
              Save All Changes
            </span>
            {saving && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;