import React, { useState } from "react";
import { 
  Search, 
  Send, 
  MoreVertical, 
  Paperclip, 
  Smile,
  MessageSquare,
  UserPlus
} from "lucide-react";

const TherapistMessages = () => {
  // Empty states for first-time login
  const [contacts] = useState([]); 
  const [activeChat, setActiveChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      
      {/* LEFT: CONTACTS LIST (EMPTY) */}
      <div className="w-80 border-r border-gray-100 flex flex-col">
        <div className="p-6 border-b border-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              disabled
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
            <MessageSquare className="text-gray-300 w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-800">No chats yet</p>
          <p className="text-[10px] text-gray-400 mt-1">
            Your patient conversations will appear here.
          </p>
        </div>
      </div>

      {/* RIGHT: CHAT WINDOW (EMPTY STATE) */}
      <div className="flex-1 flex flex-col bg-gray-50/30">
        {activeChat ? (
          /* This section would render if a chat was active */
          <div className="flex-1 flex flex-col">
            {/* ... chat header and messages would go here ... */}
          </div>
        ) : (
          /* INITIAL EMPTY STATE VIEW */
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-6">
              <MessageSquare className="text-[#5cb338] w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Your Inbox</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Stay connected with your patients. Send progress updates, session reminders, or answer therapeutic questions.
            </p>
            <button className="mt-8 bg-[#5cb338] hover:bg-[#4a912d] text-white px-6 py-3 rounded-xl font-bold flex items-center transition-all shadow-md group">
              <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Start a Conversation
            </button>
          </div>
        )}

        {/* Chat Input (Disabled until a chat is selected) */}
        <div className="p-6 bg-white border-t border-gray-100 opacity-50 pointer-events-none">
          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <button className="p-2 text-gray-400"><Paperclip className="w-5 h-5" /></button>
            <input 
              type="text" 
              disabled
              placeholder="Select a patient to message..." 
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-400 px-2"
            />
            <button className="p-2 text-gray-400"><Smile className="w-5 h-5" /></button>
            <button className="bg-gray-200 p-2.5 rounded-xl text-white">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TherapistMessages;