import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Camera, Shield, Save, User, Briefcase, FileText, Bell, Check } from "lucide-react";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    title: "Mr.",
    clinic_name: "",
    specialization: "",
    bio: "",
    // Notification Preferences
    email_alerts: false,
    session_reminders: false,
    system_updates: false
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
        .select("full_name, title, clinic_name, specialization, bio, email_alerts, session_reminders, system_updates")
        .eq("id", user.id)
        .single();

      setProfile({
        full_name: data?.full_name || user.user_metadata?.full_name || "",
        email: user.email || "",
        title: data?.title || user.user_metadata?.title || "Mr.",
        clinic_name: data?.clinic_name || user.user_metadata?.clinic_name || "",
        specialization: data?.specialization || "",
        bio: data?.bio || "",
        email_alerts: data?.email_alerts || false,
        session_reminders: data?.session_reminders || false,
        system_updates: data?.system_updates || false,
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

      const { error: dbError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;
      alert("Professional Settings & Preferences Synced!");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-black text-[#5cb338] animate-pulse uppercase tracking-[0.2em] text-xs">
      Syncing Aqtasy Cloud...
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Clinic Settings</h1>
          <p className="text-gray-500 font-medium mt-2">Personalize your therapeutic environment</p>
        </div>
        <div className="hidden md:flex bg-gray-100 px-4 py-2 rounded-2xl items-center gap-2">
          <Shield className="w-4 h-4 text-[#5cb338]" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Encrypted Data</span>
        </div>
      </header>

      <form onSubmit={handleUpdate} className="space-y-8">
        
        {/* PROFILE SECTION */}
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl shadow-gray-200/40 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="flex flex-col items-center border-r border-gray-50 pr-6">
            <div className="relative group">
              <div className="w-32 h-32 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                {profile.full_name ? (
                  <span className="text-3xl font-black text-[#5cb338]">{profile.full_name.charAt(0)}</span>
                ) : (
                  <User className="w-12 h-12 text-gray-200" />
                )}
              </div>
              <button type="button" className="absolute bottom-0 right-0 bg-white p-2 rounded-xl shadow-md border border-gray-100 hover:text-[#5cb338] transition-all">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Therapist Profile</p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Title" type="select" options={["Mr.", "Ms.", "Dr.", "SLP"]} value={profile.title} onChange={(v) => setProfile({...profile, title: v})} />
            <InputField label="Full Name" placeholder="Not set..." value={profile.full_name} onChange={(v) => setProfile({...profile, full_name: v})} />
            <InputField label="Specialization" placeholder="e.g. Aphasia Expert" value={profile.specialization} onChange={(v) => setProfile({...profile, specialization: v})} />
            <InputField label="Clinic Name" placeholder="Assign clinic..." value={profile.clinic_name} onChange={(v) => setProfile({...profile, clinic_name: v})} />
          </div>
        </div>

        {/* BIO SECTION */}
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/20 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-[#5cb338]" />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Professional Bio</h3>
          </div>
          <textarea 
            rows="3"
            placeholder="Approach and clinical background..."
            className="w-full bg-gray-50 border-none rounded-[2rem] px-8 py-6 font-bold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-green-50 transition-all text-sm resize-none"
            value={profile.bio}
            onChange={(e) => setProfile({...profile, bio: e.target.value})}
          />
        </div>

        {/* NOTIFICATION PREFERENCES SECTION */}
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/20">
          <div className="flex items-center gap-2 mb-8">
            <Bell className="w-4 h-4 text-[#5cb338]" />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notification Preferences</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CheckboxItem 
              label="Email Alerts" 
              description="Receive session summaries via email."
              checked={profile.email_alerts} 
              onChange={(val) => setProfile({...profile, email_alerts: val})}
            />
            <CheckboxItem 
              label="Session Reminders" 
              description="Get notified before sessions start."
              checked={profile.session_reminders} 
              onChange={(val) => setProfile({...profile, session_reminders: val})}
            />
            <CheckboxItem 
              label="System Updates" 
              description="New features for Waabi robot."
              checked={profile.system_updates} 
              onChange={(val) => setProfile({...profile, system_updates: val})}
            />
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#5cb338] text-white px-12 py-5 rounded-[2rem] font-black shadow-xl shadow-green-100 hover:bg-green-600 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs"
          >
            {saving ? "SYNCING..." : <><Save className="w-4 h-4" /> Save Professional Profile</>}
          </button>
        </div>
      </form>
    </div>
  );
};

/* REUSABLE SUB-COMPONENTS */

const InputField = ({ label, value, onChange, type = "text", options = [], placeholder = "" }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{label}</label>
    {type === "select" ? (
      <select className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-green-50 transition-all text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : (
      <input type={type} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-green-50 transition-all text-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )}
  </div>
);

const CheckboxItem = ({ label, description, checked, onChange }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col items-center text-center space-y-3
      ${checked ? 'border-[#5cb338] bg-[#f0fff4]' : 'border-gray-50 bg-gray-50/50 hover:bg-gray-50'}`}
  >
    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
      ${checked ? 'bg-[#5cb338] border-[#5cb338]' : 'border-gray-200 bg-white'}`}>
      {checked && <Check className="w-4 h-4 text-white stroke-[4px]" />}
    </div>
    <div>
      <p className={`text-xs font-black uppercase tracking-wider ${checked ? 'text-[#5cb338]' : 'text-gray-600'}`}>
        {label}
      </p>
      <p className="text-[9px] text-gray-400 font-bold leading-tight mt-1">{description}</p>
    </div>
  </div>
);

export default Settings;