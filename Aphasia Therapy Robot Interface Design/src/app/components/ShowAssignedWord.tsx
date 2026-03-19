import { motion } from "motion/react";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

interface ShowAssignedWordProps {
  word: string;
  category: string;
  difficulty: number;
  onStart: () => void;
}

export function ShowAssignedWord({ word, category, difficulty, onStart }: ShowAssignedWordProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full gap-12"
    >
      {/* Category Badge */}
      <div className="bg-blue-100 text-blue-800 px-8 py-3 rounded-full text-xl font-semibold">
        {category}
      </div>

      {/* Assigned Word - Very Large */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-8xl font-bold text-gray-900 mb-6">
          {word}
        </h2>
        
        {/* Difficulty Stars */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-8 h-8 ${
                i < difficulty 
                  ? "text-yellow-400 fill-yellow-400" 
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Simple Ready Button - No Distractions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={onStart}
          size="lg"
          className="text-3xl px-16 py-10 h-auto bg-green-600 hover:bg-green-700 rounded-2xl shadow-2xl"
        >
          Ready to Practice
          <ArrowRight className="w-10 h-10 ml-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
