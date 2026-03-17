import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { 
  Search, Calendar, Loader2, User, Target, MessageSquare, 
  Save, ChevronDown, ChevronUp, Info, X 
} from "lucide-react";

const MyPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Local state for managing individual word tags while editing
  const [wordTags, setWordTags] = useState([]);

  useEffect(() => {
    fetchMyPatients();
  }, []);

  const fetchMyPatients = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .eq("selected_therapist_id", user.id);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle adding words to the tag list
  const addTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = e.target.value.trim().replace(',', '');
      if (value && !wordTags.includes(value)) {
        setWordTags([...wordTags, value]);
        e.target.value = '';
      }
    }
  };

  const removeTag = (indexToRemove) => {
    setWordTags(wordTags.filter((_, index) => index !== indexToRemove));
  };

  const handleUpdateClinicalData = async (patientId) => {
    if (wordTags.length < 3) {
      alert("Waabi requires at least 3 target words for an effective session.");
      return;
    }

    const sentences = document.getElementById(`sentences-${patientId}`).value;

    try {
      setUpdatingId(patientId);
      const { error } = await supabase
        .from("profiles")
        .update({
          target_words: wordTags.join(', '), // Save as comma-separated string
          target_sentences: sentences,
        })
        .eq("id", patientId);

      if (error) throw error;
      
      setPatients(prev => prev.map(p => p.id === patientId ? { 
        ...p, 
        target_words: wordTags.join(', '), 
        target_sentences: sentences 
      } : p));
      
      alert("Clinical plan synced! Waabi is now updated. 🤖");
    } catch (error) {
      alert("Sync failed: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="w-12 h-12 text-[#5cb338] animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Syncing Clinical Database...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Clinical Directory</h1>
          <p className="text-gray-500 font-medium mt-1 italic">Configure individual vocabulary and practice targets</p>
        </div>
      </div>

      {/* Search */}
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
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Vocabulary</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.map((patient) => (
                <React.Fragment key={patient.id}>
                  <tr 
                    className={`group hover:bg-[#f0fff4]/30 transition-all cursor-pointer ${expandedId === patient.id ? 'bg-[#f0fff4]/20' : ''}`}
                    onClick={() => {
                      if (expandedId === patient.id) {
                        setExpandedId(null);
                      } else {
                        setExpandedId(patient.id);
                        // Convert DB string back to tags for the UI
                        setWordTags(patient.target_words ? patient.target_words.split(',').map(s => s.trim()) : []);
                      }
                    }}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#f0fff4] text-[#5cb338] rounded-xl flex items-center justify-center font-black text-sm border border-green-50 shadow-inner">
                          {patient.full_name?.charAt(0)}
                        </div>
                        <span className="text-sm font-black text-gray-800">{patient.full_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[300px]">
                        {patient.target_words || "No targets set"}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="p-2 rounded-lg bg-gray-50 text-gray-400 inline-block">
                        {expandedId === patient.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED CONFIG SECTION */}
                  {expandedId === patient.id && (
                    <tr className="bg-[#f0fff4]/10">
                      <td colSpan="3" className="px-12 py-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-top duration-500">
                          
                          {/* Tag-Based Vocabulary Input */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <Target className="w-3.5 h-3.5 text-[#5cb338]" /> Target Vocabulary
                              </label>
                              <div className="group relative">
                                <Info className="w-4 h-4 text-gray-300 cursor-help hover:text-[#5cb338] transition-colors" />
                                <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Enter at least 3 individual words. Press "Enter" or "," after each word.
                                </div>
                              </div>
                            </div>
                            
                            <div className="w-full bg-white border border-gray-100 rounded-3xl p-4 min-h-[140px] focus-within:ring-4 focus-within:ring-[#5cb338]/10 transition-all flex flex-wrap gap-2 content-start">
                              {wordTags.map((tag, index) => (
                                <span key={index} className="bg-green-50 text-[#5cb338] px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 border border-green-100 animate-in zoom-in-75 duration-300">
                                  {tag}
                                  <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeTag(index)} />
                                </span>
                              ))}
                              <input 
                                className="flex-1 min-w-[120px] bg-transparent outline-none text-xs font-bold text-gray-700 py-1.5"
                                placeholder={wordTags.length === 0 ? "Add words individually..." : ""}
                                onKeyDown={addTag}
                              />
                            </div>
                            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic ml-2">
                              {wordTags.length} words added (Minimum 3 required)
                            </p>
                          </div>

                          {/* Sentence Section */}
                          <div className="space-y-4 flex flex-col">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Practice Phrases
                            </label>
                            <textarea 
                              className="flex-1 bg-white border border-gray-100 rounded-3xl p-6 text-xs font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100/50 transition-all resize-none min-h-[140px]"
                              placeholder="e.g. Can you pass the water? I feel better today."
                              defaultValue={patient.target_sentences}
                              id={`sentences-${patient.id}`}
                            />
                            
                            <button 
                              onClick={() => handleUpdateClinicalData(patient.id)}
                              disabled={updatingId === patient.id}
                              className="mt-4 bg-[#5cb338] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                              {updatingId === patient.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
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