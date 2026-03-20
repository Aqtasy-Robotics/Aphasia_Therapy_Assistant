import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, Volume2, RefreshCw, Award } from "lucide-react";
import { Button } from "./ui/button";
import confetti from "canvas-confetti";
import { SessionLoading } from "./SessionLoading";
import { ShowAssignedWord } from "./ShowAssignedWord";
import { CategoryWordSelection } from "./CategoryWordSelection";

interface ExerciseItem {
  image: string;
  word: string;
  options: string[];
  correctAnswer: string;
}

const exercises: ExerciseItem[] = [
  {
    image: "https://images.unsplash.com/photo-1669999207738-fcdb7103a6f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcHBsZSUyMGZydWl0JTIwcmVkfGVufDF8fHx8MTc3MzM5MzI3N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    word: "Apple",
    options: ["Apple", "Orange", "Banana"],
    correctAnswer: "Apple"
  },
  {
    image: "https://images.unsplash.com/photo-1640375022816-32fa22ecb747?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXRlciUyMGdsYXNzJTIwY2xlYXJ8ZW58MXx8fHwxNzczMzkzMjc3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    word: "Water",
    options: ["Coffee", "Water", "Juice"],
    correctAnswer: "Water"
  },
  {
    image: "https://images.unsplash.com/photo-1759299615920-d38e3841940d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXQlMjBhbmltYWwlMjBwZXR8ZW58MXx8fHwxNzczMzkzMjc4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    word: "Cat",
    options: ["Dog", "Cat", "Bird"],
    correctAnswer: "Cat"
  },
  {
    image: "https://images.unsplash.com/photo-1620286867469-3891a19adfbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB3YWxraW5nJTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzMzOTMyNzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    word: "Walk",
    options: ["Run", "Walk", "Jump"],
    correctAnswer: "Walk"
  },
  {
    image: "https://images.unsplash.com/photo-1631669969504-f35518bf96ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2F0aW9uJTIwcGlsbHMlMjBib3R0bGV8ZW58MXx8fHwxNzczMzIxMjgzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    word: "Medicine",
    options: ["Food", "Medicine", "Drink"],
    correctAnswer: "Medicine"
  }
];

type SessionState = "loading" | "assigned" | "patient-choice" | "practicing" | "completed";

export function TherapyExercise() {
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [assignedWord, setAssignedWord] = useState<{word: string; category: string; difficulty: number} | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentExercise = exercises[currentIndex];

  // Simulate session initialization - poll for assignment
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate checking for therapist assignment
      const hasTherapistAssignment = Math.random() > 0.5; // 50% chance
      
      if (hasTherapistAssignment) {
        // Therapist assigned a word
        setAssignedWord({
          word: "Apple",
          category: "Food",
          difficulty: 2
        });
        setSessionState("assigned");
      } else {
        // No assignment - patient chooses
        setSessionState("patient-choice");
      }
    }, 2000); // 2 second loading animation

    return () => clearTimeout(timer);
  }, []);

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.7;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    const correct = answer === currentExercise.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      speakWord("Great job!");
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      setCompleted(true);
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });
    }
  };

  const handleRestart = () => {
    setSessionState("loading");
    setAssignedWord(null);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setCompleted(false);
    
    // Re-simulate assignment check
    setTimeout(() => {
      const hasTherapistAssignment = Math.random() > 0.5;
      if (hasTherapistAssignment) {
        setAssignedWord({
          word: "Water",
          category: "Food",
          difficulty: 1
        });
        setSessionState("assigned");
      } else {
        setSessionState("patient-choice");
      }
    }, 2000);
  };

  const handleCategoryWordSelect = (category: string, word: string, difficulty: number) => {
    setAssignedWord({ word, category, difficulty });
    setSessionState("practicing");
  };

  const handleStartPractice = () => {
    setSessionState("practicing");
  };

  // Session Loading
  if (sessionState === "loading") {
    return <SessionLoading />;
  }

  // Show Assigned Word (Screen 03A)
  if (sessionState === "assigned" && assignedWord) {
    return (
      <ShowAssignedWord
        word={assignedWord.word}
        category={assignedWord.category}
        difficulty={assignedWord.difficulty}
        onStart={handleStartPractice}
      />
    );
  }

  // Category + Word Selection (Screen 03B)
  if (sessionState === "patient-choice") {
    return <CategoryWordSelection onSelect={handleCategoryWordSelect} />;
  }

  // Exercise Complete
  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full gap-6"
      >
        <Award className="w-32 h-32 text-yellow-500" />
        <h2 className="text-4xl font-bold text-gray-800">Exercise Complete!</h2>
        <p className="text-2xl text-gray-600">
          Score: {score} out of {exercises.length}
        </p>
        <Button
          onClick={handleRestart}
          size="lg"
          className="text-xl px-8 py-6 h-auto"
        >
          <RefreshCw className="w-6 h-6 mr-2" />
          Try Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold text-gray-700">
            Question {currentIndex + 1} of {exercises.length}
          </span>
          <span className="text-lg font-semibold text-gray-700">
            Score: {score}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-green-400 to-blue-500"
          />
        </div>
      </div>

      {/* Exercise Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col items-center justify-center gap-6"
        >
          {/* Image */}
          <div className="relative">
            <img
              src={currentExercise.image}
              alt="Exercise"
              className="w-72 h-72 object-cover rounded-3xl shadow-2xl"
            />
            <button
              onClick={() => speakWord(currentExercise.word)}
              className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-colors"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>

          {/* Instruction */}
          <h3 className="text-2xl font-semibold text-gray-800">
            What is this?
          </h3>

          {/* Answer Options */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
            {currentExercise.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const showCorrect = isSelected && isCorrect;
              const showIncorrect = isSelected && isCorrect === false;

              return (
                <motion.button
                  key={option}
                  onClick={() => !selectedAnswer && handleAnswer(option)}
                  disabled={selectedAnswer !== null}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative px-6 py-8 rounded-2xl text-2xl font-semibold shadow-lg
                    transition-all disabled:cursor-not-allowed
                    ${!selectedAnswer ? 'bg-white hover:bg-gray-50 text-gray-800 hover:shadow-xl' : ''}
                    ${showCorrect ? 'bg-green-500 text-white' : ''}
                    ${showIncorrect ? 'bg-red-500 text-white' : ''}
                    ${selectedAnswer && !isSelected ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {option}
                  {showCorrect && (
                    <CheckCircle className="absolute top-2 right-2 w-8 h-8" />
                  )}
                  {showIncorrect && (
                    <XCircle className="absolute top-2 right-2 w-8 h-8" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Next Button */}
          {selectedAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                onClick={handleNext}
                size="lg"
                className="text-xl px-12 py-6 h-auto bg-blue-600 hover:bg-blue-700"
              >
                {currentIndex < exercises.length - 1 ? "Next" : "Finish"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}