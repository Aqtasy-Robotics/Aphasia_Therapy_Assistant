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

      // 1. Fetch current user profile from the database
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          email: user.email || "", 
          date_of_birth: profileData.date_of_birth || "",
          selected_therapist_id: profileData.selected_therapist_id || "",
        });
      }

      // 2. Fetch all therapists for the dropdown
      const { data: therapistData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("role", "therapist"); 

      setTherapists(therapistData?.filter(t => t.full_name) || []);

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
      if (!user) throw new Error("No active session found");

      // STEP 1: Update the permanent Database table
      const { error: dbError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          date_of_birth: profile.date_of_birth || null, 
          selected_therapist_id: profile.selected_therapist_id || null, 
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // STEP 2: Update Auth Metadata (The "Everywhere" Fix)
      // This updates the identity card the user carries around the app
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: profile.full_name }
      });

      if (authError) throw authError;

      alert("Profile updated successfully! Refreshing to sync changes...");
      
      // Forces a reload to make sure the Sidebar and Header see the new metadata
      window.location.reload();

    } catch (error) {
      alert("Update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-[400px] items-center justify-center font-bold text-[#4f6ef7] animate-pulse uppercase tracking-widest text-xs">
      Syncing Aqtasy Profile...
    </div>
  );

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-gray-800 tracking-tight">My Profile</h1>
        <p className="text-gray-500 font-medium mt-2">Manage your personal and clinical account settings</p>
      </header>

      <form onSubmit={handleUpdate} className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-2xl shadow-gray-200/40 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Full Name</label>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 font-bold text-gray-700 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Email Account</label>
            <input
              type="email"
              disabled
              className="w-full bg-gray-100 border-2 border-transparent rounded-[1.5rem] px-6 py-5 text-gray-400 cursor-not-allowed font-bold"
              value={profile.email}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Date of Birth</label>
            <input
              type="date"
              className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 font-bold text-gray-700 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none"
              value={profile.date_of_birth}
              onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Assigned Specialist</label>
            <div className="relative">
              <select
                className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 font-bold text-gray-700 appearance-none focus:bg-white focus:border-blue-100 outline-none transition-all disabled:opacity-50"
                value={profile.selected_therapist_id}
                onChange={(e) => setProfile({ ...profile, selected_therapist_id: e.target.value })}
                disabled={therapists.length === 0}
              >
                <option value="">Select a Therapist</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="group relative bg-[#4f6ef7] text-white px-14 py-5 rounded-[2rem] font-black shadow-xl shadow-blue-200/50 hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 tracking-widest text-xs"
          >
            {saving ? "SAVING CHANGES..." : "CONFIRM UPDATES"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;