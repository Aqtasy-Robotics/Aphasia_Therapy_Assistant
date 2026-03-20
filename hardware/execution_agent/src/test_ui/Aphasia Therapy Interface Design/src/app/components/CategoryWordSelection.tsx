import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cat, Apple, Home, User, Footprints, Star, ChevronLeft, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  words: Array<{ word: string; difficulty: number }>;
}

const categories: Category[] = [
  {
    id: "animals",
    name: "Animals",
    icon: Cat,
    color: "bg-orange-500",
    words: [
      { word: "Cat", difficulty: 1 },
      { word: "Dog", difficulty: 1 },
      { word: "Bird", difficulty: 2 },
      { word: "Elephant", difficulty: 3 },
      { word: "Butterfly", difficulty: 3 },
    ]
  },
  {
    id: "food",
    name: "Food",
    icon: Apple,
    color: "bg-red-500",
    words: [
      { word: "Apple", difficulty: 1 },
      { word: "Water", difficulty: 1 },
      { word: "Bread", difficulty: 1 },
      { word: "Sandwich", difficulty: 2 },
      { word: "Vegetables", difficulty: 3 },
    ]
  },
  {
    id: "home",
    name: "Home",
    icon: Home,
    color: "bg-blue-500",
    words: [
      { word: "Bed", difficulty: 1 },
      { word: "Chair", difficulty: 1 },
      { word: "Door", difficulty: 1 },
      { word: "Window", difficulty: 2 },
      { word: "Kitchen", difficulty: 2 },
    ]
  },
  {
    id: "body",
    name: "Body",
    icon: User,
    color: "bg-purple-500",
    words: [
      { word: "Hand", difficulty: 1 },
      { word: "Foot", difficulty: 1 },
      { word: "Head", difficulty: 1 },
      { word: "Shoulder", difficulty: 2 },
      { word: "Elbow", difficulty: 2 },
    ]
  },
  {
    id: "actions",
    name: "Actions",
    icon: Footprints,
    color: "bg-green-500",
    words: [
      { word: "Walk", difficulty: 1 },
      { word: "Sit", difficulty: 1 },
      { word: "Stand", difficulty: 1 },
      { word: "Jump", difficulty: 2 },
      { word: "Running", difficulty: 2 },
    ]
  },
];

interface CategoryWordSelectionProps {
  onSelect: (category: string, word: string, difficulty: number) => void;
}

export function CategoryWordSelection({ onSelect }: CategoryWordSelectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  if (selectedCategory) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="h-full flex flex-col"
      >
        {/* Back Button */}
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 px-2"
        >
          <ChevronLeft className="w-8 h-8" />
          <span className="text-2xl">Back to Categories</span>
        </button>

        {/* Category Header */}
        <div className="text-center mb-8">
          <div className={`${selectedCategory.color} inline-flex items-center gap-4 px-8 py-4 rounded-2xl text-white mb-4`}>
            <selectedCategory.icon className="w-12 h-12" />
            <span className="text-4xl font-bold">{selectedCategory.name}</span>
          </div>
          <p className="text-xl text-gray-600 mt-4">Pick a word with difficulty rating</p>
        </div>

        {/* Word Selection Grid */}
        <div className="grid grid-cols-2 gap-6">
          {selectedCategory.words.map((item, index) => (
            <motion.button
              key={item.word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect(selectedCategory.name, item.word, item.difficulty)}
              className="bg-white hover:bg-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-gray-200 hover:border-blue-400"
            >
              <div className="text-5xl font-bold text-gray-900 mb-4">
                {item.word}
              </div>
              
              {/* Difficulty Rating */}
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-6 h-6 ${
                      i < item.difficulty 
                        ? "text-yellow-400 fill-yellow-400" 
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-2">Choose a Category</h2>
        <p className="text-xl text-gray-600">Browse categories with large icons</p>
      </div>

      {/* Category Grid - Large Icons */}
      <div className="grid grid-cols-3 gap-6">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category)}
              className={`${category.color} rounded-3xl p-10 flex flex-col items-center justify-center gap-4 shadow-xl hover:shadow-2xl transition-all min-h-[220px]`}
            >
              <Icon className="w-20 h-20 text-white" strokeWidth={2} />
              <span className="text-3xl font-bold text-white">{category.name}</span>
              <ArrowRight className="w-8 h-8 text-white opacity-75" />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
