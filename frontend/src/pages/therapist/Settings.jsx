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
  ShieldCheck
} from "lucide-react";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    title: "Dr.",
    clinic_name: "",
    introduction: "", 
    session_duration: "45",
    telehealth_link: "",
    auto_scale: true,
    tfa_enabled: false,
    auto_record: false,
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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();

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
      <div className="flex h-screen items-center justify-center font-extrabold text-[#012b1d] animate-pulse uppercase tracking-[0.3em] text-[10px]">
        Syncing Aqtasy Cloud...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-700 pb-32 font-sans antialiased">
      
      {/* HEADER SECTION: Open Layout mirroring Dashboard */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-[#012b1d] tracking-tight">
            My Profile
          </h1>
          <p className="text-gray-400 font-semibold mt-2 text-sm italic">
            Configure your digital practice environment
          </p>
        </div>
        <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-sm flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-[#064e3b]" />
          <span className="text-[10px] font-extrabold text-[#012b1d] uppercase tracking-[0.3em] leading-none">
            HIPAA Compliant Session
          </span>
        </div>
      </header>

      <form onSubmit={handleUpdate} className="space-y-12">
        
        {/* 1. PROFESSIONAL PROFILE */}
        <section className="bg-white rounded-[3.5rem] p-12 border border-gray-50 shadow-2xl shadow-gray-200/40">
          <SectionHeader icon={<User size={18} />} title="Professional Identity" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
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

          <div className="mt-10">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6">
              Introduction Bio (Seen by patients)
            </label>
            <textarea
              rows="4"
              className="w-full bg-gray-50/50 border border-transparent rounded-[2.5rem] px-8 py-6 font-semibold text-gray-700 outline-none focus:ring-4 focus:ring-[#012b1d]/5 focus:bg-white focus:border-gray-100 mt-3 resize-none text-sm transition-all"
              value={profile.introduction || ""}
              placeholder="Tell your patients a little bit about yourself and your practice..."
              onChange={(e) =>
                setProfile({ ...profile, introduction: e.target.value })
              }
            />
          </div>
        </section>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-10 border-t border-gray-100">
          <button
            type="button"
            className="text-gray-400 font-extrabold text-[10px] uppercase tracking-[0.3em] hover:text-red-600 transition-colors"
          >
            Request Account Deletion
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#012b1d] text-white px-12 py-5 rounded-[2.5rem] font-extrabold shadow-2xl shadow-[#012b1d]/20 hover:brightness-125 active:scale-95 transition-all flex items-center gap-4 uppercase tracking-[0.2em] text-[11px]"
          >
            {saving ? (
              "SYNCING..."
            ) : (
              <>
                <Save size={18} /> Save Configuration
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
  <div className="flex items-center gap-4">
    <div className="p-3.5 bg-[#064e3b]/10 rounded-2xl text-[#064e3b]">{icon}</div>
    <h3 className="text-[11px] font-extrabold text-[#012b1d] uppercase tracking-[0.3em]">
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
  <div className="space-y-3">
    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6">
      {label}
    </label>
    {type === "select" ? (
      <select
        className="w-full bg-gray-50/50 border border-transparent rounded-[1.5rem] px-8 py-5 font-semibold text-gray-700 outline-none focus:ring-4 focus:ring-[#012b1d]/5 focus:bg-white focus:border-gray-100 transition-all text-sm appearance-none cursor-pointer shadow-inner"
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
        className="w-full bg-gray-50/50 border border-transparent rounded-[1.5rem] px-8 py-5 font-semibold text-gray-700 outline-none focus:ring-4 focus:ring-[#012b1d]/5 focus:bg-white focus:border-gray-100 transition-all text-sm shadow-inner"
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
    className={`p-10 rounded-[2.5rem] border-2 cursor-pointer transition-all flex flex-col items-center text-center space-y-6
      ${checked ? "border-[#012b1d] bg-[#012b1d]/5 shadow-2xl shadow-[#012b1d]/10" : "border-gray-50 bg-gray-50/30 hover:bg-white hover:border-gray-200"}`}
  >
    <div
      className={`p-5 rounded-2xl transition-all ${checked ? "bg-[#012b1d] text-white" : "bg-white text-gray-200 shadow-sm"}`}
    >
      {icon}
    </div>
    <div>
      <p
        className={`text-[11px] font-extrabold uppercase tracking-[0.2em] ${checked ? "text-[#012b1d]" : "text-gray-700"}`}
      >
        {label}
      </p>
      <p className="text-[10px] text-gray-400 font-bold leading-relaxed mt-2 italic">
        {description}
      </p>
    </div>
  </div>
);

const ToggleItem = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-10 bg-gray-50/30 rounded-[2.5rem] border border-gray-100 shadow-inner">
    <div className="max-w-md">
      <p className="text-[11px] font-extrabold text-[#012b1d] uppercase tracking-[0.2em]">
        {label}
      </p>
      <p className="text-sm text-gray-400 font-semibold mt-2 italic">
        {description}
      </p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-16 h-9 rounded-full transition-all relative ${checked ? "bg-[#012b1d]" : "bg-gray-200"}`}
    >
      <div
        className={`absolute top-1 w-7 h-7 bg-white rounded-full transition-all shadow-md ${checked ? "left-8" : "left-1"}`}
      />
    </button>
  </div>
);

export default Settings;