import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Clock, Plus, X, Trash2 } from "lucide-react";

const MySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2026-01-30");
  const [selectedTime, setSelectedTime] = useState("10:00 AM");

  useEffect(() => {
    fetchMySessions();
  }, []);

  // 1. LOAD SESSIONS
  const fetchMySessions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("patient_id", user.id); // Only get sessions for the patient who had signed in
      
      setSessions(data || []);
    }
    setLoading(false);
  };

  // 2. BOOK SESSION
  const handleBook = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("sessions").insert([
        {
          patient_id: user.id,
          session_date: selectedDate,
          session_time: selectedTime,
          bot_name: "Waabi"
        }
      ]);

      if (error) {
        alert(error.message);
      } else {
        setIsModalOpen(false);
        fetchMySessions(); // Refresh the list immediately
      }
    }
  };

  // 3. CANCEL SESSION
  const handleCancel = async (id) => {
    await supabase.from("sessions").delete().eq("id", id);
    fetchMySessions();
  };

  if (loading) return <div className="p-10 text-center font-bold">Loading Waabi...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">My Sessions</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          + Book Session
        </button>
      </div>

      {/* SESSION LIST */}
      <div className="space-y-4">
        {sessions.length > 0 ? (
          sessions.map((s) => (
            <div key={s.id} className="p-6 bg-white border rounded-2xl flex justify-between items-center shadow-sm">
              <div>
                <p className="font-bold text-lg">{s.bot_name}</p>
                <p className="text-sm text-gray-500">{s.session_date} at {s.session_time}</p>
              </div>
              <button onClick={() => handleCancel(s.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg">
                <Trash2 size={20} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-400 italic text-center py-10">No sessions booked yet.</p>
        )}
      </div>

      {/* SIMPLE BOOKING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm">
            <h2 className="text-2xl font-black mb-6">Schedule Waabi</h2>
            
            <div className="space-y-4">
              <input 
                type="date" 
                className="w-full p-3 bg-gray-50 rounded-xl border" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <input 
                type="time" 
                className="w-full p-3 bg-gray-50 rounded-xl border" 
                onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    const suffix = h >= 12 ? 'PM' : 'AM';
                    setSelectedTime(`${((h % 12) || 12)}:${m} ${suffix}`);
                }}
              />
              <button 
                onClick={handleBook}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mt-4"
              >
                Confirm Booking
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full text-gray-400 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySessions;