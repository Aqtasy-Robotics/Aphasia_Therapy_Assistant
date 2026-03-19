import React, { useState } from "react";
import { 
  Send, 
  MessageCircle, 
  PlusCircle, 
  Smile, 
  Paperclip,
  Bot
} from "lucide-react";

const PatientChat = () => {
  // Logic preserved as requested
  const [_messages] = useState([]);
  const [_messageInput, _setMessageInput] = useState("");

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-[3.5rem] overflow-hidden border border-gray-50 shadow-2xl shadow-gray-200/40 font-sans antialiased">
      
      {/* LEFT: CLINIC CONTACTS (EMPTY STATE) */}
      <aside className="w-85 bg-gray-50/50 border-r border-gray-100 flex flex-col relative">
        {/* Subtle glass rim for the aside */}
        <div className="absolute inset-y-0 right-0 w-[1px] bg-white pointer-events-none"></div>

        <div className="p-10">
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Messages</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#064e3b] animate-pulse"></div>
            <p className="text-[10px] text-[#064e3b] font-extrabold uppercase tracking-[0.3em]">Support Active</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-white rounded-[2.5rem] flex items-center justify-center shadow-inner border border-gray-100">
            <MessageCircle className="text-gray-200 w-10 h-10" />
          </div>
          <div className="max-w-[180px]">
            <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-widest">No Active Chats</p>
            <p className="text-[10px] text-gray-400 font-bold mt-2 leading-relaxed italic">
              Once your clinical team assigns Waabi, they will appear here.
            </p>
          </div>
        </div>
      </aside>

      {/* RIGHT: CHAT INTERFACE (INITIAL VIEW) */}
      <main className="flex-1 flex flex-col bg-white relative">
        
        {/* INITIAL WELCOME VIEW */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="relative mb-10 group">
            <div className="w-28 h-28 bg-gray-50 rounded-[3rem] flex items-center justify-center shadow-inner border border-gray-100 transition-transform duration-500 group-hover:scale-110">
              <Bot className="w-14 h-14 text-[#172554]" />
            </div>
            {/* Smile icon updated to Forest Green */}
            <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-gray-50 transition-transform duration-500 group-hover:rotate-12">
              <Smile className="w-6 h-6 text-[#064e3b]" />
            </div>
          </div>

          <h3 className="text-4xl font-extrabold text-gray-800 tracking-tight">Hello there!</h3>
          <p className="text-gray-400 max-w-sm mt-5 font-semibold leading-relaxed text-sm italic">
            This is your secure clinical space to talk to your therapist or get help with your 
            Waabi robot. Your first message is just a click away!
          </p>

          <button className="mt-12 bg-[#172554] text-white px-12 py-6 rounded-[2.5rem] font-extrabold shadow-2xl shadow-[#172554]/20 hover:brightness-110 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-4 uppercase tracking-[0.2em] text-[11px]">
            <PlusCircle className="w-5 h-5" />
            Start New Clinical Chat
          </button>
        </div>

        {/* INPUT AREA (DISABLED STATE) */}
        <div className="p-10 border-t border-gray-50 bg-gray-50/20 opacity-80">
          <div className="max-w-4xl mx-auto flex items-center gap-5 bg-white p-4 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50">
            <button disabled className="p-3 text-gray-300 hover:text-[#172554] transition-colors">
              <Paperclip className="w-6 h-6" />
            </button>
            <input 
              type="text" 
              disabled
              placeholder="Select a medical contact to type..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-400 px-2 cursor-not-allowed placeholder:text-gray-300"
            />
            <button disabled className="bg-gray-100 p-5 rounded-[1.75rem] text-white shadow-sm">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PatientChat;