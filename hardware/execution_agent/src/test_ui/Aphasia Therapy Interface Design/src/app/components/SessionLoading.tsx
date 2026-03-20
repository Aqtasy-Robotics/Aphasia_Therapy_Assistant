import { motion } from "motion/react";
import { Heart } from "lucide-react";

export function SessionLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* Warm friendly graphic - pulsing heart */}
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full blur-3xl"
            style={{ width: "200px", height: "200px", left: "-50px", top: "-50px" }}
          />
          
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Heart className="w-24 h-24 text-pink-500 fill-pink-500 relative z-10" />
          </motion.div>
        </div>
      </motion.div>

      {/* Calming dots animation - no text */}
      <div className="flex gap-2 mt-12">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-400"
          />
        ))}
      </div>
    </div>
  );
}
