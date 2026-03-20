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
  Download,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const MyPatients = () => {
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Local state for managing session data
  const [practiceMode, setPracticeMode] = useState("words");
  const [wordTags, setWordTags] = useState([]);
  const [currentSentence, setCurrentSentence] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("Medium");
  const [therapyGoal, setTherapyGoal] = useState("");
  const [phonemes, setPhonemes] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [sessionReports, setSessionReports] = useState([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());

  useEffect(() => {
    const fetchClinicalData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
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
      setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, selected_therapist_id: valueToSet } : p));
      alert("Therapist successfully assigned! ✅");
    } catch (error) {
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
    setPracticeMode("words");
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
        const loadedWords = activeData.target_words || [];
        const loadedSentence = activeData.target_sentence || "";
        if (loadedSentence.trim().length > 0 && loadedWords.length === 0) {
          setPracticeMode("sentence");
          setCurrentSentence(loadedSentence);
          setWordTags([]);
        } else {
          setPracticeMode("words");
          setWordTags(loadedWords);
          setCurrentSentence("");
        }
        setDifficultyLevel(activeData.difficulty_level?.[0] || "Medium");
        setTherapyGoal(activeData.therapy_goal || "");
        setPhonemes(activeData.phonemes_to_focus_on?.join(", ") || "");
        setSessionDate(activeData.session_date || today.toISOString().split("T")[0]);
        setSessionTime(activeData.session_time || "10:00 AM");
      }
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

  const handleModeChange = (mode) => {
    if (practiceMode === mode) return;
    setPracticeMode(mode);
  };

  const handleManualSync = async (patientId) => {
    if (practiceMode === "words" && wordTags.length < 3) {
      alert("Waabi requires at least 3 target words for an effective session.");
      return;
    }
    if (practiceMode === "sentence" && currentSentence.trim().length === 0) {
      alert("Please enter a practice phrase for Waabi.");
      return;
    }
    try {
      setUpdatingId(patientId);
      const { data: { user } } = await supabase.auth.getUser();
      const phonemesArray = phonemes.split(",").map((p) => p.trim()).filter((p) => p !== "");
      const sessionPayload = {
        patient_id: patientId,
        therapist_id: user.id,
        target_words: practiceMode === "words" ? wordTags : [],
        target_sentence: practiceMode === "sentence" ? currentSentence : "",
        difficulty_level: [difficultyLevel],
        therapy_goal: therapyGoal,
        phonemes_to_focus_on: phonemesArray,
        session_date: sessionDate,
        session_time: sessionTime,
        status: "upcoming",
      };
      if (activeSessionId) {
        const { error } = await supabase.from("sessions").update(sessionPayload).eq("id", activeSessionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("sessions").insert(sessionPayload).select().single();
        if (error) throw error;
        setActiveSessionId(data.id);
      }
      alert("Clinical plan synced! Waabi is now updated.");
    } catch (error) {
      alert("Failed to sync: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const markSessionComplete = async (patientId) => {
    if (!activeSessionId) {
      alert("No active session to complete!");
      return;
    }
    if (window.confirm("Archive this session into clinical reports?")) {
      try {
        setUpdatingId(patientId);
        const phonemesArray = phonemes.split(",").map((p) => p.trim()).filter((p) => p !== "");
        const archivePayload = {
          patient_id: patientId,
          target_word: practiceMode === "words" ? wordTags : [],
          target_sentence: practiceMode === "sentence" ? currentSentence : "",
          transcript: "Manual Archive",
          difficulty_level: [difficultyLevel],
          therapy_goals: therapyGoal,
          phonemes_to_focus_on: phonemesArray,
          created_at: new Date().toISOString(),
        };
        const { data: newReport, error: insertError } = await supabase.from("session_reports").insert(archivePayload).select().single();
        if (insertError) throw insertError;
        await supabase.from("sessions").delete().eq("id", activeSessionId);
        setSessionReports([newReport, ...sessionReports]);
        setActiveSessionId(null);
        setWordTags([]);
        setCurrentSentence("");
        setDifficultyLevel("Medium");
        setTherapyGoal("");
        setPhonemes("");
        alert("Session successfully archived! 📁");
      } catch (error) {
        alert("Failed to archive: " + error.message);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  const downloadCSV = (patient) => {
    if (sessionReports.length === 0) return;
    const headers = ["Patient Name", "Target Word", "Target Phonemes", "Accuracy (%)", "Date Completed"];
    const csvRows = [];
    sessionReports.forEach((report) => {
      const targetWords = Array.isArray(report.target_word) ? report.target_word : [];
      targetWords.forEach((word) => {
        csvRows.push([patient.full_name, word, "", report.accuracy ?? "", new Date(report.created_at).toLocaleString()].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      });
    });
    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${patient.full_name}_Reports.csv`);
    link.click();
  };

  const handleCustomDateSelect = (day) => {
    const newDate = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
    const offset = newDate.getTimezoneOffset();
    const formattedDate = new Date(newDate.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
    setSessionDate(formattedDate);
    setShowDatePicker(false);
  };

  const handleCustomTimeSelect = (time) => {
    setSessionTime(time);
    setShowTimePicker(false);
  };

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

  const addTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = e.target.value.trim().replace(",", "");
      if (value && !wordTags.includes(value)) {
        setWordTags([...wordTags, value]);
        e.target.value = "";
      }
    }
  };

  const removeTag = (indexToRemove) => setWordTags(wordTags.filter((_, index) => index !== indexToRemove));

  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay();

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-6">
        <Loader2 className="w-12 h-12 text-[#012b1d] animate-spin" />
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">Syncing Clinical Database...</p>
      </div>
    );

  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-20">
      
      {/* OPEN HEADER SECTION */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-[#012b1d] tracking-tight">Clinical Directory</h1>
          <div className="flex items-center gap-3 mt-2">
             <ShieldCheck size={16} className="text-[#064e3b]" />
             <p className="text-gray-400 font-semibold text-sm italic">Global oversight and therapy configuration</p>
          </div>
        </div>
      </header>

      {/* SEARCH INTERFACE */}
      <div className="relative group max-w-xl mb-12">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-300"><Search size={20} /></div>
        <input type="text" placeholder="Search patient roster..." className="block w-full pl-14 pr-6 py-5 bg-white border border-gray-50 rounded-[1.5rem] shadow-2xl shadow-gray-200/40 focus:ring-4 focus:ring-[#012b1d]/5 outline-none transition-all text-gray-700 font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 py-8 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">Patient</th>
                <th className="px-10 py-8 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">Assigned Therapist</th>
                <th className="px-10 py-8 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">Target Status</th>
                <th className="px-10 py-8 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.map((patient) => (
                <React.Fragment key={patient.id}>
                  <tr className={`group hover:bg-[#064e3b]/5 transition-all cursor-pointer ${expandedId === patient.id ? "bg-[#064e3b]/5" : ""}`} onClick={() => handleExpandPatient(patient.id)}>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-[#064e3b]/10 text-[#064e3b] rounded-2xl flex items-center justify-center font-extrabold text-base border border-[#064e3b]/5 shadow-inner">
                          {patient.full_name?.charAt(0) || "?"}
                        </div>
                        <span className="text-base font-extrabold text-gray-800 tracking-tight">{patient.full_name || "Unknown Patient"}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <UserCog size={16} className={patient.selected_therapist_id ? "text-[#172554]" : "text-orange-500"} />
                        <select className={`text-[10px] font-extrabold outline-none rounded-xl px-4 py-2.5 cursor-pointer transition-all border ${patient.selected_therapist_id ? "bg-[#172554]/5 text-[#172554] border-[#172554]/10" : "bg-orange-50 text-orange-700 border-orange-100"}`} value={patient.selected_therapist_id || ""} onChange={(e) => handleAssignTherapist(patient.id, e.target.value)} onClick={(e) => e.stopPropagation()} disabled={updatingId === patient.id}>
                          <option value="">-- Unassigned --</option>
                          {therapists.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em]">
                      {expandedId === patient.id && activeSessionId ? "Active Session" : "Configure Next"}
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="p-3 rounded-xl bg-gray-50 text-gray-400 inline-block group-hover:bg-white group-hover:shadow-md transition-all">
                        {expandedId === patient.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </td>
                  </tr>

                  {expandedId === patient.id && (
                    <tr className="bg-[#064e3b]/[0.02]">
                      <td colSpan="4" className="px-16 py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-top duration-500">
                          {/* LEFT COLUMN */}
                          <div className="space-y-10">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3 relative">
                                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6">Session Date</label>
                                <div onClick={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }} className="w-full bg-white border border-gray-100 rounded-[1.25rem] pl-12 py-5 text-[11px] font-extrabold text-gray-700 shadow-sm transition-all cursor-pointer flex items-center relative">
                                  <Calendar className="w-4 h-4 text-[#172554] absolute left-5" /> {sessionDate}
                                </div>
                                {showDatePicker && (
                                  <div className="absolute top-[90px] left-0 w-80 bg-white border border-gray-50 shadow-2xl rounded-[2.5rem] p-6 z-50">
                                    <div className="flex justify-between items-center mb-6">
                                      <button onClick={(e) => { e.stopPropagation(); setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1)); }} className="p-2 hover:bg-gray-50 rounded-xl"><ChevronLeft size={18} /></button>
                                      <span className="text-[11px] font-extrabold text-gray-800 uppercase tracking-widest">{monthNames[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}</span>
                                      <button onClick={(e) => { e.stopPropagation(); setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1)); }} className="p-2 hover:bg-gray-50 rounded-xl"><ChevronRight size={18} /></button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-[10px] font-extrabold text-gray-400 mb-4">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <span key={d}>{d}</span>)}</div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {[...Array(firstDayOfMonth)].map((_, i) => <div key={i} />)}
                                      {[...Array(daysInMonth)].map((_, i) => {
                                        const day = i + 1;
                                        return <button key={day} onClick={(e) => { e.stopPropagation(); handleCustomDateSelect(day); }} className={`p-2.5 text-xs font-bold rounded-xl hover:bg-[#064e3b]/5 text-gray-700`}>{day}</button>;
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-3 relative">
                                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6">Session Time</label>
                                <div onClick={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }} className="w-full bg-white border border-gray-100 rounded-[1.25rem] pl-12 py-5 text-[11px] font-extrabold text-gray-700 shadow-sm transition-all cursor-pointer flex items-center relative">
                                  <Clock className="w-4 h-4 text-[#172554] absolute left-5" /> {sessionTime}
                                </div>
                                {showTimePicker && (
                                  <div className="absolute top-[90px] left-0 w-full bg-white border border-gray-50 shadow-2xl rounded-[2.5rem] p-3 z-50 max-h-60 overflow-y-auto">
                                    {generateTimeSlots().map(time => <button key={time} onClick={(e) => { e.stopPropagation(); handleCustomTimeSelect(time); }} className={`w-full text-left px-5 py-4 rounded-2xl text-[11px] font-extrabold tracking-widest hover:bg-[#064e3b]/5 text-gray-700`}>{time}</button>)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3 relative"><label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6">Difficulty</label>
                                <select className="w-full bg-white border border-gray-100 rounded-[1.25rem] px-8 py-5 text-[11px] font-extrabold text-gray-700 outline-none focus:ring-4 focus:ring-[#012b1d]/5 shadow-sm appearance-none" value={difficultyLevel} onChange={e => setDifficultyLevel(e.target.value)}><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select></div>
                              <div className="space-y-3"><label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6">Focus Phonemes</label><input className="w-full bg-white border border-gray-100 rounded-[1.25rem] px-8 py-5 text-[11px] font-extrabold text-gray-700 outline-none focus:ring-4 focus:ring-[#012b1d]/5 shadow-sm" placeholder="e.g. /p/, /b/" value={phonemes} onChange={e => setPhonemes(e.target.value)} /></div>
                            </div>
                            <div className="space-y-3"><label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6">Therapy Goal</label><textarea rows="2" className="w-full bg-white border border-gray-100 rounded-[1.5rem] px-6 py-5 text-[11px] font-semibold text-gray-700 outline-none focus:ring-4 focus:ring-[#012b1d]/5 shadow-sm resize-none" value={therapyGoal} onChange={e => setTherapyGoal(e.target.value)} /></div>
                          </div>

                          {/* RIGHT COLUMN: MODERN CHOICE CARDS */}
                          <div className="flex flex-col h-full space-y-4">
                            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-6 mb-2">Practice Target (Choose One)</label>
                            
                            {/* WORDS MODE */}
                            <div onClick={() => handleModeChange("words")} className={`relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 ${practiceMode === "words" ? "border-[#012b1d] bg-white shadow-2xl shadow-[#012b1d]/5 ring-4 ring-[#012b1d]/5" : "border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200"}`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-2xl transition-all ${practiceMode === "words" ? "bg-[#012b1d] text-white" : "bg-white text-gray-300 shadow-sm"}`}><Target size={20} /></div>
                                  <span className={`font-extrabold text-sm ${practiceMode === "words" ? "text-gray-800" : "text-gray-400"}`}>Target Vocabulary</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${practiceMode === "words" ? "border-[#012b1d] bg-[#012b1d]" : "border-gray-200"}`}>{practiceMode === "words" && <CheckCircle size={14} className="text-white" strokeWidth={4} />}</div>
                              </div>
                              <div className={`overflow-hidden transition-all duration-500 ${practiceMode === "words" ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}>
                                <div className="w-full bg-gray-50/50 border border-[#064e3b]/10 rounded-[1.5rem] p-5 min-h-[120px] flex flex-wrap gap-3 shadow-inner">
                                  {wordTags.map((tag, i) => (<span key={i} className="bg-[#064e3b]/5 text-[#064e3b] px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-3 border border-[#064e3b]/10">{tag} <X size={14} className="cursor-pointer hover:text-red-500" onClick={e => { e.stopPropagation(); removeTag(i); }} /></span>))}
                                  <input className="flex-1 min-w-[150px] bg-transparent outline-none text-[11px] font-extrabold text-gray-700" placeholder="Type and press Enter..." onKeyDown={addTag} />
                                </div>
                              </div>
                            </div>

                            {/* SENTENCE MODE */}
                            <div onClick={() => handleModeChange("sentence")} className={`relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 ${practiceMode === "sentence" ? "border-[#172554] bg-white shadow-2xl shadow-[#172554]/5 ring-4 ring-[#172554]/5" : "border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200"}`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-2xl transition-all ${practiceMode === "sentence" ? "bg-[#172554] text-white" : "bg-white text-gray-300 shadow-sm"}`}><MessageSquare size={20} /></div>
                                  <span className={`font-extrabold text-sm ${practiceMode === "sentence" ? "text-gray-800" : "text-gray-400"}`}>Practice Phrase</span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${practiceMode === "sentence" ? "border-[#172554] bg-[#172554]" : "border-gray-200"}`}>{practiceMode === "sentence" && <CheckCircle size={14} className="text-white" strokeWidth={4} />}</div>
                              </div>
                              <div className={`overflow-hidden transition-all duration-500 ${practiceMode === "sentence" ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}>
                                <textarea className="w-full bg-gray-50/50 border border-[#172554]/10 rounded-[1.5rem] p-5 text-[11px] font-semibold text-gray-700 outline-none focus:ring-4 focus:ring-[#172554]/5 shadow-inner min-h-[120px] italic" value={currentSentence} onChange={e => setCurrentSentence(e.target.value)} placeholder="e.g. Can you pass the water?" />
                              </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="flex gap-5 pt-8 border-t border-gray-100">
                              <button onClick={() => handleManualSync(patient.id)} disabled={updatingId === patient.id} className="flex-1 bg-white border border-gray-200 text-[#012b1d] py-6 rounded-2xl font-extrabold text-[11px] uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-4">
                                {updatingId === patient.id ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={18} />} Sync Edits
                              </button>
                              {activeSessionId && (
                                <button onClick={() => markSessionComplete(patient.id)} disabled={updatingId === patient.id} className="flex-1 bg-[#012b1d] text-white py-6 rounded-2xl font-extrabold text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-[#012b1d]/20 hover:brightness-125 transition-all flex items-center justify-center gap-3">
                                  <CheckCircle size={18} /> Mark Complete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* DATA EXPORT FOOTER */}
                        <div className="mt-16 pt-10 border-t border-gray-100 animate-in slide-in-from-bottom duration-700">
                          <div className="bg-[#172554]/5 p-10 rounded-[3rem] border border-[#172554]/10 flex flex-col md:flex-row justify-between items-center gap-8 shadow-inner">
                            <div>
                              <h3 className="text-[11px] font-extrabold text-[#172554] uppercase tracking-[0.3em] flex items-center gap-3"><Download size={18} /> Clinical Data Export</h3>
                              <p className="text-sm text-gray-500 font-semibold mt-3 italic max-w-lg leading-relaxed">Download a formatted clinical dataset for {patient.full_name} containing historical accuracy and metrics.</p>
                            </div>
                            <button onClick={() => downloadCSV(patient)} disabled={sessionReports.length === 0} className="bg-white text-[#172554] px-12 py-5 rounded-2xl text-[11px] font-extrabold uppercase tracking-[0.2em] flex items-center justify-center gap-4 border border-[#172554]/20 shadow-xl transition-all disabled:opacity-40"><Download size={20} /> Download CSV</button>
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