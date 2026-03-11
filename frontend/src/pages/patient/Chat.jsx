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
  // Empty state: no messages and no selected contact yet
  const [messages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  return (
    <div className="h-[calc(100vh-140px)] flex bg-[#f8fafc] rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
      
      {/* LEFT: CLINIC CONTACTS (EMPTY) */}
      <aside className="w-80 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-8">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Messages</h2>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-widest">Support Team</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-[2rem] flex items-center justify-center">
            <MessageCircle className="text-gray-200 w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-800 uppercase">No Contacts</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1 leading-relaxed">
              Once your therapist assigns Waabi to you, they will appear here.
            </p>
          </div>
        </div>
      </aside>

      {/* RIGHT: CHAT INTERFACE (EMPTY) */}
      <main className="flex-1 flex flex-col bg-white">
        
        {/* INITIAL WELCOME VIEW */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-[white] rounded-[2.5rem] flex items-center justify-center shadow-inner">
              <Bot className="w-12 h-12 text-[blue]" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md border border-gray-50">
              <Smile className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          <h3 className="text-3xl font-black text-gray-800 tracking-tight">Hello there!</h3>
          <p className="text-gray-500 max-w-sm mt-4 font-medium leading-relaxed">
            This is your secure space to talk to your therapist or get help with your 
            Waabi robot. Your first message is just a click away!
          </p>

          <button className="mt-10 bg-[#4f6ef7] text-white px-10 py-5 rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs">
            <PlusCircle className="w-5 h-5" />
            Start New Chat
          </button>
        </div>

        {/* INPUT AREA (DISABLED STATE) */}
        <div className="p-8 border-t border-gray-50 bg-gray-50/30 opacity-60">
          <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100">
            <button disabled className="p-3 text-gray-300">
              <Paperclip className="w-6 h-6" />
            </button>
            <input 
              type="text" 
              disabled
              placeholder="Select a contact to type..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-400 px-2 cursor-not-allowed"
            />
            <button disabled className="bg-gray-100 p-4 rounded-2xl text-white">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PatientChat;