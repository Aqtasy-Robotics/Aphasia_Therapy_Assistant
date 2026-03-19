import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export function AppLoading() {
  const [stage, setStage] = useState<"initial" | "welcome">("initial");

  useEffect(() => {
    // Transition to welcome stage after 1.5 seconds
    const timer = setTimeout(() => {
      setStage("welcome");
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full w-full flex items-center justify-center bg-white">
      <AnimatePresence mode="wait">
        {stage === "initial" ? (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-7xl font-bold text-black mb-4">Waabi</h1>
            <p className="text-3xl text-gray-600">Intelligent speech therapy companion</p>
          </motion.div>
        ) : (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-6xl font-bold text-black mb-6">Welcome back!</h2>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}