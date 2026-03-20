import { motion } from "motion/react";
import { Volume2, Moon, Type, Palette, User, Bell } from "lucide-react";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";

export function Settings() {
  return (
    <div className="h-full overflow-y-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings</h2>

        {/* Audio Settings */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="w-7 h-7 text-blue-600" />
            <h3 className="text-2xl font-semibold text-gray-800">Audio</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-lg text-gray-700">Speech Volume</label>
                <span className="text-gray-600">80%</span>
              </div>
              <Slider defaultValue={[80]} max={100} step={1} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-lg text-gray-700">Speech Speed</label>
                <span className="text-gray-600">Normal</span>
              </div>
              <Slider defaultValue={[50]} max={100} step={1} />
            </div>

            <div className="flex justify-between items-center">
              <label className="text-lg text-gray-700">Sound Effects</label>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Visual Settings */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-7 h-7 text-purple-600" />
            <h3 className="text-2xl font-semibold text-gray-800">Display</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-lg text-gray-700">Button Size</label>
                <span className="text-gray-600">Large</span>
              </div>
              <Slider defaultValue={[75]} max={100} step={1} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-lg text-gray-700">Text Size</label>
                <span className="text-gray-600">Extra Large</span>
              </div>
              <Slider defaultValue={[85]} max={100} step={1} />
            </div>

            <div className="flex justify-between items-center">
              <label className="text-lg text-gray-700">High Contrast Mode</label>
              <Switch />
            </div>

            <div className="flex justify-between items-center">
              <label className="text-lg text-gray-700">Dark Mode</label>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-7 h-7 text-green-600" />
            <h3 className="text-2xl font-semibold text-gray-800">Reminders</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-lg text-gray-700">Daily Exercise Reminder</label>
              <Switch defaultChecked />
            </div>

            <div className="flex justify-between items-center">
              <label className="text-lg text-gray-700">Medication Reminder</label>
              <Switch defaultChecked />
            </div>

            <div className="flex justify-between items-center">
              <label className="text-lg text-gray-700">Achievement Notifications</label>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Profile Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-7 h-7 text-orange-600" />
            <h3 className="text-2xl font-semibold text-gray-800">Profile</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-lg text-gray-700 mb-2">Name</label>
              <input
                type="text"
                defaultValue="John Doe"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-lg text-gray-700 mb-2">Caregiver Contact</label>
              <input
                type="tel"
                defaultValue="+1 (555) 123-4567"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
