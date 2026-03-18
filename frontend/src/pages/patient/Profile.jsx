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
    // Identity
    full_name: "",
    introduction: "",
    email: "",
    date_of_birth: "",
    selected_therapist_id: "",
    aphasia_type: "Broca's Aphasia",
  });

  // --- Custom Date Picker States ---
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date(1980, 0, 1));

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

      // 1. Fetch current user's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setRole(profileData.role);
        setProfile((prev) => ({ ...prev, ...profileData, email: user.email }));

        if (profileData.date_of_birth) {
          setPickerMonth(new Date(profileData.date_of_birth));
        }

        // 2. Fetch assigned therapist details including clinic_name
        if (
          profileData.role === "patient" &&
          profileData.selected_therapist_id
        ) {
          const { data: therapistData } = await supabase
            .from("profiles")
            .select("full_name, introduction, clinic_name")
            .eq("id", profileData.selected_therapist_id)
            .single();

          if (therapistData) {
            setAssignedTherapist(therapistData);
          }
        }
      }

      const { data: allTherapists } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("role", "therapist");

      setTherapists(allTherapists?.filter((t) => t.full_name) || []);
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

      if (!data || data.length === 0) {
        throw new Error("Update blocked by Supabase RLS.");
      }

      alert("Settings Synced! 🚀");
    } catch (error) {
      alert("Update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Date Picker Logic ---
  const daysInMonth = new Date(
    pickerMonth.getFullYear(),
    pickerMonth.getMonth() + 1,
    0,
  ).getDate();

  const firstDayOfMonth = new Date(
    pickerMonth.getFullYear(),
    pickerMonth.getMonth(),
    1,
  ).getDay();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleCustomDateSelect = (day) => {
    const newDate = new Date(
      pickerMonth.getFullYear(),
      pickerMonth.getMonth(),
      day,
    );
    const offset = newDate.getTimezoneOffset();
    const formattedDate = new Date(newDate.getTime() - offset * 60 * 1000)
      .toISOString()
      .split("T")[0];

    setProfile({ ...profile, date_of_birth: formattedDate });
    setShowDobPicker(false);
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center font-black text-[#4f6ef7] animate-pulse uppercase tracking-[0.2em] text-xs">
        Syncing Aqtasy Cloud...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-700 text-base">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">
            Account Settings
          </h1>
          <p className="text-gray-500 font-medium mt-2 italic">
            Manage your profile and personal information
          </p>
        </div>
      </header>

      <form onSubmit={handleUpdate} className="space-y-10">
        {/* ==========================================
            PERSONAL IDENTITY SECTION
        ========================================== */}
        <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl shadow-gray-200/40">
          <SectionHeader icon={<User />} title="Personal Identity" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <div className="md:col-span-1">
              <InputField
                label="Full Name"
                value={profile.full_name}
                onChange={(v) => setProfile({ ...profile, full_name: v })}
              />
            </div>

            {/* --- CUSTOM ANIMATED DOB PICKER --- */}
            <div className="md:col-span-1 relative">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 block mb-2">
                Date of Birth
              </label>
              <div
                onClick={() => setShowDobPicker(!showDobPicker)}
                className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-gray-700 outline-none transition-all cursor-pointer flex items-center relative shadow-sm"
              >
                <Calendar className="w-4 h-4 text-[#4f6ef7] absolute left-4" />
                {profile.date_of_birth || "Select Date"}
              </div>

              {showDobPicker && (
                <div className="absolute top-[90px] left-0 w-72 bg-white border border-gray-100 shadow-2xl rounded-3xl p-5 z-50 animate-in zoom-in-95 fade-in duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerMonth(
                          new Date(
                            pickerMonth.getFullYear(),
                            pickerMonth.getMonth() - 1,
                            1,
                          ),
                        );
                      }}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-lg">
                      <select
                        className="text-xs font-black text-gray-800 bg-transparent outline-none cursor-pointer appearance-none"
                        value={pickerMonth.getMonth()}
                        onChange={(e) => {
                          e.stopPropagation();
                          setPickerMonth(
                            new Date(
                              pickerMonth.getFullYear(),
                              parseInt(e.target.value),
                              1,
                            ),
                          );
                        }}
                      >
                        {monthNames.map((m, i) => (
                          <option key={m} value={i}>
                            {m.slice(0, 3)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="text-xs font-black text-gray-800 bg-transparent outline-none cursor-pointer appearance-none"
                        value={pickerMonth.getFullYear()}
                        onChange={(e) => {
                          e.stopPropagation();
                          setPickerMonth(
                            new Date(
                              parseInt(e.target.value),
                              pickerMonth.getMonth(),
                              1,
                            ),
                          );
                        }}
                      >
                        {Array.from(
                          { length: 100 },
                          (_, i) => new Date().getFullYear() - i,
                        ).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerMonth(
                          new Date(
                            pickerMonth.getFullYear(),
                            pickerMonth.getMonth() + 1,
                            1,
                          ),
                        );
                      }}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <span
                        key={d}
                        className="text-[9px] font-black text-gray-400"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {[...Array(firstDayOfMonth)].map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const dateStr = new Date(
                        pickerMonth.getFullYear(),
                        pickerMonth.getMonth(),
                        day,
                      );
                      const offset = dateStr.getTimezoneOffset();
                      const formatted = new Date(
                        dateStr.getTime() - offset * 60 * 1000,
                      )
                        .toISOString()
                        .split("T")[0];
                      const isSelected = profile.date_of_birth === formatted;

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomDateSelect(day);
                          }}
                          className={`p-2 text-xs font-bold rounded-xl transition-all ${
                            isSelected
                              ? "bg-[#4f6ef7] text-white shadow-md"
                              : "text-gray-700 hover:bg-blue-50"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                Introduction Bio
              </label>
              <textarea
                rows="4"
                className="w-full bg-gray-50 rounded-[2rem] px-8 py-5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-50 mt-2 resize-none text-sm shadow-sm transition-all"
                value={profile.introduction || ""}
                placeholder="Tell your therapist a little bit about yourself, your hobbies, and your goals..."
                onChange={(e) =>
                  setProfile({ ...profile, introduction: e.target.value })
                }
              />
            </div>

            {/* OPTIMIZED FOR TAG */}
            <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4">
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

        {/* ==========================================
            THERAPIST ASSIGNMENT SECTION (Patients Only)
        ========================================== */}
        {role === "patient" && (
          <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl shadow-gray-200/40">
            <SectionHeader icon={<UserCog />} title="My Clinical Provider" />

            {assignedTherapist ? (
              <div className="mt-8 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 p-8 rounded-[2.5rem] border border-blue-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-white text-[#4f6ef7] rounded-2xl flex items-center justify-center font-black text-2xl border border-blue-100 shadow-sm">
                    {assignedTherapist.full_name?.charAt(0) || "T"}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-800 tracking-tight">
                      {assignedTherapist.full_name}
                    </h4>
                    {/* CLINIC NAME ADDED HERE */}
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <Building2 size={12} />
                      {assignedTherapist.clinic_name || "Independent Clinic"}
                    </p>
                  </div>
                </div>

                <div className="bg-white/60 p-5 rounded-2xl border border-white/80 mt-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Therapist Introduction
                  </p>
                  <p className="text-sm font-medium text-gray-700 leading-relaxed italic">
                    "
                    {assignedTherapist.introduction ||
                      "This therapist hasn't added an introduction yet."}
                    "
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8 bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 text-center flex flex-col items-center">
                <Shield className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-500">
                  You have not been assigned to a clinical provider yet.
                </p>
                <p className="text-xs font-medium text-gray-400 mt-2 max-w-sm">
                  When a therapist assigns you to their roster, their contact
                  information and introduction will appear here.
                </p>
              </div>
            )}
          </section>
        )}

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#4f6ef7] text-white px-12 py-5 rounded-[2.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
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

const InputField = ({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
      {label}
    </label>
    <input
      type={type}
      className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-50 transition-all text-sm shadow-sm"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default Profile;
