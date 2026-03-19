import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { 
  Send, 
  MessageCircle, 
  PlusCircle, 
  Smile, 
  Paperclip,
  Bot,
  Search,
  ShieldCheck,
  X,
  User,
  UserPlus
} from "lucide-react";

const TherapistMessages = () => {
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [_activeChat, _setActiveChat] = useState(null);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedPatients = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, aphasia_type")
          .eq("selected_therapist_id", user.id)
          .eq("role", "patient");
        if (!error) setAssignedPatients(data);
      }
      setLoading(false);
    };
    fetchAssignedPatients();
  }, []);

  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-2">
      
      {/* --- HEADER SECTION --- */}
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-[#012b1d] tracking-tight">
            Clinical Messages
          </h1>
          <div className="flex items-center gap-2 mt-1">
             <ShieldCheck size={14} className="text-[#064e3b]" />
             <p className="text-gray-400 font-semibold text-xs italic">
               Secure HIPAA-compliant channel
             </p>
          </div>
        </div>
      </header>

      {/* --- MAXIMIZED CONTAINER / COMPACT CONTENT --- */}
      <div className="h-[calc(100vh-110px)] flex bg-white rounded-[2.5rem] overflow-hidden border border-gray-50 shadow-2xl shadow-gray-200/40">
        
        {/* LEFT: ROSTER ASIDE (Narrower & Tighter) */}
        <aside className="w-80 bg-gray-50/50 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-8">
            <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">Messages</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1 h-1 rounded-full bg-[#064e3b] animate-pulse"></div>
              <p className="text-[9px] text-[#064e3b] font-extrabold uppercase tracking-[0.3em]">Roster Active</p>
            </div>
            
            <div className="relative mt-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input 
                type="text" 
                disabled
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-3 bg-white border border-transparent rounded-xl text-[9px] font-bold text-gray-400 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner border border-gray-100">
              <MessageCircle className="text-gray-100 w-8 h-8" />
            </div>
            <div className="max-w-[160px]">
              <p className="text-[10px] font-extrabold text-gray-800 uppercase tracking-widest">No Active Chats</p>
              <p className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed italic">
                Select a patient to begin.
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT: CHAT INTERFACE (Max Height / Compact UI) */}
        <main className="flex-1 flex flex-col bg-white relative">
          
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-y-auto">
            {/* Background Accents (Smaller Blur) */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#012b1d]/5 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none"></div>

            <div className="relative mb-8 group">
              <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border border-gray-100">
                <Bot className="w-12 h-12 text-[#012b1d]" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-xl shadow-lg border border-gray-50">
                <Smile className="w-5 h-5 text-[#064e3b]" />
              </div>
            </div>

            <h3 className="text-4xl font-extrabold text-gray-800 tracking-tight">Clinical Inbox</h3>
            <p className="text-gray-400 max-w-xs mt-4 font-semibold leading-relaxed text-xs italic">
              Encrypted portal for patient communication. Manage targets and review session logs securely.
            </p>

            <button 
              onClick={() => setShowNewChatModal(true)}
              className="mt-10 bg-[#012b1d] text-white px-8 py-3.5 rounded-xl font-extrabold shadow-xl shadow-[#012b1d]/20 hover:brightness-110 hover:-translate-y-1 transition-all flex items-center gap-3 uppercase tracking-[0.2em] text-[10px]"
            >
              <PlusCircle size={16} />
              New Conversation
            </button>
          </div>

          {/* COMPACT INPUT AREA (Slimmer Padding) */}
          <div className="p-8 border-t border-gray-50 bg-gray-50/20">
            <div className="max-w-3xl mx-auto flex items-center gap-4 bg-white p-3 rounded-2xl shadow-xl shadow-gray-200/30 border border-gray-50 opacity-80">
              <button disabled className="p-2 text-gray-300">
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                type="text" 
                disabled
                placeholder="Select a patient..." 
                className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-gray-400 px-1 cursor-not-allowed"
              />
              <button disabled className="p-2 text-gray-300">
                <Smile className="w-5 h-5" />
              </button>
              <button disabled className="bg-gray-100 p-4 rounded-xl text-white">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* --- MODAL (Refined & Smaller) --- */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#012b1d]/40 backdrop-blur-md" onClick={() => setShowNewChatModal(false)}></div>
          
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/40">
              <div>
                <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">New Message</h2>
                <p className="text-[9px] font-extrabold text-[#064e3b] uppercase tracking-[0.3em] mt-1">Clinical Roster</p>
              </div>
              <button onClick={() => setShowNewChatModal(false)} className="p-2.5 bg-white rounded-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              {assignedPatients.length > 0 ? (
                <div className="space-y-3">
                  {assignedPatients.map((patient) => (
                    <div 
                      key={patient.id}
                      className="p-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-[#012b1d] hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#012b1d] group-hover:bg-[#012b1d] group-hover:text-white transition-all">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-800 text-sm">{patient.full_name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{patient.aphasia_type}</p>
                        </div>
                      </div>
                      <PlusCircle size={18} className="text-gray-200 group-hover:text-[#012b1d]" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-10 text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">No Patients Assigned</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistMessages;