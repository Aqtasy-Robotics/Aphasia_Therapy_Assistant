import React, { useState } from "react";
import { Search, UserPlus, MoreVertical, Calendar } from "lucide-react";

const MyPatients = () => {
  // 1. Mock Data (This will later come from your Firestore 'patients' collection)
  const [patients] = useState([
    { id: "P001", name: "Sarah Johnson", progress: 88, lastSession: "2024-04-20", status: "Active" },
    { id: "P002", name: "Michael Brown", progress: 76, lastSession: "2024-04-19", status: "Active" },
    { id: "P003", name: "Emma Wilson", progress: 92, lastSession: "2024-04-21", status: "On Break" },
    { id: "P004", name: "James Davis", progress: 68, lastSession: "2024-04-15", status: "Active" },
    { id: "P005", name: "Linda Martinez", progress: 45, lastSession: "2024-04-10", status: "Active" },
  ]);

  // 2. Search State
  const [searchTerm, setSearchTerm] = useState("");

  // 3. Filtering Logic
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Patients</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your clinical caseload</p>
        </div>
        <button className="bg-[#5cb338] hover:bg-[#4a912d] text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-all shadow-sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Patient
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#5cb338] transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search by name or patient ID..."
          className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm focus:ring-2 focus:ring-[#5cb338] focus:border-transparent outline-none transition-all text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Patient Grid */}
      {filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div 
              key={patient.id} 
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-[#f0fff4] text-[#5cb338] rounded-full flex items-center justify-center font-bold text-lg">
                  {patient.name.charAt(0)}
                </div>
                <button className="text-gray-300 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 group-hover:text-[#5cb338] transition-colors">
                  {patient.name}
                </h3>
                <p className="text-xs text-gray-400 font-medium">ID: {patient.id}</p>
              </div>

              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-gray-500 uppercase">Therapy Progress</span>
                    <span className="text-xs font-bold text-[#5cb338]">{patient.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#5cb338] rounded-full transition-all duration-1000"
                      style={{ width: `${patient.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center text-gray-500 gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Last Session: {patient.lastSession}</span>
                </div>
              </div>

              <button className="w-full mt-6 py-2.5 bg-gray-50 hover:bg-[#f0fff4] text-gray-600 hover:text-[#5cb338] rounded-xl text-sm font-bold transition-all border border-transparent hover:border-[#5cb338]">
                View Details
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-gray-300 w-8 h-8" />
          </div>
          <h3 className="text-gray-800 font-bold text-lg">No patients found</h3>
          <p className="text-gray-500 text-sm mt-1">Try searching for a different name or ID</p>
          <button 
            onClick={() => setSearchTerm("")}
            className="mt-4 text-[#5cb338] font-bold text-sm hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};

export default MyPatients;