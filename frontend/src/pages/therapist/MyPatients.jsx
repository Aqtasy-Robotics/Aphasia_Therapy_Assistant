import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Search,
  Calendar,
  Loader2,
  User,
  Target,
  MessageSquare,
  Save,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  UserCog,
} from "lucide-react";

const MyPatients = () => {
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]); // <-- New state for therapists
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Local state for managing individual word tags and session data
  const [wordTags, setWordTags] = useState([]);
  const [currentSentence, setCurrentSentence] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);

  useEffect(() => {
    fetchClinicalData();
  }, []);

  const fetchClinicalData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch ALL patients
      const { data: patientData, error: patientError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .order("full_name", { ascending: true });

      if (patientError) throw patientError;
      setPatients(patientData || []);

      // 2. Fetch ALL therapists for the assignment dropdown
      const { data: therapistData, error: therapistError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "therapist")
        .order("full_name", { ascending: true });

      if (therapistError) throw therapistError;
      setTherapists(therapistData || []);
    } catch (error) {
      console.error("Error fetching clinical data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Handle changing a patient's assigned therapist ---
  const handleAssignTherapist = async (patientId, newTherapistId) => {
    try {
      setUpdatingId(patientId);
      const valueToSet = newTherapistId === "" ? null : newTherapistId;

      const { error } = await supabase
        .from("profiles")
        .update({ selected_therapist_id: valueToSet })
        .eq("id", patientId);

      if (error) throw error;

      // Update the local state so the UI reflects the change immediately
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId ? { ...p, selected_therapist_id: valueToSet } : p,
        ),
      );

      // Optional: Give a small non-intrusive feedback instead of a jarring alert
      console.log("Therapist updated successfully.");
    } catch (error) {
      alert("Failed to update therapist: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Fetches the upcoming session when a patient is expanded
  const handleExpandPatient = async (patientId) => {
    if (expandedId === patientId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(patientId);
    setWordTags([]);
    setCurrentSentence("");
    setActiveSessionId(null);
    setUpdatingId(patientId);

    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("patient_id", patientId)
        .eq("status", "upcoming")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveSessionId(data.id);
        setWordTags(data.target_words || []);
        setCurrentSentence(data.target_sentence || "");
      }
    } catch (error) {
      // It's normal to get PGRST116 (No rows found) if they don't have a session yet
      if (error.code !== "PGRST116") {
        console.error("Session fetch error:", error);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // The core sync function that safely updates or creates a session
  const autoSyncSession = async (patientId, newTagsArray, newSentence) => {
    try {
      setUpdatingId(patientId);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const sessionPayload = {
        patient_id: patientId,
        therapist_id: user.id, // Records the user creating/updating the session
        target_words: newTagsArray,
        target_sentence: newSentence,
        status: "upcoming",
      };

      if (activeSessionId) {
        // Update existing session
        const { error } = await supabase
          .from("sessions")
          .update(sessionPayload)
          .eq("id", activeSessionId);

        if (error) throw error;
      } else {
        // Create new session
        const today = new Date();
        sessionPayload.session_date = today.toISOString().split("T")[0];
        sessionPayload.session_time = today.toTimeString().split(" ")[0];

        const { data, error } = await supabase
          .from("sessions")
          .insert(sessionPayload)
          .select()
          .single();

        if (error) throw error;
        setActiveSessionId(data.id); // Save the new ID so future words update this row
      }
    } catch (error) {
      console.error("Supabase Error:", error);
      alert(
        `Database Error: ${error.message}\n\nCheck your Supabase RLS policies or Foreign Key constraints.`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Word addition logic with auto-save
  const addTag = async (e, patientId) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = e.target.value.trim().replace(",", "");

      if (value && !wordTags.includes(value)) {
        const newTags = [...wordTags, value];
        setWordTags(newTags);
        e.target.value = "";

        await autoSyncSession(patientId, newTags, currentSentence);
      }
    }
  };

  // Word removal logic with auto-save
  const removeTag = async (indexToRemove, patientId) => {
    const newTags = wordTags.filter((_, index) => index !== indexToRemove);
    setWordTags(newTags);
    await autoSyncSession(patientId, newTags, currentSentence);
  };

  // Sentence auto-save (Triggers when the user clicks out of the textarea)
  const handleSentenceBlur = async (patientId) => {
    await autoSyncSession(patientId, wordTags, currentSentence);
  };

  // Manual save button click
  const handleManualSync = async (patientId) => {
    if (wordTags.length < 3) {
      alert("Waabi requires at least 3 target words for an effective session.");
      return;
    }
    await autoSyncSession(patientId, wordTags, currentSentence);
    alert("Clinical plan synced! Waabi is now updated.");
  };

  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <Loader2 className="w-12 h-12 text-[#5cb338] animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Syncing Clinical Database...
        </p>
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">
            Clinical Directory
          </h1>
          <p className="text-gray-500 font-medium mt-1 italic">
            Global view of all patients, therapy assignments, and practice
            targets
          </p>
        </div>
      </div>

      <div className="relative group max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Search patient..."
          className="block w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/20 focus:ring-4 focus:ring-[#5cb338]/10 outline-none transition-all text-gray-700 font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Patient
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Assigned Therapist
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Target Status
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.map((patient) => (
                <React.Fragment key={patient.id}>
                  <tr
                    className={`group hover:bg-[#f0fff4]/30 transition-all cursor-pointer ${
                      expandedId === patient.id ? "bg-[#f0fff4]/20" : ""
                    }`}
                    onClick={() => handleExpandPatient(patient.id)}
                  >
                    {/* Patient Name Column */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#f0fff4] text-[#5cb338] rounded-xl flex items-center justify-center font-black text-sm border border-green-50 shadow-inner">
                          {patient.full_name?.charAt(0) || "?"}
                        </div>
                        <span className="text-sm font-black text-gray-800">
                          {patient.full_name || "Unknown Patient"}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Therapist Dropdown Column */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <UserCog
                          size={14}
                          className={
                            patient.selected_therapist_id
                              ? "text-blue-500"
                              : "text-amber-500"
                          }
                        />
                        <select
                          className={`text-xs font-bold outline-none rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                            patient.selected_therapist_id
                              ? "bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"
                          }`}
                          value={patient.selected_therapist_id || ""}
                          onChange={(e) =>
                            handleAssignTherapist(patient.id, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()} // Prevents dropdown click from expanding the row
                          disabled={updatingId === patient.id}
                        >
                          <option value="">-- Unassigned --</option>
                          {therapists.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {expandedId === patient.id && activeSessionId
                          ? "Session Configured"
                          : "Click to view targets"}
                      </span>
                    </td>

                    {/* Expand/Collapse Chevron Column */}
                    <td className="px-8 py-6 text-right">
                      <div className="p-2 rounded-lg bg-gray-50 text-gray-400 inline-block group-hover:bg-white group-hover:shadow-sm transition-all">
                        {expandedId === patient.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Session Config Area */}
                  {expandedId === patient.id && (
                    <tr className="bg-[#f0fff4]/10">
                      <td colSpan="4" className="px-12 py-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-top duration-500">
                          {/* Target Words Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <Target className="w-3.5 h-3.5 text-[#5cb338]" />{" "}
                                Target Vocabulary
                              </label>
                            </div>

                            <div className="w-full bg-white border border-gray-100 rounded-3xl p-4 min-h-[140px] focus-within:ring-4 focus-within:ring-[#5cb338]/10 transition-all flex flex-wrap gap-2 content-start">
                              {wordTags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="bg-green-50 text-[#5cb338] px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 border border-green-100 animate-in zoom-in-75 duration-300"
                                >
                                  {tag}
                                  <X
                                    size={12}
                                    className="cursor-pointer hover:text-red-500"
                                    onClick={() => removeTag(index, patient.id)}
                                  />
                                </span>
                              ))}
                              <input
                                className="flex-1 min-w-[120px] bg-transparent outline-none text-xs font-bold text-gray-700 py-1.5"
                                placeholder={
                                  wordTags.length === 0
                                    ? "Add words individually..."
                                    : ""
                                }
                                onKeyDown={(e) => addTag(e, patient.id)}
                              />
                            </div>
                            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic ml-2">
                              {wordTags.length} words added (Minimum 3 required)
                            </p>
                          </div>

                          {/* Sentence / Sync Section */}
                          <div className="space-y-4 flex flex-col">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />{" "}
                              Practice Phrases
                            </label>
                            <textarea
                              className="flex-1 bg-white border border-gray-100 rounded-3xl p-6 text-xs font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100/50 transition-all resize-none min-h-[140px]"
                              placeholder="e.g. Can you pass the water? I feel better today."
                              value={currentSentence}
                              onChange={(e) =>
                                setCurrentSentence(e.target.value)
                              }
                              onBlur={() => handleSentenceBlur(patient.id)}
                            />

                            <button
                              onClick={() => handleManualSync(patient.id)}
                              disabled={updatingId === patient.id}
                              className="mt-4 bg-[#5cb338] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                              {updatingId === patient.id ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Sync Clinical Targets
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyPatients;
