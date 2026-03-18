import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { User, Shield, HeartPulse, Eye, Bell, Save } from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [_therapists, setTherapists] = useState([]);
  const [profile, setProfile] = useState({
    // Identity
    full_name: "",
    introduction: "", // <-- Maps to the new Supabase column
    email: "",
    date_of_birth: "",
    selected_therapist_id: "",
    aphasia_type: "Broca's Aphasia", // View-only default

    // Caretaker Link (UI Only - unless added to DB)
    caretaker_name: "",
    caretaker_phone: "",

    // Accessibility & Notifications (UI Only)
    high_contrast: false,
    large_text: false,
    session_reminders: true,
    caretaker_cc: true,
  });

  useEffect(() => {
    getProfileAndTherapists();
  }, []);

  const getProfileAndTherapists = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile((prev) => ({ ...prev, ...profileData, email: user.email }));
      }

      const { data: therapistData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("role", "therapist");

      setTherapists(therapistData?.filter((t) => t.full_name) || []);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Clean payload: Only send fields that exist in the Supabase 'profiles' table
      const updatePayload = {
        id: user.id,
        full_name: profile.full_name,
        introduction: profile.introduction,
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from("profiles")
        .upsert(updatePayload);

      if (dbError) throw dbError;
      alert("Settings Synced!");
    } catch (error) {
      alert("Update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center font-black text-[#4f6ef7] animate-pulse uppercase tracking-[0.2em] text-xs">
        Syncing Aqtasy Cloud...
      </div>
    );

  return (
    <div
      className={`max-w-5xl mx-auto pb-32 animate-in fade-in duration-700 ${profile.large_text ? "text-lg" : "text-base"}`}
    >
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">
            Account Settings
          </h1>
          <p className="text-gray-500 font-medium mt-2 italic">
            Manage your profile and accessibility preferences
          </p>
        </div>
        <div className="bg-white/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/60 shadow-sm flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#4f6ef7]" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Secure Caretaker Link
          </span>
        </div>
      </header>

      <form onSubmit={handleUpdate} className="space-y-10">
        {/* 1. PERSONAL & MEDICAL IDENTITY */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl shadow-gray-200/40">
          <SectionHeader icon={<User />} title="Personal Identity" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <div className="md:col-span-2">
              <InputField
                label="Full Name"
                value={profile.full_name}
                onChange={(v) => setProfile({ ...profile, full_name: v })}
              />
            </div>

            {/* NEW: Patient Introduction Bio */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                Introduction Bio
              </label>
              <textarea
                rows="4"
                className="w-full bg-gray-50 rounded-[2rem] px-8 py-5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-50 mt-2 resize-none text-sm"
                value={profile.introduction || ""}
                placeholder="Tell your therapist a little bit about yourself, your hobbies, and your goals..."
                onChange={(e) =>
                  setProfile({ ...profile, introduction: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                Emergency Caretaker Link
              </label>
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-gray-50 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-50"
                  placeholder="Caretaker Name"
                  value={profile.caretaker_name}
                  onChange={(e) =>
                    setProfile({ ...profile, caretaker_name: e.target.value })
                  }
                />
                <input
                  className="flex-1 bg-gray-50 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-50"
                  placeholder="Phone Number"
                  value={profile.caretaker_phone}
                  onChange={(e) =>
                    setProfile({ ...profile, caretaker_phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4">
              <HeartPulse className="text-[#4f6ef7] w-8 h-8" />
              <div>
                <p className="text-[10px] font-black text-[#4f6ef7] uppercase tracking-widest">
                  Optimized For
                </p>
                <p className="text-sm font-black text-gray-700">
                  {profile.aphasia_type}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. VISUAL & ACCESSIBILITY */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/20">
          <SectionHeader icon={<Eye />} title="Visual Accessibility" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <ToggleCard
              label="Large Text Mode"
              description="Increases UI scale for easier reading."
              checked={profile.large_text}
              onChange={(v) => setProfile({ ...profile, large_text: v })}
            />
            <ToggleCard
              label="High Contrast"
              description="Forces black-on-white high visibility look."
              checked={profile.high_contrast}
              onChange={(v) => setProfile({ ...profile, high_contrast: v })}
            />
          </div>
        </section>

        {/* 3. NOTIFICATION PREFERENCES */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/20">
          <SectionHeader icon={<Bell />} title="Notifications" />
          <div className="mt-10 space-y-6">
            <ToggleItem
              label="Session Reminders"
              description="Notify me 15 minutes before my session starts."
              checked={profile.session_reminders}
              onChange={(v) => setProfile({ ...profile, session_reminders: v })}
            />
            <ToggleItem
              label="Caretaker CC"
              description="Send a copy of all session reminders to my caretaker."
              checked={profile.caretaker_cc}
              onChange={(v) => setProfile({ ...profile, caretaker_cc: v })}
            />
          </div>
        </section>

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#4f6ef7] text-white px-12 py-5 rounded-[2.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs"
          >
            {saving ? (
              "SYNCING..."
            ) : (
              <>
                <Save className="w-5 h-5" /> Confirm Account Updates
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

/* --- REUSABLE COMPONENTS --- */

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-3">
    <div className="p-3 bg-blue-50 rounded-2xl text-[#4f6ef7]">{icon}</div>
    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
      {title}
    </h3>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = "" }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
      {label}
    </label>
    <input
      className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-50 transition-all text-sm"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const ToggleCard = ({ label, description, checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all flex flex-col items-center text-center space-y-3 ${checked ? "border-[#4f6ef7] bg-blue-50/30" : "border-gray-50 bg-gray-50/50 hover:bg-gray-50"}`}
  >
    <div
      className={`w-12 h-6 rounded-full relative transition-all ${checked ? "bg-[#4f6ef7]" : "bg-gray-200"}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checked ? "left-7" : "left-1"}`}
      />
    </div>
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-gray-800">
        {label}
      </p>
      <p className="text-[9px] text-gray-400 font-bold mt-1">{description}</p>
    </div>
  </div>
);

const ToggleItem = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100">
    <div>
      <p className="text-xs font-black text-gray-800 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-[10px] text-gray-400 font-medium mt-1">
        {description}
      </p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-14 h-8 rounded-full transition-all relative ${checked ? "bg-[#4f6ef7]" : "bg-gray-200"}`}
    >
      <div
        className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${checked ? "left-7" : "left-1"}`}
      />
    </button>
  </div>
);

export default Profile;
