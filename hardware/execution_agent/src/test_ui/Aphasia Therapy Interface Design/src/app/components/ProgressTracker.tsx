import { motion } from "motion/react";
import { TrendingUp, Target, Calendar, Award } from "lucide-react";
import { Card } from "./ui/card";

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      <div className={`${color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-gray-600 text-lg">{label}</div>
    </motion.div>
  );
}

export function ProgressTracker() {
  // Mock data - in a real app, this would come from a database
  const weeklyProgress = [
    { day: "Mon", exercises: 8 },
    { day: "Tue", exercises: 12 },
    { day: "Wed", exercises: 10 },
    { day: "Thu", exercises: 15 },
    { day: "Fri", exercises: 14 },
    { day: "Sat", exercises: 9 },
    { day: "Sun", exercises: 11 },
  ];

  const maxExercises = Math.max(...weeklyProgress.map(d => d.exercises));

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Total Exercises"
          value="127"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value="79"
          color="bg-green-500"
        />
        <StatCard
          icon={Calendar}
          label="Daily Streak"
          value="12 days"
          color="bg-purple-500"
        />
        <StatCard
          icon={Award}
          label="Accuracy"
          value="85%"
          color="bg-yellow-500"
        />
      </div>

      {/* Weekly Chart */}
      <Card className="p-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6">This Week's Activity</h3>
        <div className="flex items-end justify-between gap-4 h-64">
          {weeklyProgress.map((item, index) => (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-3">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.exercises / maxExercises) * 100}%` }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg min-h-[40px] relative group"
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.exercises}
                </div>
              </motion.div>
              <span className="text-gray-600 font-medium">{item.day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Achievements */}
      <Card className="p-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Recent Achievements</h3>
        <div className="space-y-3">
          {[
            { title: "First Week Complete!", date: "March 8, 2026", icon: "🎉" },
            { title: "10 Day Streak", date: "March 10, 2026", icon: "🔥" },
            { title: "100 Exercises Milestone", date: "March 12, 2026", icon: "💯" },
            { title: "Perfect Score", date: "March 13, 2026", icon: "⭐" },
          ].map((achievement, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl"
            >
              <span className="text-3xl">{achievement.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-lg">{achievement.title}</div>
                <div className="text-gray-600">{achievement.date}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
