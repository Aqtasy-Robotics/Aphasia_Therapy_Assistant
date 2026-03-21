import { useState } from "react";
import { 
  Utensils, 
  Droplet, 
  User, 
  Heart,
  Phone,
  Home,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smile,
  Frown,
  Angry,
  Moon,
  Zap,
  Pill,
  WifiOff,
  Users,
  Stethoscope,
  ChevronLeft
} from "lucide-react";
import { CommunicationCard } from "./CommunicationCard";
import { motion } from "motion/react";
import { toast } from "sonner";

type Category = "main" | "needs" | "emotions" | "people" | "activities";

export function CommunicationBoard() {
  const [activeCategory, setActiveCategory] = useState<Category>("main");

  const handleSpeak = (text: string) => {
    toast.success(text, {
      duration: 3000,
      className: "text-2xl",
    });
    
    // Use Web Speech API if available
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const renderMainCategories = () => (
    <div className="grid grid-cols-3 gap-4">
      <CommunicationCard
        icon={Utensils}
        label="Basic Needs"
        color="bg-emerald-500"
        onClick={() => setActiveCategory("needs")}
      />
      <CommunicationCard
        icon={Heart}
        label="Feelings"
        color="bg-rose-500"
        onClick={() => setActiveCategory("emotions")}
      />
      <CommunicationCard
        icon={Users}
        label="People"
        color="bg-purple-500"
        onClick={() => setActiveCategory("people")}
      />
      <CommunicationCard
        icon={CheckCircle}
        label="Yes"
        color="bg-green-600"
        onClick={() => handleSpeak("Yes")}
      />
      <CommunicationCard
        icon={XCircle}
        label="No"
        color="bg-red-600"
        onClick={() => handleSpeak("No")}
      />
      <CommunicationCard
        icon={AlertCircle}
        label="Help"
        color="bg-orange-600"
        onClick={() => handleSpeak("I need help")}
      />
    </div>
  );

  const renderNeeds = () => (
    <>
      <button
        onClick={() => setActiveCategory("main")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 px-2"
      >
        <ChevronLeft className="w-6 h-6" />
        <span className="text-lg">Back</span>
      </button>
      <div className="grid grid-cols-3 gap-4">
        <CommunicationCard
          icon={Utensils}
          label="Hungry"
          color="bg-amber-500"
          onClick={() => handleSpeak("I am hungry")}
        />
        <CommunicationCard
          icon={Droplet}
          label="Thirsty"
          color="bg-blue-500"
          onClick={() => handleSpeak("I am thirsty")}
        />
        <CommunicationCard
          icon={User}
          label="Bathroom"
          color="bg-cyan-500"
          onClick={() => handleSpeak("I need the bathroom")}
        />
        <CommunicationCard
          icon={Pill}
          label="Medicine"
          color="bg-pink-500"
          onClick={() => handleSpeak("I need my medicine")}
        />
        <CommunicationCard
          icon={Moon}
          label="Tired"
          color="bg-indigo-500"
          onClick={() => handleSpeak("I am tired")}
        />
        <CommunicationCard
          icon={AlertCircle}
          label="Pain"
          color="bg-red-500"
          onClick={() => handleSpeak("I am in pain")}
        />
      </div>
    </>
  );

  const renderEmotions = () => (
    <>
      <button
        onClick={() => setActiveCategory("main")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 px-2"
      >
        <ChevronLeft className="w-6 h-6" />
        <span className="text-lg">Back</span>
      </button>
      <div className="grid grid-cols-3 gap-4">
        <CommunicationCard
          icon={Smile}
          label="Happy"
          color="bg-yellow-500"
          onClick={() => handleSpeak("I feel happy")}
        />
        <CommunicationCard
          icon={Frown}
          label="Sad"
          color="bg-blue-600"
          onClick={() => handleSpeak("I feel sad")}
        />
        <CommunicationCard
          icon={Angry}
          label="Frustrated"
          color="bg-red-600"
          onClick={() => handleSpeak("I feel frustrated")}
        />
        <CommunicationCard
          icon={Zap}
          label="Anxious"
          color="bg-purple-600"
          onClick={() => handleSpeak("I feel anxious")}
        />
        <CommunicationCard
          icon={Moon}
          label="Tired"
          color="bg-indigo-600"
          onClick={() => handleSpeak("I feel tired")}
        />
        <CommunicationCard
          icon={Heart}
          label="Loved"
          color="bg-pink-600"
          onClick={() => handleSpeak("I feel loved")}
        />
      </div>
    </>
  );

  const renderPeople = () => (
    <>
      <button
        onClick={() => setActiveCategory("main")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 px-2"
      >
        <ChevronLeft className="w-6 h-6" />
        <span className="text-lg">Back</span>
      </button>
      <div className="grid grid-cols-3 gap-4">
        <CommunicationCard
          icon={Home}
          label="Family"
          color="bg-green-600"
          onClick={() => handleSpeak("I want to see my family")}
        />
        <CommunicationCard
          icon={Stethoscope}
          label="Doctor"
          color="bg-blue-600"
          onClick={() => handleSpeak("I need the doctor")}
        />
        <CommunicationCard
          icon={User}
          label="Nurse"
          color="bg-teal-600"
          onClick={() => handleSpeak("I need the nurse")}
        />
        <CommunicationCard
          icon={Users}
          label="Friend"
          color="bg-purple-600"
          onClick={() => handleSpeak("I want to see my friend")}
        />
        <CommunicationCard
          icon={Phone}
          label="Call Someone"
          color="bg-emerald-600"
          onClick={() => handleSpeak("I want to call someone")}
        />
        <CommunicationCard
          icon={Heart}
          label="Loved One"
          color="bg-rose-600"
          onClick={() => handleSpeak("I want to see my loved one")}
        />
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full overflow-y-auto"
    >
      {activeCategory === "main" && renderMainCategories()}
      {activeCategory === "needs" && renderNeeds()}
      {activeCategory === "emotions" && renderEmotions()}
      {activeCategory === "people" && renderPeople()}
    </motion.div>
  );
}
