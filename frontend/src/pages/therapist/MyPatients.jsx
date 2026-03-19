import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Search,
  Loader2,
  Target,
  MessageSquare,
  Save,
  ChevronDown,
  ChevronUp,
  X,
  UserCog,
  BrainCircuit,
  Settings2,
  CheckCircle,
  Calendar,
  Clock,
  History,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

const MyPatients = () => {
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Local state for managing session data
  const [wordTags, setWordTags] = useState([]);
  const [currentSentence, setCurrentSentence] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("Medium");
  const [therapyGoal, setTherapyGoal] = useState("");
  const [phonemes, setPhonemes] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Holds 'session_reports' data for the CSV Export
  const [sessionReports, setSessionReports] = useState([]);

  // Custom Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());

  useEffect(() => {
    const fetchClinicalData = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: patientData, error: patientError } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "patient")
          .order("full_name", { ascending: true });

        if (patientError) throw patientError;
        setPatients(patientData || []);

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
    fetchClinicalData();
  }, []);

  const handleAssignTherapist = async (patientId, newTherapistId) => {
    try {
      setUpdatingId(patientId);
      const valueToSet = newTherapistId === "" ? null : newTherapistId;

      const { data, error } = await supabase
        .from("profiles")
        .update({ selected_therapist_id: valueToSet })
        .eq("id", patientId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("Update blocked by Supabase RLS.");

      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId ? { ...p, selected_therapist_id: valueToSet } : p,
        ),
      );
      alert("Therapist successfully assigned! ✅");
    } catch (error) {
      console.error(error);
      alert("Failed to update therapist: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExpandPatient = async (patientId) => {
    if (expandedId === patientId) {
      setExpandedId(null);
      setShowDatePicker(false);
      setShowTimePicker(false);
      return;
    }

    setExpandedId(patientId);
    setWordTags([]);
    setCurrentSentence("");
    setDifficultyLevel("Medium");
    setTherapyGoal("");
    setPhonemes("");
    setActiveSessionId(null);
    setSessionReports([]);
    setUpdatingId(patientId);
    setShowDatePicker(false);
    setShowTimePicker(false);

    const today = new Date();
    setSessionDate(today.toISOString().split("T")[0]);
    setSessionTime("10:00 AM");

    try {
      // 1. Fetch active session
      const { data: activeData, error: activeError } = await supabase
        .from("sessions")
        .select("*")
        .eq("patient_id", patientId)
        .eq("status", "upcoming")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (activeError && activeError.code !== "PGRST116") throw activeError;

      if (activeData) {
        setActiveSessionId(activeData.id);
        setWordTags(activeData.target_words || []);
        setCurrentSentence(activeData.target_sentence || "");
        setDifficultyLevel(activeData.difficulty_level?.[0] || "Medium");
        setTherapyGoal(activeData.therapy_goal || "");
        setPhonemes(activeData.phonemes_to_focus_on?.join(", ") || "");
        setSessionDate(
          activeData.session_date || today.toISOString().split("T")[0],
        );
        setSessionTime(activeData.session_time || "10:00 AM");
      }

      // 2. Fetch completed session history
      const { data: reportData, error: reportError } = await supabase
        .from("session_reports")
        .select("*, profiles:patient_id(full_name)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (reportError) throw reportError;
      if (reportData) setSessionReports(reportData);
    } catch (error) {
      console.error("Session fetch error:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  // ONLY CALL THIS WHEN "SYNC EDITS" IS CLICKED
  const handleManualSync = async (patientId) => {
    if (wordTags.length < 3) {
      alert("Waabi requires at least 3 target words for an effective session.");
      return;
    }

    try {
      setUpdatingId(patientId);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const phonemesArray = phonemes
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p !== "");

      const sessionPayload = {
        patient_id: patientId,
        therapist_id: user.id,
        target_words: wordTags,
        target_sentence: currentSentence,
        difficulty_level: [difficultyLevel],
        therapy_goal: therapyGoal,
        phonemes_to_focus_on: phonemesArray,
        session_date: sessionDate,
        session_time: sessionTime,
        status: "upcoming",
      };

      if (activeSessionId) {
        const { error } = await supabase
          .from("sessions")
          .update(sessionPayload)
          .eq("id", activeSessionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("sessions")
          .insert(sessionPayload)
          .select()
          .single();
        if (error) throw error;
        setActiveSessionId(data.id);
      }

      alert("Clinical plan synced! Waabi is now updated.");
    } catch (error) {
      console.error("Supabase Error:", error);
      alert("Failed to sync: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const markSessionComplete = async (patientId) => {
    if (!activeSessionId) {
      alert("No active session to complete! Please add some targets first.");
      return;
    }

    if (
      window.confirm(
        "Are you sure you want to mark this session as complete? It will be archived into the reports table.",
      )
    ) {
      try {
        setUpdatingId(patientId);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Use local state directly for archiving so we don't miss unsynced edits!
        const phonemesArray = phonemes
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p !== "");

        const archivePayload = {
          patient_id: patientId,
          therapist_id: user.id,
          session_date: sessionDate,
          session_time: sessionTime,
          target_word: wordTags,
          target_sentence: currentSentence,
          difficulty_level: [difficultyLevel],
          therapy_goals: therapyGoal,
          phonemes_to_focus_on: phonemesArray,
          created_at: new Date().toISOString(),
        };

        const { data: newReport, error: insertError } = await supabase
          .from("session_reports")
          .insert(archivePayload)
          .select()
          .single();

        if (insertError) throw insertError;

        // Delete from active sessions table
        const { error: deleteError } = await supabase
          .from("sessions")
          .delete()
          .eq("id", activeSessionId);

        if (deleteError) throw deleteError;

        // Update UI
        setSessionReports([newReport, ...sessionReports]);
        setActiveSessionId(null);
        setWordTags([]);
        setCurrentSentence("");
        setDifficultyLevel("Medium");
        setTherapyGoal("");
        setPhonemes("");

        const today = new Date();
        setSessionDate(today.toISOString().split("T")[0]);
        setSessionTime("10:00 AM");

        alert("Session successfully archived into reports! 📁");
      } catch (error) {
        console.error("Error archiving session:", error);
        alert("Failed to archive session: " + error.message);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  // --- CSV DOWNLOAD GENERATOR ---
  const downloadCSV = (patient) => {
    if (sessionReports.length === 0) {
      alert("No reports available to download for this patient.");
      return;
    }

    const headers = [
      "Patient Name",
      "Scheduled Date",
      "Scheduled Time",
      "Target Word(s)",
      "Target Sentence",
      "Difficulty Level",
      "Phonemes",
      "Therapy Goal",
      "Transcript",
      "Accuracy (%)",
      "Total Errors",
      "Substitutions",
      "Omissions",
      "Insertions",
      "Feedback Given",
      "Practice Exercise",
      "Session Duration (s)",
      "Date Completed",
    ];

    const csvRows = sessionReports.map((report) => {
      return [
        patient.full_name || "Unknown Patient",
        report.session_date || "N/A",
        report.session_time || "N/A",
        report.target_word?.join(", ") || "",
        report.target_sentence || "",
        report.difficulty_level?.join(", ") || "",
        report.phonemes_to_focus_on?.join(", ") || "",
        report.therapy_goals || report.therapy_goal || "",
        report.transcript || "Manual Archive",
        report.accuracy !== null ? report.accuracy : "",
        report.total_errors !== null ? report.total_errors : "",
        report.substitutions !== null ? report.substitutions : "",
        report.omissions !== null ? report.omissions : "",
        report.insertions !== null ? report.insertions : "",
        report.feedback_given || "",
        report.practice_exercise || "",
        report.session_duration_secs !== null
          ? report.session_duration_secs
          : "",
        new Date(report.created_at).toLocaleString(),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${patient.full_name.replace(/\s+/g, "_")}_Clinical_Reports.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    // Local state only
    setSessionDate(formattedDate);
    setShowDatePicker(false);
  };

  // --- Time Picker Logic ---
  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 8; i <= 18; i++) {
      const ampm = i >= 12 ? "PM" : "AM";
      const hour = i > 12 ? i - 12 : i;
      slots.push(`${hour}:00 ${ampm}`);
      if (i !== 18) slots.push(`${hour}:30 ${ampm}`);
    }
    return slots;
  };

  const handleCustomTimeSelect = (time) => {
    // Local state only
    setSessionTime(time);
    setShowTimePicker(false);
  };

  const addTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = e.target.value.trim().replace(",", "");
      if (value && !wordTags.includes(value)) {
        // Local state only
        setWordTags([...wordTags, value]);
        e.target.value = "";
      }
    }
  };

  const removeTag = (indexToRemove) => {
    // Local state only
    setWordTags(wordTags.filter((_, index) => index !== indexToRemove));
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
                          onClick={(e) => e.stopPropagation()}
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

                    <td className="px-8 py-6">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {expandedId === patient.id && activeSessionId
                          ? "Active Session"
                          : "Configure Next Session"}
                      </span>
                    </td>

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

                  {/* Expanded Area: Builder + History */}
                  {expandedId === patient.id && (
                    <tr className="bg-[#f0fff4]/10">
                      <td colSpan="4" className="px-12 py-10">
                        <div className="mb-6 pb-6 border-b border-green-500/10 flex justify-between items-center">
                          <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">
                            {activeSessionId
                              ? "Current Session Profile"
                              : "Create New Session"}
                          </h3>
                          {activeSessionId && (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>{" "}
                              Active
                            </span>
                          )}
                        </div>

                        {/* ACTIVE SESSION BUILDER */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-top duration-500">
                          {/* LEFT COLUMN: Practice Setup */}
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                  Session Date
                                </label>
                                <div
                                  onClick={() => {
                                    setShowDatePicker(!showDatePicker);
                                    setShowTimePicker(false);
                                  }}
                                  className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-[1.25rem] pl-11 pr-4 py-4 text-xs font-black text-gray-700 shadow-sm transition-all cursor-pointer flex items-center relative"
                                >
                                  <Calendar className="w-4 h-4 text-blue-500 absolute left-4" />
                                  {sessionDate || "Select Date"}
                                </div>

                                {showDatePicker && (
                                  <div className="absolute top-[80px] left-0 w-72 bg-white border border-gray-100 shadow-2xl rounded-3xl p-5 z-50 animate-in zoom-in-95 fade-in duration-200">
                                    <div className="flex justify-between items-center mb-4">
                                      <button
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
                                      <span className="text-xs font-black text-gray-800">
                                        {monthNames[pickerMonth.getMonth()]}{" "}
                                        {pickerMonth.getFullYear()}
                                      </span>
                                      <button
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
                                      {[
                                        "Su",
                                        "Mo",
                                        "Tu",
                                        "We",
                                        "Th",
                                        "Fr",
                                        "Sa",
                                      ].map((d) => (
                                        <span
                                          key={d}
                                          className="text-[9px] font-black text-gray-400"
                                        >
                                          {d}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {[...Array(firstDayOfMonth)].map(
                                        (_, i) => (
                                          <div key={`empty-${i}`} />
                                        ),
                                      )}
                                      {[...Array(daysInMonth)].map((_, i) => {
                                        const day = i + 1;
                                        const isSelected =
                                          sessionDate ===
                                          new Date(
                                            pickerMonth.getFullYear(),
                                            pickerMonth.getMonth(),
                                            day,
                                          )
                                            .toISOString()
                                            .split("T")[0];
                                        return (
                                          <button
                                            key={day}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCustomDateSelect(day);
                                            }}
                                            className={`p-2 text-xs font-bold rounded-xl transition-all ${
                                              isSelected
                                                ? "bg-blue-500 text-white shadow-md"
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

                              <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                  Session Time
                                </label>
                                <div
                                  onClick={() => {
                                    setShowTimePicker(!showTimePicker);
                                    setShowDatePicker(false);
                                  }}
                                  className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-[1.25rem] pl-11 pr-4 py-4 text-xs font-black text-gray-700 shadow-sm transition-all cursor-pointer flex items-center relative"
                                >
                                  <Clock className="w-4 h-4 text-blue-500 absolute left-4" />
                                  {sessionTime || "Select Time"}
                                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4" />
                                </div>

                                {showTimePicker && (
                                  <div className="absolute top-[80px] left-0 w-full bg-white border border-gray-100 shadow-2xl rounded-3xl p-2 z-50 animate-in zoom-in-95 fade-in duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                                    {generateTimeSlots().map((time) => (
                                      <button
                                        key={time}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCustomTimeSelect(time);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                                          sessionTime === time
                                            ? "bg-blue-500 text-white"
                                            : "hover:bg-blue-50 text-gray-700"
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                  Difficulty Level
                                </label>
                                <div className="relative group">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Settings2 className="w-4 h-4 text-orange-400" />
                                  </div>
                                  <select
                                    className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-[1.25rem] pl-11 pr-10 py-4 text-xs font-black text-gray-700 outline-none focus:ring-4 focus:ring-orange-100/50 shadow-sm transition-all cursor-pointer appearance-none"
                                    value={difficultyLevel}
                                    onChange={(e) =>
                                      setDifficultyLevel(e.target.value)
                                    }
                                  >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                  </select>
                                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                  Phonemes to Focus
                                </label>
                                <div className="relative group">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                                  </div>
                                  <input
                                    className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-[1.25rem] pl-11 pr-4 py-4 text-xs font-black text-gray-700 outline-none focus:ring-4 focus:ring-purple-100/50 shadow-sm transition-all placeholder:font-medium placeholder:text-gray-400"
                                    placeholder="e.g. /p/, /b/, /m/"
                                    value={phonemes}
                                    onChange={(e) =>
                                      setPhonemes(e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                Therapy Goal
                              </label>
                              <textarea
                                rows="2"
                                className="w-full bg-white border border-gray-200 rounded-[1.5rem] px-6 py-5 text-xs font-black text-gray-700 outline-none focus:ring-4 focus:ring-gray-100/50 resize-none shadow-sm transition-all placeholder:font-medium placeholder:text-gray-400 hover:bg-gray-50 focus:bg-white"
                                placeholder="Describe the primary clinical goal..."
                                value={therapyGoal}
                                onChange={(e) => setTherapyGoal(e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-[#5cb338]" />{" "}
                                Target Vocabulary
                              </label>
                              <div className="w-full bg-white border border-gray-200 rounded-[1.5rem] p-4 min-h-[100px] focus-within:ring-4 focus-within:ring-[#5cb338]/10 transition-all flex flex-wrap gap-2 content-start shadow-sm hover:bg-gray-50 focus-within:bg-white">
                                {wordTags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="bg-green-50 text-[#5cb338] px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 border border-green-100"
                                  >
                                    {tag}
                                    <X
                                      size={12}
                                      className="cursor-pointer hover:text-red-500 transition-colors"
                                      onClick={() => removeTag(index)}
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
                                  onKeyDown={(e) => addTag(e)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* RIGHT COLUMN: Sentences & Actions */}
                          <div className="space-y-2 flex flex-col h-full">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />{" "}
                              Practice Phrases
                            </label>
                            <textarea
                              className="flex-1 bg-white border border-gray-200 rounded-[1.5rem] p-6 text-xs font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100/50 transition-all resize-none min-h-[220px] shadow-sm placeholder:font-medium placeholder:text-gray-400 hover:bg-gray-50 focus:bg-white"
                              placeholder="e.g. Can you pass the water? I feel better today."
                              value={currentSentence}
                              onChange={(e) =>
                                setCurrentSentence(e.target.value)
                              }
                            />

                            <div className="flex gap-4 mt-6">
                              <button
                                onClick={() => handleManualSync(patient.id)}
                                disabled={updatingId === patient.id}
                                className="flex-1 bg-white border border-gray-200 text-gray-700 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                {updatingId === patient.id ? (
                                  <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                  <Save className="w-4 h-4 text-gray-400" />
                                )}
                                Sync Edits
                              </button>

                              {activeSessionId && (
                                <button
                                  onClick={() =>
                                    markSessionComplete(patient.id)
                                  }
                                  disabled={updatingId === patient.id}
                                  className="flex-1 bg-[#5cb338] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" /> Mark
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* --- EXPORT CSV ONLY --- */}
                        <div className="mt-12 pt-8 border-t border-gray-200/50 animate-in slide-in-from-bottom duration-700">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                            <div>
                              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                <Download className="w-4 h-4 text-blue-500" />
                                Clinical Data Export
                              </h3>
                              <p className="text-xs text-blue-600/70 font-bold mt-1">
                                Download a formatted CSV report containing all
                                completed sessions, targets, and performance
                                metrics for {patient.full_name}.
                              </p>
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">
                                {sessionReports.length} Session(s) on Record
                              </p>
                            </div>

                            <button
                              onClick={() => downloadCSV(patient)}
                              disabled={sessionReports.length === 0}
                              className="w-full md:w-auto bg-white text-blue-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-blue-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                            >
                              <Download size={16} />
                              Export CSV File
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
