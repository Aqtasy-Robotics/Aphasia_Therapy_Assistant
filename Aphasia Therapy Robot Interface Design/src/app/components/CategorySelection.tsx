import { motion } from "motion/react";
import { Grid3x3, Apple, Package, Users } from "lucide-react";

interface CategorySelectionProps {
  onSelectCategory: (category: "all" | "food" | "objects" | "people") => void;
}

interface CategoryButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function CategoryButton({ icon: Icon, label, onClick }: CategoryButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 shadow-2xl hover:shadow-3xl transition-all min-h-[200px] w-full border-4 border-transparent hover:border-black"
    >
      <Icon className="w-20 h-20 text-white" strokeWidth={2.5} />
      <h3 className="text-4xl font-bold text-white">{label}</h3>
    </motion.button>
  );
}

export function CategorySelection({ onSelectCategory }: CategorySelectionProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl"
      >
        <div className="text-center mb-12">
          <h2 className="text-6xl font-bold text-black mb-4">Choose Category</h2>
          <p className="text-3xl text-gray-600">Select words to practice</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <CategoryButton
            icon={Apple}
            label="Food"
            onClick={() => onSelectCategory("food")}
          />
          <CategoryButton
            icon={Package}
            label="Objects"
            onClick={() => onSelectCategory("objects")}
          />
          <CategoryButton
            icon={Users}
            label="People"
            onClick={() => onSelectCategory("people")}
          />
          <CategoryButton
            icon={Grid3x3}
            label="All"
            onClick={() => onSelectCategory("all")}
          />
        </div>
      </motion.div>
    </div>
  );
}