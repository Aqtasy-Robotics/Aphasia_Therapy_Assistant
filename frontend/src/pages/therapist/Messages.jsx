import React, { useState } from "react";
import { 
  Search, 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile,
  CheckCheck
} from "lucide-react";

const TherapistMessages = () => {
  const [activeChat, setActiveChat] = useState(1);
  const [messageInput, setMessageInput] = useState("");

  const contacts = [
    { id: 1, name: "Sarah Johnson", lastMsg: "Thank you for the session!", time: "10:24 AM", unread: 2, online: true },
    { id: 2, name: "Michael Brown", lastMsg: "Can we reschedule for Tuesday?", time: "Yesterday", unread: 0, online: false },
    { id: 3, name: "Emma Wilson", lastMsg: "The exercises are going well.", time: "Yesterday", unread: 0, online: true },
    { id: 4, name: "James Davis", lastMsg: "I had some trouble with word recall today.", time: "Monday", unread: 0, online: false },
  ];

  const currentMessages = [
    { id: 1, sender: "patient", text: "Hello Dr., I was wondering about the frequency of my home exercises?", time: "09:15 AM" },
    { id: 2, sender: "therapist", text: "Hi Sarah! You should stick to 20 minutes once a day for now.", time: "09:20 AM" },
    { id: 3, sender: "patient", text: "Understood. Should I focus more on the visual prompts?", time: "09:21 AM" },
    { id: 4, sender: "therapist", text: "Yes, definitely. The Aqtasy robot will prioritize those in your next session to help with associations.", time: "09:25 AM" },
    { id: 5, sender: "patient", text: "Thank you for the session!", time: "10:24 AM" },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      
      {/* LEFT: CONTACTS LIST */}
      <div className="w-80 border-r border-gray-100 flex flex-col">
        <div className="p-6 border-b border-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#5cb338] outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <div 
              key={contact.id}
              onClick={() => setActiveChat(contact.id)}
              className={`p-4 flex gap-3 cursor-pointer transition-all border-b border-gray-50
                ${activeChat === contact.id ? 'bg-[#f0fff4]' : 'hover:bg-gray-50'}`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-[#5cb338]">
                  {contact.name.charAt(0)}
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#5cb338] border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-gray-800 truncate">{contact.name}</h4>
                  <span className="text-[10px] text-gray-400">{contact.time}</span>
                </div>
                <p className={`text-xs truncate ${contact.unread > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                  {contact.lastMsg}
                </p>
              </div>
              {contact.unread > 0 && (
                <div className="bg-[#5cb338] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full mt-1">
                  {contact.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: CHAT WINDOW */}
      <div className="flex-1 flex flex-col bg-gray-50/30">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[#5cb338]">
              {contacts.find(c => c.id === activeChat)?.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800">
                {contacts.find(c => c.id === activeChat)?.name}
              </h4>
              <p className="text-[10px] text-[#5cb338] font-bold uppercase tracking-wider">Patient</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button className="hover:text-[#5cb338]"><Phone className="w-5 h-5" /></button>
            <button className="hover:text-[#5cb338]"><Video className="w-5 h-5" /></button>
            <button className="hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'therapist' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] p-4 rounded-2xl text-sm shadow-sm
                ${msg.sender === 'therapist' 
                  ? 'bg-[#5cb338] text-white rounded-tr-none' 
                  : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'}`}
              >
                <p>{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1 text-[10px] justify-end
                  ${msg.sender === 'therapist' ? 'text-green-100' : 'text-gray-400'}`}>
                  {msg.time}
                  {msg.sender === 'therapist' && <CheckCheck className="w-3 h-3" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-6 bg-white border-t border-gray-100">
          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <button className="p-2 text-gray-400 hover:text-[#5cb338]"><Paperclip className="w-5 h-5" /></button>
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 px-2"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <button className="p-2 text-gray-400 hover:text-[#5cb338]"><Smile className="w-5 h-5" /></button>
            <button className="bg-[#5cb338] p-2.5 rounded-xl text-white hover:bg-[#4a912d] transition-all shadow-md">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TherapistMessages;