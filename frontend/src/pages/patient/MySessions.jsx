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
  ShieldCheck,
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || "patient";
      setRole(userRole);

      if (userRole === "patient") {
        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("patient_id", user.id)
          .order("session_date", { ascending: true })
          .order("session_time", { ascending: true });

        setSessions(data || []);
      } else if (userRole === "therapist") {
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
      fetchInitialData();
    } catch (err) {
      alert("Error claiming patient: " + err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-extrabold text-[#172554] animate-pulse flex-col gap-5">
        <Loader2 className="w-12 h-12 animate-spin text-[#172554]" />
        <span className="text-[10px] uppercase tracking-[0.3em]">
          Syncing Clinical Database...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700 pb-32 font-sans antialiased">
      {/* THERAPIST VIEW */}
      {role === "therapist" ? (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
                Session Command Center
              </h1>
              <p className="text-gray-500 font-semibold mt-2 text-sm italic">
                Manage incoming patients and monitor your active clinical queue.
              </p>
            </div>
            <div className="bg-white px-8 py-4 rounded-2xl shadow-xl shadow-gray-200/30 border border-gray-50 flex items-center gap-4">
              <Activity className="text-[#172554] w-5 h-5" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-600">
                {sessions.length} Active Sessions
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
                <UserPlus size={16} className="text-[#172554]" />
                Intake Queue
              </h2>

              <div className="bg-gray-50/50 p-6 rounded-[3rem] border border-gray-100 space-y-4 max-h-[600px] overflow-y-auto">
                {unassignedPatients.length > 0 ? (
                  unassignedPatients.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group"
                    >
                      <p className="font-extrabold text-gray-800 text-sm">
                        {p.full_name}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1 mb-6">
                        {p.clinic_name || "Independent Case"}
                      </p>
                      <button
                        onClick={() => handleClaimPatient(p.id)}
                        className="w-full bg-[#172554] text-white py-4 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest hover:brightness-125 transition-all flex items-center justify-center gap-2"
                      >
                        Claim Patient <ArrowRight size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest italic">
                      Queue is clear.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
                <Calendar size={16} className="text-[#172554]" />
                Clinical Schedule
              </h2>

              {sessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 flex flex-col justify-between hover:scale-[1.02] transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <span className="bg-[#172554]/5 text-[#172554] px-4 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest mb-3 inline-block border border-[#172554]/10">
                              {s.difficulty_level?.[0] || "Standard"}
                            </span>
                            <h3 className="font-extrabold text-gray-800 text-xl tracking-tight">
                              {s.patientName}
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-4 mt-6">
                          <div className="flex gap-3 items-center">
                            <Clock className="w-4 h-4 text-[#172554] shrink-0" />
                            <p className="text-xs font-bold text-gray-600">
                              {s.session_date} @ {s.session_time}
                            </p>
                          </div>

                          <div className="flex gap-3 items-center">
                            <Target className="w-4 h-4 text-[#172554] shrink-0" />
                            <p className="text-xs font-bold text-gray-600 truncate">
                              {s.target_words?.length || 0} Targets Set
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(s.id)}
                        className="mt-8 text-[10px] font-extrabold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors text-left"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-[3.5rem] bg-white">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl shadow-inner flex items-center justify-center mb-6">
                    <Calendar size={28} className="text-gray-200" />
                  </div>
                  <p className="text-gray-500 font-extrabold text-[10px] uppercase tracking-[0.3em]">
                    No sessions scheduled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==========================================
            PATIENT VIEW: Matched to Deep Navy (#172554)
        ========================================== */
        <div className="space-y-10">
          <header>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              My Sessions
            </h1>
            <p className="text-gray-400 font-semibold mt-1 text-sm italic">
              Your speech therapy schedule.
            </p>
          </header>

          {sessions.length > 0 ? (
            <div className="space-y-8">
              {/* PRIMARY SESSION BLOCK: Smaller & Deep Navy (#172554) */}
              <div className="bg-[#172554] rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-[#172554]/20 text-white relative overflow-hidden group">
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                  <div className="space-y-4 flex-1">
                    <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                      Up Next
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter leading-tight">
                      {sessions[0].bot_name} Therapy
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <p className="flex items-center gap-2 text-[11px] font-bold bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                        <Calendar size={14} /> {sessions[0].session_date}
                      </p>
                      <p className="flex items-center gap-2 text-[11px] font-bold bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                        <Clock size={14} /> {sessions[0].session_time}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex flex-col gap-4 items-start md:items-end">
                    <div className="bg-black/10 backdrop-blur-md border border-white/10 p-5 rounded-[2rem] w-full md:w-64">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white flex items-center gap-2">
                        <MessageSquare size={14} /> Practice Mode
                      </p>
                      <p className="text-[11px] font-medium text-white/80 mt-2 italic">
                        Ready to begin today's targets.
                      </p>
                    </div>

                    <button
                      onClick={() => handleCancel(sessions[0].id)}
                      className="text-white/50 hover:text-white text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 pt-1"
                    >
                      <Trash2 size={12} /> Cancel Appointment
                    </button>
                  </div>
                </div>
              </div>

              {/* UPCOMING SESSIONS LIST */}
              {sessions.length > 1 && (
                <div className="space-y-5">
                  <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] ml-2">
                    Later This Week
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessions.slice(1).map((s) => (
                      <div
                        key={s.id}
                        className="p-6 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-between shadow-xl shadow-gray-200/20 hover:shadow-gray-200/40 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#172554]/5 text-[#172554] rounded-xl flex items-center justify-center border border-[#172554]/10">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-800 text-base tracking-tight">
                              {s.bot_name} Therapy
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {s.session_date} • {s.session_time}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancel(s.id)}
                          className="w-8 h-8 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
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
            <div className="py-32 bg-white border border-gray-100 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-xl shadow-gray-200/20 px-8">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 text-gray-200 shadow-inner">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-gray-800 font-extrabold text-2xl tracking-tight mb-3">
                No Sessions Scheduled
              </h3>
              <p className="text-gray-400 font-semibold max-w-xs text-xs italic">
                Your therapist hasn't prepared your session yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MySessions;
