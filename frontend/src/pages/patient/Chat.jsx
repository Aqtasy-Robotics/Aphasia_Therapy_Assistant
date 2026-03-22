import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import {
  Send,
  MessageCircle,
  Smile,
  Bot,
  ShieldCheck,
  Loader2,
} from "lucide-react";

const PatientChat = () => {
  const [myId, setMyId] = useState(null);
  const [therapist, setTherapist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);

  // FIX: Use a ref for the container to isolate scrolling
  const chatContainerRef = useRef(null);

  // 1. Fetch Current User & Assigned Therapist
  useEffect(() => {
    const fetchSetupData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMyId(user.id);

        // Find assigned therapist ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("selected_therapist_id")
          .eq("id", user.id)
          .single();

        if (profile?.selected_therapist_id) {
          // Fetch therapist details
          const { data: therapistData } = await supabase
            .from("profiles")
            .select("id, full_name, clinic_name")
            .eq("id", profile.selected_therapist_id)
            .single();

          if (therapistData) setTherapist(therapistData);
        }
      }
      setLoading(false);
    };
    fetchSetupData();
  }, []);

  // 2. Fetch Chat History
  useEffect(() => {
    if (!myId || !therapist) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${therapist.id}),and(sender_id.eq.${therapist.id},receiver_id.eq.${myId})`
        )
        .order("created_at", { ascending: true });

      if (!error && data) setMessages(data);
    };

    fetchHistory();
  }, [myId, therapist]);

  // 3. Realtime Subscription
  useEffect(() => {
    if (!myId || !therapist) return;

    const channel = supabase
      .channel("patient_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new;
          if (
            (newMessage.sender_id === myId && newMessage.receiver_id === therapist.id) ||
            (newMessage.sender_id === therapist.id && newMessage.receiver_id === myId)
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, therapist]);

  // 4. Auto-Scroll (Isolated to prevent page shifting)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // 5. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !myId || !therapist) return;

    const textToSend = messageInput;
    setMessageInput(""); // Clear input instantly

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: myId,
        receiver_id: therapist.id,
        content: textToSend,
      },
    ]);

    if (error) {
      console.error("Failed to send:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] shadow-xl shadow-[#172554]/5 border border-gray-100 font-sans antialiased">
        <Loader2 className="w-12 h-12 animate-spin text-[#172554] mb-4" />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-gray-400">
          Loading Secure Chat...
        </span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[500px] flex bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl shadow-[#172554]/5 font-sans antialiased">
      
      {/* LEFT: CLINIC CONTACTS */}
      <aside className="hidden md:flex w-80 bg-gray-50/50 border-r border-gray-100 flex-col relative shrink-0">
        <div className="p-8">
          <h2 className="text-2xl font-extrabold text-[#172554] tracking-tight">
            Messages
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5cb338] animate-pulse"></div>
            <p className="text-[10px] text-[#5cb338] font-extrabold uppercase tracking-[0.3em]">
              Support Active
            </p>
          </div>
        </div>

        {therapist ? (
          <div className="p-6">
            <div className="p-5 bg-white border border-[#172554]/10 rounded-[1.5rem] shadow-sm flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-[#172554] text-white rounded-[1rem] flex items-center justify-center font-extrabold text-xl shadow-inner mb-4">
                {therapist.full_name?.charAt(0)}
              </div>
              <h3 className="font-extrabold text-gray-800 text-sm tracking-tight">
                {therapist.full_name}
              </h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Primary Therapist
              </p>
              {therapist.clinic_name && (
                <p className="text-[10px] font-semibold text-[#172554] mt-3 bg-[#172554]/5 px-3 py-1.5 rounded-lg border border-[#172554]/10">
                  {therapist.clinic_name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-inner border border-gray-100">
              <MessageCircle className="text-gray-300 w-8 h-8" />
            </div>
            <div className="max-w-[180px]">
              <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-widest">
                No Active Chats
              </p>
              <p className="text-[10px] text-gray-400 font-bold mt-2 leading-relaxed italic">
                Once assigned, your therapist will appear here.
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* RIGHT: CHAT INTERFACE */}
      <main className="flex-1 flex flex-col bg-white relative">
        {!therapist ? (
          /* NO THERAPIST ASSIGNED VIEW */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-10 group">
              <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border border-gray-100 transition-transform duration-500 group-hover:scale-110">
                <Bot className="w-12 h-12 text-[#172554]" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-gray-50 transition-transform duration-500 group-hover:rotate-12">
                <Smile className="w-5 h-5 text-[#5cb338]" />
              </div>
            </div>

            <h3 className="text-3xl font-extrabold text-[#172554] tracking-tight">
              Hello there!
            </h3>
            <p className="text-gray-400 max-w-sm mt-4 font-semibold leading-relaxed text-sm italic">
              This is your secure clinical space. Once your therapist sets up
              your account, you will be able to message them directly here.
            </p>
          </div>
        ) : (
          /* ACTIVE CHAT VIEW */
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-gray-50 bg-white flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#172554]/5 text-[#172554] rounded-[1rem] flex items-center justify-center font-extrabold text-sm border border-[#172554]/10">
                  {therapist.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 tracking-tight text-sm">
                    {therapist.full_name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-[#5cb338]" />
                    <p className="text-[9px] font-bold text-[#5cb338] uppercase tracking-widest">
                      Secure Connection
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50/30 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <MessageCircle className="w-10 h-10 text-[#172554]/30 mb-4" />
                  <p className="text-xs font-bold text-gray-500">
                    Secure connection established.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Send a message to your therapist to begin.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === myId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] md:max-w-[70%] p-4 rounded-[1.5rem] shadow-sm ${
                          isMine
                            ? "bg-[#172554] text-white rounded-br-sm"
                            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm font-semibold leading-relaxed">
                          {msg.content}
                        </p>
                        <p className={`text-[9px] font-bold mt-2 text-right ${isMine ? "text-white/50" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white border-t border-gray-50 shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="max-w-4xl mx-auto flex items-center gap-3 bg-gray-50/80 p-1.5 pl-5 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-[#172554]/10 transition-all shadow-sm"
              >
                <input
                  type="text"
                  placeholder="Message your therapist..."
                  className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-gray-700 py-2 placeholder:text-gray-400"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="bg-[#172554] p-2.5 rounded-full text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:hover:brightness-100 flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PatientChat;