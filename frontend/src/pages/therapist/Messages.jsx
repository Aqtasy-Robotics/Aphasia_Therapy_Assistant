import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

const TherapistMessages = () => {
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  
  // Realtime Chat State
  const [activeChat, setActiveChat] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [myId, setMyId] = useState(null);
  const [_loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  // 1. Fetch Assigned Patients (FIXED: Removed 'aphasia_type' to match schema)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMyId(user.id);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name") // <-- Fixed Query
          .eq("selected_therapist_id", user.id)
          .eq("role", "patient");
          
        if (error) {
          console.error("Error fetching patients:", error);
        } else {
          setAssignedPatients(data || []);
        }
      }
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  // 2. Fetch Message History (FIXED: Upgraded to a safer .in() array filter)
  useEffect(() => {
    if (!activeChat || !myId) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .in('sender_id', [myId, activeChat.id])
        .in('receiver_id', [myId, activeChat.id])
        .order('created_at', { ascending: true });

      if (!error && data) setMessages(data);
    };

    fetchHistory();
  }, [activeChat, myId]);

  // 3. Set up Realtime Subscription
  useEffect(() => {
    if (!activeChat || !myId) return;

    const channel = supabase
      .channel('realtime_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        const newMessage = payload.new;
        if (
          (newMessage.sender_id === activeChat.id && newMessage.receiver_id === myId) ||
          (newMessage.sender_id === myId && newMessage.receiver_id === activeChat.id)
        ) {
          setMessages((prev) => [...prev, newMessage]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, myId]);

  // 4. Auto-Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. Send Message Logic
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !myId) return;

    const textToSend = messageInput;
    setMessageInput(""); 

    const { error } = await supabase
      .from('messages')
      .insert([
        { 
          sender_id: myId, 
          receiver_id: activeChat.id, 
          content: textToSend 
        }
      ]);

    if (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const startConversation = (patient) => {
    setActiveChat(patient);
    setShowNewChatModal(false);
  };

  return (
    <div className="animate-in fade-in duration-700 font-sans antialiased pb-2">
      
      {/* HEADER */}
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

      {/* MAIN CONTAINER */}
      <div className="h-[calc(100vh-110px)] flex bg-white rounded-[2.5rem] overflow-hidden border border-gray-50 shadow-2xl shadow-gray-200/40">
        
        {/* ROSTER SIDEBAR */}
        <aside className="w-80 bg-gray-50/50 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-8 pb-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">Messages</h2>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="bg-[#012b1d] text-white p-2 rounded-xl hover:scale-105 transition-all shadow-sm"
              >
                <PlusCircle size={16} />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input 
                type="text" 
                placeholder="Search roster..." 
                className="w-full pl-9 pr-4 py-3 bg-white border border-transparent focus:border-gray-200 rounded-xl text-[10px] font-bold text-gray-700 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
            {assignedPatients.map((patient) => (
              <div 
                key={patient.id}
                onClick={() => startConversation(patient)}
                className={`p-4 rounded-2xl mb-2 cursor-pointer transition-all flex items-center gap-4 ${
                  activeChat?.id === patient.id 
                    ? "bg-[#012b1d] text-white shadow-md" 
                    : "hover:bg-white hover:shadow-sm text-gray-700 border border-transparent hover:border-gray-100"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-inner ${activeChat?.id === patient.id ? "bg-white/20 text-white" : "bg-gray-100 text-[#012b1d]"}`}>
                  {patient.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-xs truncate">{patient.full_name}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest truncate mt-0.5 ${activeChat?.id === patient.id ? "text-white/70" : "text-gray-400"}`}>
                    Active Patient
                  </p>
                </div>
              </div>
            ))}
            {assignedPatients.length === 0 && (
              <div className="text-center py-10">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Roster Empty</p>
              </div>
            )}
          </div>
        </aside>

        {/* CHAT INTERFACE */}
        <main className="flex-1 flex flex-col bg-white relative">
          
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#012b1d]/5 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none"></div>
              <div className="relative mb-8 group">
                <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border border-gray-100">
                  <Bot className="w-12 h-12 text-[#012b1d]" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-xl shadow-lg border border-gray-50">
                  <ShieldCheck className="w-5 h-5 text-[#064e3b]" />
                </div>
              </div>
              <h3 className="text-4xl font-extrabold text-gray-800 tracking-tight">Clinical Inbox</h3>
              <p className="text-gray-400 max-w-xs mt-4 font-semibold leading-relaxed text-xs italic">
                Select a patient from the roster or start a new conversation to begin secure messaging.
              </p>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="mt-10 bg-[#012b1d] text-white px-8 py-3.5 rounded-xl font-extrabold shadow-xl shadow-[#012b1d]/20 hover:brightness-110 hover:-translate-y-1 transition-all flex items-center gap-3 uppercase tracking-[0.2em] text-[10px]"
              >
                <PlusCircle size={16} /> New Conversation
              </button>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-50 bg-white/80 backdrop-blur-md flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 text-[#012b1d] rounded-xl flex items-center justify-center font-extrabold text-xs shadow-inner border border-gray-100">
                    {activeChat.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-800 tracking-tight">{activeChat.full_name}</h3>
                    <p className="text-[9px] font-bold text-[#064e3b] uppercase tracking-widest mt-0.5">Secure Session Active</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/10 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <MessageCircle className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-xs font-bold text-gray-500">No messages yet.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Send a message to start the clinical conversation.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === myId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] p-4 rounded-[1.5rem] shadow-sm ${
                          isMine 
                            ? "bg-[#012b1d] text-white rounded-br-sm" 
                            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
                        }`}>
                          <p className="text-sm font-semibold leading-relaxed">{msg.content}</p>
                          <p className={`text-[9px] font-bold mt-2 text-right ${isMine ? "text-white/50" : "text-gray-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-6 border-t border-gray-50 bg-white">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-4 bg-gray-50 p-2.5 rounded-2xl border border-gray-100 focus-within:ring-4 focus-within:ring-[#012b1d]/5 transition-all">
                  <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Type a clinical message..." 
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-gray-700 px-2"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                  />
                  <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button 
                    type="submit" 
                    disabled={!messageInput.trim()}
                    className="bg-[#012b1d] p-3 rounded-xl text-white hover:brightness-125 transition-all disabled:opacity-50 disabled:hover:brightness-100"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </main>
      </div>

      {/* NEW CONVERSATION MODAL */}
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
                      onClick={() => startConversation(patient)}
                      className="p-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-[#012b1d] hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#012b1d] group-hover:bg-[#012b1d] group-hover:text-white transition-all font-extrabold text-sm shadow-inner">
                          {patient.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-800 text-sm group-hover:text-[#012b1d] transition-colors">{patient.full_name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Patient</p>
                        </div>
                      </div>
                      <MessageCircle size={18} className="text-gray-200 group-hover:text-[#012b1d]" />
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