import { motion } from "motion/react";
import { MessageSquare, Dumbbell, Settings } from "lucide-react";

interface HomePageProps {
  onNavigate: (view: "communication" | "exercise" | "settings") => void;
}

interface OptionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
}

function OptionCard({ icon: Icon, label, description, color, onClick }: OptionCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${color} rounded-3xl p-12 flex flex-col items-center justify-center gap-6 shadow-2xl hover:shadow-3xl transition-all min-h-[400px]`}
    >
      <Icon className="w-32 h-32 text-white" strokeWidth={2} />
      <div className="text-center">
        <h2 className="text-5xl font-bold text-white mb-3">{label}</h2>
        <p className="text-2xl text-white/90">{description}</p>
      </div>
    </motion.button>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="grid grid-cols-3 gap-8 max-w-6xl w-full px-8">
        <OptionCard
          icon={MessageSquare}
          label="Communicate"
          description="Express your needs and feelings"
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          onClick={() => onNavigate("communication")}
        />
        
        <OptionCard
          icon={Dumbbell}
          label="Practice"
          description="Start therapy exercises"
          color="bg-gradient-to-br from-green-500 to-green-600"
          onClick={() => onNavigate("exercise")}
        />
        
        <OptionCard
          icon={Settings}
          label="Settings"
          description="Adjust your preferences"
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          onClick={() => onNavigate("settings")}
        />
      </div>
    </div>
  );
}
