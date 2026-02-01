import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Video, 
  MapPin, 
  MoreVertical 
} from "lucide-react";

const TherapistCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock appointments data
  const appointments = [
    { 
      id: 1, 
      patient: "Sarah Johnson", 
      time: "09:00 AM", 
      type: "Virtual Session", 
      status: "Confirmed",
      color: "bg-green-500" 
    },
    { 
      id: 2, 
      patient: "Michael Brown", 
      time: "11:30 AM", 
      type: "In-Person Clinic", 
      status: "Pending",
      color: "bg-blue-500" 
    },
    { 
      id: 3, 
      patient: "Emma Wilson", 
      time: "02:00 PM", 
      type: "Progress Review", 
      status: "Confirmed",
      color: "bg-purple-500" 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Therapy Schedule</h1>
          <p className="text-gray-600 mt-1">Manage your sessions and clinical appointments</p>
        </div>
        <button className="bg-[#5cb338] hover:bg-[#4a912d] text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-all shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: MONTHLY CALENDAR VIEW */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-800">April 2025</h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-4 text-center">
            {/* Simple mock grid for April */}
            {Array.from({ length: 30 }, (_, i) => i + 1).map(date => (
              <div 
                key={date}
                className={`py-4 rounded-2xl cursor-pointer transition-all border border-transparent
                  ${date === 24 ? 'bg-[#f0fff4] text-[#5cb338] font-bold border-[#5cb338]' : 'hover:bg-gray-50 text-gray-600'}
                  ${[10, 15, 20].includes(date) ? 'relative after:content-[""] after:absolute after:bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-[#5cb338] after:rounded-full' : ''}
                `}
              >
                {date}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: DAILY AGENDA / DETAILS */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800">Today's Agenda</h2>
            <p className="text-sm text-[#5cb338] font-bold mt-1">Thursday, April 24</p>
          </div>

          <div className="space-y-6">
            {appointments.map((appt) => (
              <div key={appt.id} className="relative pl-6 group">
                {/* Timeline Line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${appt.color}`} />
                
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      {appt.time}
                    </p>
                    <h4 className="text-sm font-bold text-gray-800 group-hover:text-[#5cb338] transition-colors">
                      {appt.patient}
                    </h4>
                    <div className="flex items-center gap-2 mt-2 text-gray-500">
                      {appt.type.includes('Virtual') ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      <span className="text-[10px] font-medium">{appt.type}</span>
                    </div>
                  </div>
                  <button className="text-gray-300 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider
                    ${appt.status === 'Confirmed' ? 'bg-green-50 text-[#5cb338]' : 'bg-orange-50 text-orange-500'}
                  `}>
                    {appt.status}
                  </span>
                  <button className="text-[10px] font-bold text-blue-500 hover:underline">
                    View Chart
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Appointment Stats Summary */}
          <div className="mt-10 p-4 bg-[#f8fafc] rounded-2xl border border-gray-50">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Clock className="w-4 h-4 text-[#5cb338]" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">4.5 Hours</p>
                <p className="text-[10px] text-gray-400">Total session time today</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistCalendar;