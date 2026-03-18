import React, { useState } from "react";
import { BookOpen, Mic, Pizza, Box, Users, Plus } from "lucide-react";

const MyWords = () => {
  // 1. Initial State
  const [_words] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");

  // 2. Updated Branding Constants
  const emptyMessages = {
    All: "Your clinical dictionary is ready. Start practicing with Waabi to begin your vocabulary collection.",
    Food: "No nutritional vocabulary practiced yet. Waabi can help you master words like 'Apple' or 'Water'.",
    Objects: "Your objects library is empty. Soon you will see clinical targets like 'Keys' or 'Books' here.",
    People: "No social roles practiced yet. We can start with 'Family' or 'Doctor' during your next session."
  };

  const categoryIcons = {
    All: <BookOpen className="w-12 h-12 text-[#172554]" />,
    Food: <Pizza className="w-12 h-12 text-orange-500" />,
    Objects: <Box className="w-12 h-12 text-blue-500" />,
    People: <Users className="w-12 h-12 text-purple-500" />
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 font-sans">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">My Words</h1>
          <p className="text-gray-500 font-semibold mt-2 text-sm italic">
            Explore and review the vocabulary you have mastered
          </p>
        </div>
        <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-sm flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#064e3b] animate-pulse"></div>
          <span className="text-[10px] font-extrabold text-[#064e3b] uppercase tracking-[0.2em]">Practice Mode Ready</span>
        </div>
      </header>

      {/* INTERACTIVE FILTER ROW: 11px font */}
      <div className="flex flex-wrap gap-4">
        {["All", "Food", "Objects", "People"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-10 py-4 rounded-2xl font-extrabold text-[11px] uppercase tracking-[0.2em] transition-all duration-500
              ${activeFilter === cat 
                ? "bg-[#172554] text-white shadow-2xl shadow-[#172554]/30 scale-105" 
                : "bg-white text-gray-400 border border-gray-100 hover:border-[#172554]/30 hover:text-[#172554] shadow-sm"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA: Empty Library State */}
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3.5rem] border border-gray-50 shadow-2xl shadow-gray-200/40 px-8 text-center relative overflow-hidden">
        
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        {/* DYNAMIC ICON SECTION */}
        <div className="relative mb-10 group">
          <div className="w-28 h-28 bg-gray-50 rounded-[3rem] flex items-center justify-center shadow-inner border border-gray-100 transition-transform duration-500 group-hover:scale-110">
            {categoryIcons[activeFilter]}
          </div>
          {/* Mic icon updated to Forest Green */}
          <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-gray-50 transition-transform duration-500 group-hover:rotate-12">
            <Mic className="w-6 h-6 text-[#064e3b]" />
          </div>
        </div>

        {/* DYNAMIC TEXT SECTION */}
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
            {activeFilter} Library
          </h2>
          <p className="text-gray-400 font-semibold text-sm leading-relaxed px-6">
            {emptyMessages[activeFilter]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyWords;