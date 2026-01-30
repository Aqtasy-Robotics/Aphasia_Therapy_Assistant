import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    title: "Mr.",
    clinic_name: "",
  });

  useEffect(() => {
    fetchTherapistProfile();
  }, []);

  const fetchTherapistProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, title, clinic_name")
        .eq("id", user.id)
        .single();

      // If we find data in the DB, use it. 
      // Otherwise, grab what they typed during Signup from user_metadata
      setProfile({
        full_name: data?.full_name || user.user_metadata?.full_name || "",
        email: user.email || "",
        title: data?.title || user.user_metadata?.title || "Mr.",
        clinic_name: data?.clinic_name || user.user_metadata?.clinic_name || "",
      });

    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Save to Database
      const { error: dbError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          title: profile.title,
          clinic_name: profile.clinic_name, // This matches the new column
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // 2. Sync with Auth Metadata so it updates "Everywhere"
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          full_name: profile.full_name,
          title: profile.title,
          clinic_name: profile.clinic_name
        }
      });

      if (authError) throw authError;

      alert("Professional Settings Synced!");
      window.location.reload(); 

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-black text-[#5cb338] animate-pulse uppercase tracking-[0.2em] text-xs">
      Loading Clinic Profile...
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-700">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-gray-800 tracking-tight">Clinic Settings</h1>
        <p className="text-gray-500 font-medium mt-2 text-lg">Ensure your professional details are up to date</p>
      </header>

      <form onSubmit={handleUpdate} className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-2xl shadow-gray-200/40 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Title</label>
            <select
              className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 font-bold text-gray-700 outline-none focus:bg-white focus:border-green-100 transition-all shadow-inner"
              value={profile.title}
              onChange={(e) => setProfile({ ...profile, title: e.target.value })}
            >
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
              <option value="Dr.">Dr.</option>
              <option value="SLP">SLP</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
            <input
              type="text"
              className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 font-bold text-gray-700 outline-none focus:bg-white focus:border-green-100 transition-all shadow-inner"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Clinic Name</label>
            <input
              type="text"
              placeholder="e.g. Hope Speech Therapy"
              className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 font-bold text-gray-700 outline-none focus:bg-white focus:border-green-100 transition-all shadow-inner"
              value={profile.clinic_name}
              onChange={(e) => setProfile({ ...profile, clinic_name: e.target.value })}
            />
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Professional Email</label>
            <input
              type="email"
              disabled
              className="w-full bg-gray-100 border-2 border-transparent rounded-[1.5rem] px-6 py-5 text-gray-400 font-bold cursor-not-allowed"
              value={profile.email}
            />
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#5cb338] text-white px-14 py-5 rounded-[2rem] font-black shadow-xl shadow-green-100 hover:bg-green-600 active:scale-95 transition-all uppercase tracking-widest text-xs"
          >
            {saving ? "SYNCING..." : "UPDATE CLINIC PROFILE"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;