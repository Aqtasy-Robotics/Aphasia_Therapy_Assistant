import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface Word {
  id: number;
  text: string;
  category: string;
}

const wordList: Word[] = [
  // Start Therapy Session - New words to practice
  { id: 1, text: "Cat", category: "objects" },
  { id: 2, text: "Cow", category: "objects" },
  { id: 3, text: "Tiger", category: "objects" },
  { id: 4, text: "Apple", category: "food" },
  
  // Self Practice - Previously practiced words
  { id: 5, text: "Orange", category: "food" },
  { id: 6, text: "Table", category: "objects" },
];

type FeedbackType = "timeout" | "good-attempt" | "perfect" | null;

interface FeedbackMessage {
  type: FeedbackType;
  message: string;
}

interface TherapySessionPracticeProps {
  category?: "all" | "food" | "objects" | "people" | null;
  mode?: "new" | "practiced";
}

export function TherapySessionPractice({ category = null, mode = "new" }: TherapySessionPracticeProps) {
  // Get practiced words from localStorage
  const getPracticedWords = (): number[] => {
    const stored = localStorage.getItem("practicedWords");
    return stored ? JSON.parse(stored) : [];
  };

  // Save practiced words to localStorage
  const markWordAsPracticed = (wordId: number) => {
    const practiced = getPracticedWords();
    if (!practiced.includes(wordId)) {
      practiced.push(wordId);
      localStorage.setItem("practicedWords", JSON.stringify(practiced));
    }
  };

  // Filter words based on mode and category
  const practicedWordIds = getPracticedWords();
  
  let filteredWords = wordList;
  
  // Filter by mode (new or practiced)
  if (mode === "new") {
    filteredWords = filteredWords.filter(word => !practicedWordIds.includes(word.id));
  } else if (mode === "practiced") {
    filteredWords = filteredWords.filter(word => practicedWordIds.includes(word.id));
  }
  
  // Filter by category if specified
  if (category && category !== "all") {
    filteredWords = filteredWords.filter(word => word.category === category);
  }

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(7);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = filteredWords[currentWordIndex];

  const nextWord = () => {
    if (currentWordIndex < filteredWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setFeedback(null);
      setAttemptCount(0);
    } else {
      setSessionComplete(true);
    }
  };

  const previousWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(prev => prev - 1);
      setFeedback(null);
      setAttemptCount(0);
    }
  };

  const handleMicClick = () => {
    if (!isListening) {
      startListening();
    }
  };

  const startListening = () => {
    setIsListening(true);
    setFeedback(null);
    setTimeRemaining(7);
    setIsSpeaking(false);
    setAudioLevel(0);

    // Countdown timer
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set 7-second timeout
    timeoutRef.current = setTimeout(() => {
      stopListening();
      setFeedback({
        type: "timeout",
        message: "Let's try pronouncing that word again."
      });
    }, 7000);

    // Simulate speech recognition (in production, use actual Web Speech API)
    // For now, we'll simulate a response after a random delay
    const responseDelay = Math.random() * 6000 + 500; // Random delay between 0.5-6.5 seconds
    
    setTimeout(() => {
      if (timeoutRef.current) {
        setIsSpeaking(true);
        
        // Simulate audio level changes
        audioIntervalRef.current = setInterval(() => {
          setAudioLevel(Math.random() * 0.5);
        }, 100);
      }
    }, 500);
    
    setTimeout(() => {
      if (timeoutRef.current) {
        // Simulate pronunciation check (50% chance of good pronunciation)
        const isGoodPronunciation = Math.random() > 0.5;
        
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        stopListening();
        
        if (isGoodPronunciation) {
          setFeedback({
            type: "perfect",
            message: "Good job! Keep up the good work."
          });
          // Mark word as practiced
          if (mode === "new") {
            markWordAsPracticed(currentWord.id);
          }
        } else {
          setFeedback({
            type: "good-attempt",
            message: "Nice try! Let's try pronouncing that word again"
          });
        }
      }
    }, responseDelay);
  };

  const stopListening = () => {
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, []);

  const restartSession = () => {
    setCurrentWordIndex(0);
    setFeedback(null);
    setSessionComplete(false);
    setAttemptCount(0);
  };

  // Handle case when no words are available
  if (filteredWords.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full gap-8"
      >
        <h2 className="text-5xl font-bold text-black">
          {mode === "practiced" ? "No Practiced Words Yet" : "No New Words Available"}
        </h2>
        <p className="text-2xl text-gray-600 text-center max-w-2xl">
          {mode === "practiced" 
            ? "You haven't practiced any words yet. Start a therapy session to practice new words first!" 
            : "All words have been practiced! Great job! You can review them in Self Practice."}
        </p>
      </motion.div>
    );
  }

  if (sessionComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full gap-8"
      >
        <h2 className="text-5xl font-bold text-black">Session Complete! 🎉</h2>
        <p className="text-2xl text-gray-600">Great work today!</p>
        <Button
          onClick={restartSession}
          size="lg"
          className="text-2xl px-12 py-8 h-auto bg-blue-600 hover:bg-blue-700"
        >
          Start New Session
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-12">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl text-gray-600">
            Word {currentWordIndex + 1} of {filteredWords.length}
          </span>
          <span className="text-xl text-gray-600">
            Category: {currentWord.category}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentWordIndex + 1) / filteredWords.length) * 100}%` }}
            className="h-full bg-blue-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={previousWord}
          disabled={currentWordIndex === 0}
          className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </motion.button>

        <motion.div
          key={currentWord.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center min-w-[500px]"
        >
          <h1 className="text-9xl font-bold text-black mb-8">
            {currentWord.text}
          </h1>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={nextWord}
          disabled={currentWordIndex === filteredWords.length - 1}
          className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`text-4xl font-semibold px-8 py-4 rounded-2xl ${
              feedback.type === "perfect" 
                ? "bg-green-100 text-green-800" 
                : feedback.type === "good-attempt"
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {isListening && (
            <>
              <motion.div
                animate={{
                  scale: [1, 1.5 + audioLevel],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute inset-0 w-32 h-32 rounded-full bg-blue-400"
                style={{ left: 0, top: 0 }}
              />
              <motion.div
                animate={{
                  scale: [1, 1.5 + audioLevel],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.2,
                }}
                className="absolute inset-0 w-32 h-32 rounded-full bg-blue-400"
                style={{ left: 0, top: 0 }}
              />
              <motion.div
                animate={{
                  scale: [1, 1.5 + audioLevel],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.4,
                }}
                className="absolute inset-0 w-32 h-32 rounded-full bg-blue-500"
                style={{ left: 0, top: 0 }}
              />
            </>
          )}
          
          <motion.button
            whileHover={{ scale: isListening ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isSpeaking ? { 
              scale: [1, 1.05 + (audioLevel * 0.1), 1],
              boxShadow: [
                "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                `0 20px 25px -5px rgba(59, 130, 246, ${0.5 + audioLevel}), 0 8px 10px -6px rgba(59, 130, 246, ${0.5 + audioLevel})`,
                "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
              ]
            } : {}}
            transition={isSpeaking ? { duration: 0.5, repeat: Infinity } : {}}
            onClick={isListening ? stopListening : startListening}
            disabled={feedback !== null}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              isListening 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isListening ? (
              <MicOff className="w-16 h-16 text-white" />
            ) : (
              <Mic className="w-16 h-16 text-white" />
            )}
          </motion.button>
        </div>

        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-bold text-gray-600"
          >
            {timeRemaining}s
          </motion.div>
        )}

        <p className="text-xl text-gray-600">
          {isListening ? (isSpeaking ? "Listening..." : "Start speaking...") : "Click to speak"}
        </p>
      </div>
    </div>
  );
}