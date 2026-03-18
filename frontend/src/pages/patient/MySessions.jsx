import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Clock,
  Trash2,
  AlertCircle,
  Loader2,
  UserPlus,
  Target,
  MessageSquare,
  Calendar,
  Activity,
  ArrowRight,
} from "lucide-react";

const MySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [unassignedPatients, setUnassignedPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // 1. Check user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || "patient";
      setRole(userRole);

      if (userRole === "patient") {
        // --- PATIENT VIEW DATA ---
        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("patient_id", user.id)
          .order("session_date", { ascending: true })
          .order("session_time", { ascending: true });

        setSessions(data || []);
      } else if (userRole === "therapist") {
        // --- THERAPIST VIEW DATA ---
        const { data: unassigned } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "patient")
          .is("selected_therapist_id", null);

        setUnassignedPatients(unassigned || []);

        const { data: myPatients } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("selected_therapist_id", user.id);

        const patientMap = {};
        myPatients?.forEach((p) => (patientMap[p.id] = p.full_name));

        const { data: therapistSessions } = await supabase
          .from("sessions")
          .select("*")
          .eq("therapist_id", user.id)
          .order("session_date", { ascending: true });

        const sessionsWithNames =
          therapistSessions?.map((s) => ({
            ...s,
            patientName: patientMap[s.patient_id] || "Unknown Patient",
          })) || [];

        setSessions(sessionsWithNames);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (
      window.confirm("Are you sure you want to cancel this therapy session?")
    ) {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) {
        alert("Could not cancel session: " + error.message);
      } else {
        fetchInitialData();
      }
    }
  };

  const handleClaimPatient = async (patientId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .update({ selected_therapist_id: currentUser.id })
        .eq("id", patientId);

      if (error) throw error;
      alert("Patient successfully assigned to you!");
      fetchInitialData();
    } catch (err) {
      alert("Error claiming patient: " + err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-blue-600 animate-pulse flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#5cb338]" />
        <span className="text-xs uppercase tracking-widest text-gray-400">
          Syncing Clinical Database...
        </span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* ==========================================
          THERAPIST VIEW
      ========================================== */}
      {role === "therapist" ? (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-gray-800 tracking-tight">
                Session Command Center
              </h1>
              <p className="text-gray-500 font-medium mt-2 text-sm">
                Manage incoming patients and monitor your active clinical queue.
              </p>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <Activity className="text-blue-500 w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-600">
                {sessions.length} Active Sessions
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Unassigned Patients */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <UserPlus size={16} className="text-orange-400" />
                Unassigned Patients
              </h2>

              <div className="bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {unassignedPatients.length > 0 ? (
                  unassignedPatients.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                    >
                      <p className="font-black text-gray-800">{p.full_name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1 mb-4">
                        {p.clinic_name || "Independent Patient"}
                      </p>
                      <button
                        onClick={() => handleClaimPatient(p.id)}
                        className="w-full bg-orange-50 text-orange-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        Claim Patient <ArrowRight size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-xs text-gray-400 font-bold italic">
                      Queue is clear.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Upcoming Sessions Grid */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} className="text-[#5cb338]" />
                Upcoming Schedule
              </h2>

              {sessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 inline-block">
                              {s.difficulty_level?.[0] || "Medium"}
                            </span>
                            <h3 className="font-black text-gray-800 text-lg">
                              {s.patientName}
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-3 mt-4">
                          <div className="flex gap-2">
                            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                            <p className="text-xs font-bold text-gray-600">
                              {s.session_date} @ {s.session_time}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Target className="w-4 h-4 text-[#5cb338] shrink-0" />
                            <p className="text-xs font-bold text-gray-600 truncate">
                              {s.target_words?.length || 0} Targets Set
                            </p>
                          </div>

                          {s.therapy_goal && (
                            <div className="bg-gray-50 p-3 rounded-xl mt-4">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Current Goal
                              </p>
                              <p className="text-xs font-medium text-gray-700 italic line-clamp-2">
                                {s.therapy_goal}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                    <Calendar size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-black">
                    No upcoming sessions found.
                  </p>
                  <p className="text-gray-400 text-xs mt-2 font-medium">
                    Use the Clinical Directory to assign sessions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==========================================
            PATIENT VIEW
        ========================================== */
        <div className="space-y-10">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-800 tracking-tight">
              My Sessions
            </h1>
            <p className="text-gray-500 font-medium mt-2">
              Your personalized robotic speech therapy schedule.
            </p>
          </div>

          {sessions.length > 0 ? (
            <div className="space-y-8">
              {/* HERO CARD: The Very Next Session */}
              <div className="bg-gradient-to-br from-[#5cb338] to-[#4a912d] rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-green-500/20 text-white relative overflow-hidden">
                {/* Decorative background shapes */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-12 w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                  <div className="space-y-4 flex-1">
                    <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                      Up Next
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                      {sessions[0].bot_name} Therapy
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <p className="flex items-center gap-2 text-sm font-bold bg-black/20 px-4 py-2 rounded-xl">
                        <Calendar size={16} /> {sessions[0].session_date}
                      </p>
                      <p className="flex items-center gap-2 text-sm font-bold bg-black/20 px-4 py-2 rounded-xl">
                        <Clock size={16} /> {sessions[0].session_time}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex flex-col gap-4 items-start md:items-end">
                    {/* Reminder Badge instead of Start Button */}
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-4 rounded-2xl">
                      <p className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <MessageSquare size={16} /> Ready when you are.
                      </p>
                      <p className="text-[10px] font-medium text-white/80 mt-1">
                        Open the bot to begin practice.
                      </p>
                    </div>

                    <button
                      onClick={() => handleCancel(sessions[0].id)}
                      className="text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 pt-2 md:pt-0"
                    >
                      <Trash2 size={12} /> Cancel Appointment
                    </button>
                  </div>
                </div>
              </div>

              {/* LATER SESSIONS (If they have more than 1 scheduled) */}
              {sessions.length > 1 && (
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 ml-2">
                    Later This Week
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessions.slice(1).map((s) => (
                      <div
                        key={s.id}
                        className="p-6 bg-white border border-gray-100 rounded-3xl flex items-center justify-between shadow-xl shadow-gray-200/20 hover:shadow-gray-200/40 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#f0fff4] text-[#5cb338] rounded-2xl flex items-center justify-center shadow-inner">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="font-black text-gray-800">
                              {s.bot_name} Therapy
                            </p>
                            <p className="text-[11px] font-bold text-gray-500 mt-1">
                              {s.session_date} @ {s.session_time}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancel(s.id)}
                          className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // PATIENT EMPTY STATE
            <div className="p-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-gray-300">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-gray-800 font-black text-2xl mb-3">
                No Sessions Scheduled
              </h3>
              <p className="text-gray-500 font-medium max-w-md text-sm">
                Your therapist hasn't prepared a target list for you yet. Check
                back later or contact your clinic.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MySessions;
