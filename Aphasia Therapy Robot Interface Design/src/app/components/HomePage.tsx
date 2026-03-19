import { motion } from "motion/react";
import { Dumbbell, User } from "lucide-react";

interface HomePageProps {
  onNavigate: (view: "therapy-session" | "self-practice") => void;
}

interface MainButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
}

function MainButton({ icon: Icon, label, description, onClick }: MainButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 rounded-3xl p-16 flex flex-col items-center justify-center gap-8 shadow-2xl hover:shadow-3xl transition-all min-h-[500px] w-full"
    >
      <Icon className="w-40 h-40 text-white" strokeWidth={2} />
      <div className="text-center">
        <h2 className="text-6xl font-bold text-white mb-4">{label}</h2>
        <p className="text-3xl text-white/90">{description}</p>
      </div>
    </motion.button>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="h-full flex items-center justify-center px-12">
      <div className="grid grid-cols-2 gap-12 max-w-7xl w-full">
        <MainButton
          icon={Dumbbell}
          label="Start Therapy Session"
          description="Begin your assigned practice"
          onClick={() => onNavigate("therapy-session")}
        />
        
        <MainButton
          icon={User}
          label="Self Practice"
          description="Practice on your own"
          onClick={() => onNavigate("self-practice")}
        />
      </div>
    </div>
  );
}