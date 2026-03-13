import React, { useState } from "react";
import { BookOpen, Mic, Pizza, Box, Users } from "lucide-react";

const MyWords = () => {
  // 1. Initial State (Empty for first-time login)
  const [_words] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");

  // 2. Dynamic Messages based on the selected category
  const emptyMessages = {
    All: "Your practice dictionary is ready! Practice with Waabi to start your collection.",
    Food: "No food items practiced yet. Waabi can help you learn words like 'Apple' or 'Water'.",
    Objects: "Your objects library is empty. Soon you'll see things like 'Keys' or 'Books' here.",
    People: "No people or roles practiced yet. We can start with 'Family' or 'Doctor' soon!"
  };

  const categoryIcons = {
    All: <BookOpen className="w-12 h-12 text-[#4f6ef7]" />,
    Food: <Pizza className="w-12 h-12 text-orange-400" />,
    Objects: <Box className="w-12 h-12 text-blue-400" />,
    People: <Users className="w-12 h-12 text-purple-400" />
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">My Words</h1>
        <p className="text-gray-500 font-medium mt-1">
          Explore the vocabulary you've mastered so far
        </p>
      </header>

      {/* Interactive Filter Row */}
      <div className="flex flex-wrap gap-3">
        {["All", "Food", "Objects", "People"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300
              ${activeFilter === cat 
                ? "bg-[#4f6ef7] text-white shadow-xl shadow-blue-100 scale-105" 
                : "bg-white text-gray-400 border border-gray-100 hover:border-[#4f6ef7]/30 hover:text-gray-600"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm px-6 text-center transition-all duration-500">
        
        {/* Dynamic Icon Section */}
        <div className="relative mb-8 transform transition-transform duration-500 hover:scale-110">
          <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center shadow-inner">
            {categoryIcons[activeFilter]}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md border border-gray-50">
            <Mic className="w-5 h-5 text-[#5cb338]" />
          </div>
        </div>

        {/* Dynamic Empty State Text */}
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            {activeFilter} Library
          </h2>
          <p className="text-gray-400 font-medium mt-4 leading-relaxed px-4">
            {emptyMessages[activeFilter]}
          </p>
        </div>

        {/* Primary Action */}
        <button className="mt-12 bg-[#4f6ef7] text-white px-12 py-5 rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-[#3d56c4] hover:-translate-y-1 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
          Begin My First Practice
        </button>
      </div>
    </div>
  );
};

export default MyWords;