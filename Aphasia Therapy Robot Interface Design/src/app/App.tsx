import { useState, useEffect } from "react";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppLoading } from "./components/AppLoading";
import { HomePage } from "./components/HomePage";
import { CategorySelection } from "./components/CategorySelection";
import { TherapySessionPractice } from "./components/TherapySessionPractice";
import { Settings } from "./components/Settings";
import { Toaster } from "./components/ui/sonner";

type View = "loading" | "home" | "therapy-session" | "self-practice" | "category-selected" | "settings";
type Category = "all" | "food" | "objects" | "people";

export default function App() {
  const [activeView, setActiveView] = useState<View>("loading");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [exerciseKey, setExerciseKey] = useState(0);

  // Initialize practiced words for self-practice (Orange and Table)
  useEffect(() => {
    const practicedWords = localStorage.getItem("practicedWords");
    if (!practicedWords) {
      // IDs 5 (Orange) and 6 (Table) are pre-practiced
      localStorage.setItem("practicedWords", JSON.stringify([5, 6]));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveView("home");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (view: "therapy-session" | "self-practice") => {
    if (view === "therapy-session" || view === "self-practice") {
      setExerciseKey((prev) => prev + 1);
    }
    setActiveView(view);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setActiveView("category-selected");
  };

  const handleBackToHome = () => {
    setSelectedCategory(null);
    setActiveView("home");
  };

  const handleOpenSettings = () => {
    setActiveView("settings");
  };

  // Show loading screen
  if (activeView === "loading") {
    return <AppLoading />;
  }

  return (
    <div className="size-full flex flex-col bg-white">
      <Toaster position="top-center" />

      {/* Header - Only show when not on home */}
      <AnimatePresence>
        {activeView !== "home" && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="bg-white shadow-sm border-b border-gray-200"
          >
            <div className="max-w-7xl mx-auto px-8 py-6">
              <div className="flex items-center">
                {/* Back Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBackToHome}
                  className="bg-white hover:bg-gray-50 border-2 border-black text-black px-6 py-3 rounded-full flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Home
                </motion.button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeView === "home" && <HomePage onNavigate={handleNavigate} />}

            {activeView === "therapy-session" && (
              <div className="h-full p-8">
                <div className="h-full bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
                  <TherapySessionPractice key={exerciseKey} mode="new" />
                </div>
              </div>
            )}

            {activeView === "self-practice" && (
              <div className="h-full">
                <CategorySelection onSelectCategory={handleCategorySelect} />
              </div>
            )}

            {activeView === "category-selected" && (
              <div className="h-full">
                <TherapySessionPractice key={exerciseKey} category={selectedCategory} mode="practiced" />
              </div>
            )}

            {activeView === "settings" && (
              <div className="h-full p-8">
                <div className="h-full bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
                  <Settings />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Settings Icon - Bottom Right (only show on home page) */}
        {activeView === "home" && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpenSettings}
            className="fixed bottom-8 right-8 bg-black hover:bg-gray-800 text-white p-6 rounded-full shadow-2xl hover:shadow-3xl transition-all"
          >
            <SettingsIcon className="w-10 h-10" />
          </motion.button>
        )}
      </main>
    </div>
  );
}