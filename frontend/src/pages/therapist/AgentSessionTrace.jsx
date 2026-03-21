import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Loader2, Activity, ChevronDown, ChevronUp } from "lucide-react";

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
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

  const grouped = React.useMemo(() => {
    const m = new Map();
    for (const row of steps) {
      const rid = row.run_id || "unknown";
      if (!m.has(rid)) m.set(rid, []);
      m.get(rid).push(row);
    }
    return Array.from(m.entries()).map(([run_id, items]) => ({
      run_id,
      items: items.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      ),
    }));
  }, [steps]);

  if (loadingPatients) {
    return (
      <div className="flex justify-center py-24 text-[#012b1d]">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#012b1d] tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7" />
            Agent pipeline
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            LangGraph steps recorded during robot / GUI sessions (after SQL
            migration). Stays in sync when you change the agentic pipeline —
            step names come from node ids.
          </p>
        </div>
        <div className="min-w-[240px]">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
            Patient
          </label>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loadingSteps && patientId && (
        <div className="flex justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      )}

      {!loadingSteps && patientId && grouped.length === 0 && !error && (
        <p className="text-slate-400 text-sm">No pipeline steps for this patient yet.</p>
      )}

      <div className="space-y-4">
        {grouped.map(({ run_id, items }) => {
          const open = expanded[run_id] !== false;
          return (
            <div
              key={run_id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [run_id]: !open }))
                }
              >
                <span className="font-mono text-xs text-slate-600 truncate pr-4">
                  Run {run_id}
                </span>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {open && (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {items.map((s) => (
                    <li
                      key={s.id}
                      className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-2 text-sm"
                    >
                      <span className="text-slate-400 shrink-0 w-44 font-mono text-xs">
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[#012b1d]">
                          {s.step_name}
                        </span>
                        {s.detail && (
                          <pre className="mt-1 text-xs text-slate-600 whitespace-pre-wrap break-words bg-slate-50 rounded-lg p-2">
                            {JSON.stringify(s.detail, null, 2)}
                          </pre>
                        )}
                        {s.report_id && (
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            report: {s.report_id}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentSessionTrace;
