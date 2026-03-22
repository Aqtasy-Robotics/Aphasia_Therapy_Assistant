import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { 
  Loader2, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  User, 
  ServerCog,
  Cpu
} from "lucide-react";

const AgentSessionTrace = () => {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [steps, setSteps] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPatients(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error: err } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "patient")
          .eq("selected_therapist_id", user.id)
          .order("full_name", { ascending: true });

        if (err) throw err;
        setPatients(data || []);
        if (data?.length === 1) setPatientId(data[0].id);
      } catch (e) {
        setError(e.message || "Could not load patients.");
      } finally {
        setLoadingPatients(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!patientId) {
      setSteps([]);
      return;
    }
    const loadSteps = async () => {
      try {
        setLoadingSteps(true);
        setError("");
        const { data, error: err } = await supabase
          .from("agent_pipeline_steps")
          .select("id, run_id, step_name, detail, report_id, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (err) throw err;
        setSteps(data || []);
      } catch (e) {
        setSteps([]);
        setError(
          e.message ||
            "Could not load agent_pipeline_steps. Apply the SQL migration in supabase/migrations if missing.",
        );
      } finally {
        setLoadingSteps(false);
      }
    };
    loadSteps();
  }, [patientId]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const row of steps) {
      const rid = row.run_id || "unknown";
      if (!m.has(rid)) m.set(rid, []);
      m.get(rid).push(row);
    }
    return Array.from(m.entries()).map(([run_id, items]) => ({
      run_id,
      items: items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    }));
  }, [steps]);

  if (loadingPatients) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#012b1d]" />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#012b1d]">Syncing AI Traces...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in duration-700 font-sans antialiased">
      
      {/* HEADER SECTION */}
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-[#012b1d] tracking-tight flex items-center gap-4">
            AI Agent Trace <Cpu className="w-8 h-8 text-[#5cb338]" />
          </h1>
          <p className="text-gray-400 font-semibold mt-2 text-sm italic max-w-xl leading-relaxed">
            Transparent LangGraph step logs recorded during Waabi sessions. Monitor the robot's logic and decision-making pipeline.
          </p>
        </div>
        <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-sm flex items-center gap-3 shrink-0">
          <ServerCog className="w-4 h-4 text-[#064e3b]" />
          <span className="text-[10px] font-extrabold text-[#012b1d] uppercase tracking-[0.3em] leading-none">
            System Telemetry Active
          </span>
        </div>
      </header>

      {/* PATIENT SELECTOR CARD */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-xl shadow-gray-200/40 mb-10 flex flex-col md:flex-row items-center gap-6">
        <div className="p-4 bg-[#012b1d]/5 rounded-2xl text-[#012b1d]">
          <User className="w-6 h-6" />
        </div>
        <div className="flex-1 w-full">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.3em] ml-4 block mb-3">
            Select Patient to Inspect
          </label>
          <div className="relative">
            <select
              className="w-full bg-gray-50 hover:bg-white border border-transparent focus:border-gray-100 rounded-2xl px-8 py-5 font-bold text-gray-800 outline-none focus:ring-4 focus:ring-[#012b1d]/5 transition-all text-sm appearance-none cursor-pointer shadow-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">-- Choose a patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-[#012b1d] pointer-events-none w-5 h-5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50/50 border border-red-100 rounded-[2rem] p-6 text-red-600 text-sm font-semibold mb-8 flex items-center gap-3">
          <Activity className="w-5 h-5" />
          {error}
        </div>
      )}

      {loadingSteps && patientId && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-8 h-8 text-[#5cb338]" />
        </div>
      )}

      {/* EMPTY STATES */}
      {!loadingSteps && !patientId && (
        <div className="bg-gray-50/50 rounded-[3rem] p-16 border border-gray-100 text-center flex flex-col items-center">
          <Terminal className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">Awaiting Target Selection</p>
        </div>
      )}

      {!loadingSteps && patientId && grouped.length === 0 && !error && (
        <div className="bg-gray-50/50 rounded-[3rem] p-16 border border-gray-100 text-center flex flex-col items-center">
          <Activity className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.3em]">No Pipeline Traces Recorded</p>
        </div>
      )}

      {/* TIMELINE ACCORDIONS */}
      <div className="space-y-6">
        {grouped.map(({ run_id, items }) => {
          const open = expanded[run_id] !== false;
          return (
            <div
              key={run_id}
              className="bg-white rounded-[2.5rem] border border-gray-50 shadow-xl shadow-gray-200/30 overflow-hidden transition-all duration-300"
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-8 py-6 text-left bg-transparent hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded((prev) => ({ ...prev, [run_id]: !open }))}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${open ? 'bg-[#012b1d] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Terminal size={16} />
                  </div>
                  <div>
                    <span className="font-extrabold text-[#012b1d] text-sm block">Session Trace</span>
                    <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest mt-1 block truncate w-48 sm:w-auto">
                      Run ID: {run_id}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#012b1d]">
                  {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {open && (
                <div className="p-8 pt-2 border-t border-gray-50">
                  <ul className="relative">
                    {items.map((s, index) => (
                      <li key={s.id} className="relative pl-10 py-6 group">
                        
                        {/* Vertical Timeline Line */}
                        {index !== items.length - 1 && (
                          <div className="absolute left-2.5 top-8 bottom-[-24px] w-[2px] bg-gray-100" />
                        )}
                        
                        {/* Timeline Pulse Dot */}
                        <div className="absolute left-[5px] top-[30px] w-3 h-3 rounded-full bg-[#5cb338] shadow-[0_0_10px_#5cb338] z-10" />

                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 text-sm">
                          {/* Timestamp */}
                          <div className="shrink-0 w-32 pt-1">
                            <span className="text-gray-400 font-extrabold text-[9px] uppercase tracking-[0.2em] block">
                              {new Date(s.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[#012b1d] font-mono text-xs font-bold mt-1 block">
                              {new Date(s.created_at).toLocaleTimeString()}
                            </span>
                          </div>

                          {/* Data Payload */}
                          <div className="flex-1 min-w-0 bg-gray-50 rounded-[1.5rem] p-6 border border-gray-100 group-hover:border-[#012b1d]/10 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-black text-[#012b1d] uppercase tracking-widest text-[11px]">
                                NODE: {s.step_name}
                              </span>
                              {s.report_id && (
                                <span className="bg-[#5cb338]/10 text-[#064e3b] px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-widest">
                                  Report Generated
                                </span>
                              )}
                            </div>

                            {/* Raw JSON "Terminal" Output */}
                            {s.detail && (
                              <pre className="mt-4 text-[11px] font-mono text-[#5cb338] bg-[#0f172a] rounded-2xl p-5 overflow-x-auto shadow-inner border border-gray-800 leading-relaxed">
                                {JSON.stringify(s.detail, null, 2)}
                              </pre>
                            )}
                            
                            {s.report_id && (
                              <p className="text-[10px] text-gray-400 mt-4 font-mono">
                                System ID: {s.report_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentSessionTrace;