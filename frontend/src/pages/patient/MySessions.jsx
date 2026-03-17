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
          .order("session_date", { ascending: true });

        setSessions(data || []);
      } else if (userRole === "therapist") {
        // --- THERAPIST VIEW DATA ---
        // A. Fetch patients who have no therapist assigned yet
        const { data: unassigned } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "patient")
          .is("selected_therapist_id", null);

        setUnassignedPatients(unassigned || []);

        // B. Fetch profiles of patients assigned to THIS therapist (to map names)
        const { data: myPatients } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("selected_therapist_id", user.id);

        const patientMap = {};
        myPatients?.forEach((p) => (patientMap[p.id] = p.full_name));

        // C. Fetch all sessions created by this therapist
        const { data: therapistSessions } = await supabase
          .from("sessions")
          .select("*")
          .eq("therapist_id", user.id)
          .order("session_date", { ascending: true });

        // Attach patient names to the sessions for the UI
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
      fetchInitialData(); // Refresh the data
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
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* ----------------- THERAPIST VIEW ----------------- */}
      {role === "therapist" ? (
        <>
          <div className="mb-10">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">
              Therapist Dashboard
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Manage your patients and clinical sessions
            </p>
          </div>

          {/* Unassigned Patients Section */}
          <div className="mb-12">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
              New Patients Available
            </h2>
            {unassignedPatients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unassignedPatients.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-gray-800">{p.full_name}</p>
                      <p className="text-xs text-gray-400">
                        {p.clinic_name || "Independent Patient"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClaimPatient(p.id)}
                      className="bg-[#f0fff4] text-[#5cb338] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#5cb338] hover:text-white transition-all flex items-center gap-2"
                    >
                      <UserPlus size={14} /> Claim
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No new patients available to claim at the moment.
              </p>
            )}
          </div>

          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
            Upcoming Clinical Sessions
          </h2>
        </>
      ) : (
        /* ----------------- PATIENT VIEW ----------------- */
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            My Sessions
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            View your upcoming robotic therapy sessions
          </p>
        </div>
      )}

      {/* ----------------- SHARED SESSION CARDS ----------------- */}
      <div className="grid gap-6">
        {sessions.length > 0 ? (
          sessions.map((s) => (
            <div
              key={s.id}
              className="p-6 bg-white border border-gray-100 rounded-3xl flex flex-col gap-6 shadow-xl shadow-gray-200/20 hover:shadow-gray-200/40 transition-all"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#f0fff4] border border-green-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                    🤖
                  </div>
                  <div>
                    <p className="font-black text-gray-800 text-lg">
                      {role === "therapist"
                        ? `Session: ${s.patientName}`
                        : `${s.bot_name} Therapy Session`}
                    </p>
                    <p className="text-xs font-bold text-[#5cb338] flex items-center gap-1 uppercase tracking-wider mt-1">
                      <Clock size={12} /> {s.session_date} @ {s.session_time}
                    </p>
                  </div>
                </div>

                {role === "patient" && (
                  <button
                    onClick={() => handleCancel(s.id)}
                    className="group flex items-center gap-2 text-gray-300 hover:text-red-500 transition-colors font-bold text-[10px] uppercase tracking-widest"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      CANCEL
                    </span>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Clinical Targets Display */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col gap-4">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Target size={12} className="text-[#5cb338]" /> Target Words
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {s.target_words && s.target_words.length > 0 ? (
                      s.target_words.map((w, i) => (
                        <span
                          key={i}
                          className="bg-white border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm"
                        >
                          {w}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">
                        No target words assigned yet.
                      </span>
                    )}
                  </div>
                </div>

                {s.target_sentence && (
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 mt-2">
                      <MessageSquare size={12} className="text-blue-400" />{" "}
                      Practice Phrase
                    </span>
                    <p className="text-sm font-bold text-gray-700 bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm">
                      "{s.target_sentence}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : /* ----------------- DYNAMIC EMPTY STATE / ERROR ----------------- */
        role === "patient" ? (
          // Patient Error State
          <div className="p-8 bg-red-50 border-2 border-red-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-red-500">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-red-800 font-black text-xl mb-2">
              No Session Configured
            </h3>
            <p className="text-red-600 font-medium max-w-sm">
              Your therapist has not scheduled a session or assigned target
              vocabulary for you yet. Please contact your clinic.
            </p>
          </div>
        ) : (
          // Therapist Empty State
          <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Calendar size={24} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-black">
              No upcoming sessions found.
            </p>
            <p className="text-gray-400 text-xs mt-2 font-medium">
              Use the Clinical Directory to assign sessions to your patients.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySessions;
