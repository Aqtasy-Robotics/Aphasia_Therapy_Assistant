import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface CommunicationCardProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
  image?: string;
}

export function CommunicationCard({ 
  icon: Icon, 
  label, 
  onClick, 
  color = "bg-blue-500",
  image 
}: CommunicationCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`${color} relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] shadow-lg transition-shadow hover:shadow-xl`}
    >
      {image && (
        <div className="absolute inset-0 opacity-20">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <Icon className="w-12 h-12 text-white relative z-10" strokeWidth={2.5} />
      <span className="text-white text-xl font-semibold text-center relative z-10">{label}</span>
    </motion.button>
  );
}
