import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Shield,
  Save,
  User,
  Bell,
  Video,
  Activity,
  Lock,
  Clock,
} from "lucide-react";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    // Professional Profile
    full_name: "",
    title: "Dr.",
    clinic_name: "",
    introduction: "", // <-- Mapped directly to your new database column

    // Clinical Defaults
    session_duration: "45",
    telehealth_link: "",
    auto_scale: true,

    // Data & Privacy
    tfa_enabled: false,
    auto_record: false,

    // Notifications (Milestones & Alerts)
    streak_notifications: true,
    decline_alerts: true,
    dnd_mode: false,
  });

  useEffect(() => {
    fetchTherapistProfile();
  }, []);

  const fetchTherapistProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile({ ...profile, ...data, email: user.email });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // We only send the fields that actually exist in your 'profiles' schema
      const updatePayload = {
        id: user.id,
        full_name: profile.full_name,
        clinic_name: profile.clinic_name,
        introduction: profile.introduction,
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from("profiles")
        .upsert(updatePayload);

      if (dbError) throw dbError;
      alert("Clinical configuration synced successfully!");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center font-black text-[#5cb338] animate-pulse uppercase tracking-[0.2em] text-xs">
        Syncing Aqtasy Cloud...
      </div>
    );

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-700 pb-32">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">
            My Profile
          </h1>
          <p className="text-gray-500 font-medium mt-2 italic">
            Configure your digital practice environment
          </p>
        </div>
        <div className="bg-white/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/60 shadow-sm flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#5cb338]" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
            HIPAA Compliant Session
          </span>
        </div>
      </header>

      <form onSubmit={handleUpdate} className="space-y-12">
        {/* 1. PROFESSIONAL PROFILE */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl shadow-gray-200/40">
          <SectionHeader icon={<User />} title="Professional Identity" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <InputField
              label="Full Name"
              value={profile.full_name}
              onChange={(v) => setProfile({ ...profile, full_name: v })}
            />
            <InputField
              label="Clinic / Hospital"
              value={profile.clinic_name}
              onChange={(v) => setProfile({ ...profile, clinic_name: v })}
            />
          </div>

          <div className="mt-8">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
              Introduction Bio (Seen by patients)
            </label>
            <textarea
              rows="4"
              className="w-full bg-gray-50 rounded-[2rem] px-8 py-5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-50 mt-2 resize-none text-sm"
              value={profile.introduction || ""}
              placeholder="Tell your patients a little bit about yourself and your practice..."
              onChange={(e) =>
                setProfile({ ...profile, introduction: e.target.value })
              }
            />
          </div>
        </section>

        {/* 2. CLINICAL & SESSION DEFAULTS */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/20">
          <SectionHeader icon={<Clock />} title="Session Configuration" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <InputField
              label="Default Duration"
              type="select"
              options={["30 Mins", "45 Mins", "60 Mins"]}
              value={profile.session_duration}
              onChange={(v) => setProfile({ ...profile, session_duration: v })}
            />
            <InputField
              label="Telehealth Link"
              placeholder="https://zoom.us/j/..."
              value={profile.telehealth_link}
              onChange={(v) => setProfile({ ...profile, telehealth_link: v })}
            />
            <div className="md:col-span-2">
              <ToggleItem
                label="Automatic Exercise Scaling"
                description="Difficulty increases automatically if patient accuracy is >90%."
                checked={profile.auto_scale}
                onChange={(v) => setProfile({ ...profile, auto_scale: v })}
              />
            </div>
          </div>
        </section>

        {/* 3. DATA & PRIVACY (SECURITY) */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/20">
          <SectionHeader icon={<Lock />} title="Privacy & Compliance" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <CheckboxCard
              label="2FA Protection"
              description="Secure medical data access."
              icon={<Shield className="w-5 h-5" />}
              checked={profile.tfa_enabled}
              onChange={(v) => setProfile({ ...profile, tfa_enabled: v })}
            />
            <CheckboxCard
              label="Auto-Record Sessions"
              description="Save for clinical progress review."
              icon={<Video className="w-5 h-5" />}
              checked={profile.auto_record}
              onChange={(v) => setProfile({ ...profile, auto_record: v })}
            />
          </div>
        </section>

        {/* 4. ADVANCED NOTIFICATIONS */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/20">
          <SectionHeader icon={<Bell />} title="Clinical Alerts" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <CheckboxCard
              label="Milestones"
              description="Patient hits 7-day streak."
              icon={<Activity className="w-5 h-5" />}
              checked={profile.streak_notifications}
              onChange={(v) =>
                setProfile({ ...profile, streak_notifications: v })
              }
            />
            <CheckboxCard
              label="Decline Alert"
              description="Accuracy drops >20%."
              icon={<Shield className="w-5 h-5" />}
              checked={profile.decline_alerts}
              onChange={(v) => setProfile({ ...profile, decline_alerts: v })}
            />
            <CheckboxCard
              label="DND Mode"
              description="Mute chat after clinic hours."
              icon={<Clock className="w-5 h-5" />}
              checked={profile.dnd_mode}
              onChange={(v) => setProfile({ ...profile, dnd_mode: v })}
            />
          </div>
        </section>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <button
            type="button"
            className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
          >
            Request Account Deletion
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#5cb338] text-white px-12 py-5 rounded-[2.5rem] font-black shadow-xl shadow-green-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs"
          >
            {saving ? (
              "SYNCING..."
            ) : (
              <>
                <Save className="w-5 h-5" /> Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

/* --- REUSABLE SUB-COMPONENTS --- */

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-3">
    <div className="p-3 bg-green-50 rounded-2xl text-[#5cb338]">{icon}</div>
    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
      {title}
    </h3>
  </div>
);

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  options = [],
  placeholder = "",
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
      {label}
    </label>
    {type === "select" ? (
      <select
        className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-50 transition-all text-sm appearance-none cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-50 transition-all text-sm"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
);

const CheckboxCard = ({ label, description, icon, checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all flex flex-col items-center text-center space-y-4
      ${checked ? "border-[#5cb338] bg-[#f0fff4] shadow-lg shadow-green-50" : "border-gray-50 bg-gray-50/50 hover:bg-gray-50"}`}
  >
    <div
      className={`p-4 rounded-2xl transition-all ${checked ? "bg-[#5cb338] text-white" : "bg-white text-gray-300 shadow-sm"}`}
    >
      {icon}
    </div>
    <div>
      <p
        className={`text-xs font-black uppercase tracking-wider ${checked ? "text-[#5cb338]" : "text-gray-700"}`}
      >
        {label}
      </p>
      <p className="text-[9px] text-gray-400 font-bold leading-tight mt-1">
        {description}
      </p>
    </div>
  </div>
);

const ToggleItem = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100">
    <div className="max-w-md">
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
      className={`w-14 h-8 rounded-full transition-all relative ${checked ? "bg-[#5cb338]" : "bg-gray-200"}`}
    >
      <div
        className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${checked ? "left-7" : "left-1"}`}
      />
    </button>
  </div>
);

export default Settings;
