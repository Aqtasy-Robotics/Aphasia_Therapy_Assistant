import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  User,
  Shield,
  HeartPulse,
  Save,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Building2,
} from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [_therapists, setTherapists] = useState([]);
  const [role, setRole] = useState(null);
  const [assignedTherapist, setAssignedTherapist] = useState(null);

  const [profile, setProfile] = useState({
    full_name: "",
    introduction: "",
    email: "",
    date_of_birth: "",
    selected_therapist_id: "",
    aphasia_type: "Broca's Aphasia",
  });

  const [showDobPicker, setShowDobPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date(1980, 0, 1));

  useEffect(() => {
    getProfileAndTherapists();
  }, []);

  const getProfileAndTherapists = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setRole(profileData.role);
        setProfile((prev) => ({ ...prev, ...profileData, email: user.email }));
        if (profileData.date_of_birth) setPickerMonth(new Date(profileData.date_of_birth));

        if (profileData.role === "patient" && profileData.selected_therapist_id) {
          const { data: therapistData } = await supabase
            .from("profiles")
            .select("full_name, introduction, clinic_name")
            .eq("id", profileData.selected_therapist_id)
            .single();

          if (therapistData) setAssignedTherapist(therapistData);
        }
      }

      const { data: allTherapists } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("role", "therapist");

      setTherapists(allTherapists?.filter((t) => t.full_name) || []);
    } catch (error) {
      console.error("Error:", error.message);
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
        introduction: profile.introduction,
        date_of_birth: profile.date_of_birth || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: dbError } = await supabase
        .from("profiles")
        .upsert(updatePayload)
        .select();

      if (dbError) throw dbError;
      alert("Account Cloud Synced! ☁️");
    } catch (error) {
      alert("Update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const handleCustomDateSelect = (day) => {
    const newDate = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
    const offset = newDate.getTimezoneOffset();
    const formattedDate = new Date(newDate.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
    setProfile({ ...profile, date_of_birth: formattedDate });
    setShowDobPicker(false);
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center font-extrabold text-[#172554] animate-pulse uppercase tracking-[0.3em] text-[10px]">
        Syncing Aqtasy Cloud...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-700 font-sans antialiased">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">Account Settings</h1>
        <p className="text-gray-500 font-semibold mt-2 text-sm italic">Manage your clinical profile and identity</p>
      </header>

      <form onSubmit={handleUpdate} className="space-y-12">
        {/* PERSONAL IDENTITY */}
        <section className="bg-white rounded-[3.5rem] p-10 border border-gray-50 shadow-2xl shadow-gray-200/40">
          <SectionHeader icon={<User size={20} />} title="Personal Identity" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <InputField
              label="Full Name"
              value={profile.full_name}
              onChange={(v) => setProfile({ ...profile, full_name: v })}
            />

            <div className="relative">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] ml-4 block mb-3">
                Date of Birth
              </label>
              <div
                onClick={() => setShowDobPicker(!showDobPicker)}
                className="w-full bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 rounded-2xl pl-12 pr-4 py-5 text-sm font-bold text-gray-700 transition-all cursor-pointer flex items-center relative"
              >
                <Calendar className="w-4 h-4 text-[#172554] absolute left-5" />
                {profile.date_of_birth || "Select Clinical DOB"}
              </div>

              {showDobPicker && (
                <div className="absolute top-[100px] left-0 w-80 bg-white border border-gray-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] rounded-[2rem] p-6 z-50 animate-in zoom-in-95 fade-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft size={18} /></button>
                    <div className="flex items-center gap-1">
                      <select className="text-[10px] font-extrabold text-[#172554] bg-gray-50 px-2 py-1 rounded-lg outline-none" value={pickerMonth.getMonth()} onChange={(e) => setPickerMonth(new Date(pickerMonth.getFullYear(), parseInt(e.target.value), 1))}>
                        {monthNames.map((m, i) => <option key={m} value={i}>{m.slice(0, 3)}</option>)}
                      </select>
                      <select className="text-[10px] font-extrabold text-[#172554] bg-gray-50 px-2 py-1 rounded-lg outline-none" value={pickerMonth.getFullYear()} onChange={(e) => setPickerMonth(new Date(parseInt(e.target.value), pickerMonth.getMonth(), 1))}>
                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight size={18} /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                    {["S", "M", "T", "W", "T", "F", "S"].map(d => <span key={d} className="text-[9px] font-black text-gray-300 uppercase">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {[...Array(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay())].map((_, i) => <div key={i} />)}
                    {[...Array(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate())].map((_, i) => {
                      const day = i + 1;
                      const dateStr = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
                      const isSelected = profile.date_of_birth === new Date(dateStr.getTime() - dateStr.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                      return (
                        <button key={day} type="button" onClick={() => handleCustomDateSelect(day)} className={`p-2.5 text-[10px] font-extrabold rounded-xl transition-all ${isSelected ? "bg-[#172554] text-white shadow-lg" : "text-gray-600 hover:bg-[#172554]/5"}`}>{day}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] ml-4">Introduction Bio</label>
              <textarea
                rows="4"
                className="w-full bg-gray-50 hover:bg-white border border-transparent focus:border-gray-100 rounded-[2.5rem] px-8 py-6 font-semibold text-gray-700 outline-none focus:ring-4 focus:ring-[#172554]/5 mt-3 resize-none text-sm transition-all shadow-sm"
                value={profile.introduction || ""}
                placeholder="Share a bit about your journey, hobbies, and goals..."
                onChange={(e) => setProfile({ ...profile, introduction: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 bg-[#064e3b]/5 p-8 rounded-[2.5rem] border border-[#064e3b]/10 flex items-center gap-6">
              <div className="p-4 bg-white rounded-2xl shadow-sm"><HeartPulse className="text-[#064e3b] w-8 h-8" /></div>
              <div>
                <p className="text-[10px] font-extrabold text-[#064e3b] uppercase tracking-[0.3em]">Optimized Therapy For</p>
                <p className="text-lg font-extrabold text-gray-800">{profile.aphasia_type}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CLINICAL PROVIDER SECTION */}
        {role === "patient" && (
          <section className="bg-white rounded-[3.5rem] p-10 border border-gray-50 shadow-2xl shadow-gray-200/40">
            <SectionHeader icon={<UserCog size={20} />} title="My Clinical Provider" />
            {assignedTherapist ? (
              <div className="mt-10 bg-gray-50 p-10 rounded-[3rem] border border-gray-100 flex flex-col md:flex-row gap-10 items-center">
                <div className="w-24 h-24 bg-[#172554] text-white rounded-[2rem] flex items-center justify-center font-extrabold text-4xl shadow-2xl shadow-[#172554]/20">
                  {assignedTherapist.full_name?.charAt(0)}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-2xl font-extrabold text-gray-800 tracking-tight">{assignedTherapist.full_name}</h4>
                    <p className="text-[10px] font-extrabold text-[#172554] uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                      <Building2 size={14} /> {assignedTherapist.clinic_name || "Independent Specialist"}
                    </p>
                  </div>
                  <div className="bg-white/80 p-6 rounded-2xl italic border border-white">
                    <p className="text-sm font-semibold text-gray-600 leading-relaxed">"{assignedTherapist.introduction || "Your specialist is ready to begin your clinical journey."}"</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-10 bg-gray-50 p-16 rounded-[3rem] border border-gray-100 text-center flex flex-col items-center">
                <Shield className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">Status: Awaiting Assignment</p>
              </div>
            )}
          </section>
        )}

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#172554] text-white px-14 py-6 rounded-[2.5rem] font-extrabold shadow-2xl shadow-[#172554]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-4 uppercase tracking-[0.2em] text-[11px] disabled:opacity-50"
          >
            {saving ? "SYNCING..." : <><Save className="w-5 h-5" /> Confirm Account Updates</>}
          </button>
        </div>
      </form>
    </div>
  );
};

/* REUSABLE HELPERS */
const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-4">
    <div className="p-4 bg-[#172554]/5 rounded-2xl text-[#172554]">{icon}</div>
    <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">{title}</h3>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = "", type = "text" }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] ml-4">{label}</label>
    <input
      type={type}
      className="w-full bg-gray-50 hover:bg-white border border-transparent focus:border-gray-100 rounded-2xl px-8 py-5 font-bold text-gray-800 outline-none focus:ring-4 focus:ring-[#172554]/5 transition-all text-sm shadow-sm"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default Profile;