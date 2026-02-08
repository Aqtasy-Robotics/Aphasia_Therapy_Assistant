import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Clock, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const MySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [therapistId, setTherapistId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Get the assigned therapist info
        const { data: profile } = await supabase
          .from("profiles")
          .select("selected_therapist_id")
          .eq("id", user.id)
          .single();

        setTherapistId(profile?.selected_therapist_id || null);

        // 2. Load all sessions scheduled for this patient
        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("patient_id", user.id)
          .order('session_date', { ascending: true });
        
        setSessions(data || []);
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if(window.confirm("Are you sure you want to cancel this therapy session?")) {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      
      if (error) {
        alert("Could not cancel session: " + error.message);
      } else {
        fetchInitialData();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-blue-600 animate-pulse">
        <Loader2 className="mr-2 animate-spin" /> Syncing Waabi...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800">My Sessions</h1>
        <p className="text-gray-500">View and manage sessions scheduled by your therapist</p>
      </div>

      {/* ALERT IF NO THERAPIST ASSIGNED */}
      {!therapistId && (
        <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-amber-600" />
          <p className="text-amber-900 text-sm font-bold">
            No therapist assigned. Please contact your clinic or update your{" "}
            <Link to="/profile" className="underline font-black">Profile</Link>.
          </p>
        </div>
      )}

      {/* SESSION LIST */}
      <div className="grid gap-4">
        {sessions.length > 0 ? (
          sessions.map((s) => (
            <div key={s.id} className="p-6 bg-white border border-gray-100 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-xl shadow-inner">🤖</div>
                <div>
                  <p className="font-black text-gray-800">{s.bot_name} Therapy Session</p>
                  <p className="text-xs font-bold text-blue-500 flex items-center gap-1 uppercase tracking-wider">
                    <Clock size={12} /> {s.session_date} @ {s.session_time}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => handleCancel(s.id)} 
                className="group flex items-center gap-2 text-gray-300 hover:text-red-500 transition-colors font-bold text-xs"
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">CANCEL</span>
                <Trash2 size={20} />
              </button>
            </div>
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
            <p className="text-gray-400 font-medium">No sessions scheduled yet.</p>
            <p className="text-gray-300 text-xs mt-1">Your therapist will add sessions here soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySessions;