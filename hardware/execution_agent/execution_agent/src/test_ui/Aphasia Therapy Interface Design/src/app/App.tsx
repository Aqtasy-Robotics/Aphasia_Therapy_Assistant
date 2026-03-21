import { useState } from "react";
import { MessageSquare, Play, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { HomePage } from "./components/HomePage";
import { CommunicationBoard } from "./components/CommunicationBoard";
import { TherapyExercise } from "./components/TherapyExercise";
import { Settings } from "./components/Settings";
import { Toaster } from "./components/ui/sonner";

type View = "home" | "communication" | "exercise" | "settings";

export default function App() {
  const [activeView, setActiveView] = useState<View>("home");
  const [exerciseKey, setExerciseKey] = useState(0);

  const handleStartSession = () => {
    setActiveView("exercise");
    setExerciseKey((prev) => prev + 1); // Force re-mount to restart session
  };

  const handleBackToHome = () => {
    setActiveView("home");
  };

  return (
    <div className="size-full flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button - shown when not on home */}
              {activeView !== "home" && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBackToHome}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-full flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all mr-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Home
                </motion.button>
              )}

              <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Aphasia Therapy Assistant
                </h1>
                <p className="text-gray-600">
                  Your daily communication companion
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Patient Starts Session Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartSession}
                className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                <Play className="w-5 h-5 fill-white" />
                Patient Starts Session
              </motion.button>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  Welcome back,
                </div>
                <div className="text-xl font-semibold text-gray-800">
                  John
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - No Sidebar */}
      <main className="flex-1 overflow-hidden p-8">
        <div className="max-w-7xl mx-auto h-full">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeView === "home" && (
              <HomePage onNavigate={setActiveView} />
            )}

            {activeView === "communication" && (
              <div className="h-full bg-white rounded-3xl shadow-xl p-8">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-800">
                    Communication Board
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Tap any card to speak
                  </p>
                </div>
                <CommunicationBoard />
              </div>
            )}

            {activeView === "exercise" && (
              <div className="h-full bg-white rounded-3xl shadow-xl p-8">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-800">
                    Word Finding Exercise
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Choose the correct word for each image
                  </p>
                </div>
                <TherapyExercise key={exerciseKey} />
              </div>
            )}

            {activeView === "settings" && (
              <div className="h-full bg-white rounded-3xl shadow-xl p-8">
                <Settings />
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}