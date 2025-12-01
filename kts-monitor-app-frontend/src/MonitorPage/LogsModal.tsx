// src/MonitorPage/LogsModal.tsx
import React from "react";
import {
  FiRefreshCw,
  FiTrash2,
  FiX,
  FiBarChart2,
  FiList,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Monitor, MonitorLog } from "./MonitorTypes.ts";

type LogsModalProps = {
  monitor: Monitor;
  logs: MonitorLog[];
  logsLoading: boolean;
  logsLimit: number;
  setLogsLimit: (value: number) => void;
  logViewTab: "table" | "chart";
  setLogViewTab: (value: "table" | "chart") => void;
  onClose: () => void;
  reloadLogs: () => void;
  deletingSiteLogs: boolean;
  handleDeleteSiteLogs: () => void;
};

export const LogsModal: React.FC<LogsModalProps> = ({
  monitor,
  logs,
  logsLoading,
  logsLimit,
  setLogsLimit,
  logViewTab,
  setLogViewTab,
  onClose,
  reloadLogs,
  deletingSiteLogs,
  handleDeleteSiteLogs,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/70 px-6 py-4">
          <div className="overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-50 truncate">
              Napló: {monitor.name || "Névtelen monitor"}
            </h3>
            <p className="text-xs text-slate-400 truncate font-mono mt-1 opacity-80">
              {monitor.url}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-6 py-3">
          {/* Left controls: limit + reload */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5">
              <span className="text-xs text-slate-400">Sorok:</span>
              <input
                type="number"
                className="w-16 rounded bg-slate-950 border border-slate-800 text-xs px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-ktsRed focus:border-ktsRed"
                value={logsLimit}
                min={10}
                max={1000}
                onChange={(e) =>
                  setLogsLimit(
                    Number.isNaN(Number(e.target.value))
                      ? 10
                      : Number(e.target.value)
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={reloadLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {logsLoading ? (
                <span className="h-3.5 w-3.5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
              ) : (
                <FiRefreshCw className="h-3.5 w-3.5" />
              )}
              <span>{logsLoading ? "Betöltés..." : "Frissítés"}</span>
            </button>
          </div>

          {/* Right controls: view tabs + delete */}
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/80 px-1 py-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setLogViewTab("table")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition ${
                  logViewTab === "table"
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                <FiList className="h-3 w-3" />
                Táblázat
              </button>
              <button
                type="button"
                onClick={() => setLogViewTab("chart")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition ${
                  logViewTab === "chart"
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                <FiBarChart2 className="h-3 w-3" />
                Grafikon
              </button>
            </div>

            {/* Delete all logs for this monitor */}
            <button
              type="button"
              onClick={handleDeleteSiteLogs}
              disabled={deletingSiteLogs || logsLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50 hover:border-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deletingSiteLogs ? (
                <span className="h-3.5 w-3.5 border-2 border-red-400/60 border-t-red-100 rounded-full animate-spin" />
              ) : (
                <FiTrash2 className="h-3.5 w-3.5" />
              )}
              <span>
                {deletingSiteLogs ? "Törlés..." : "Összes napló törlése"}
              </span>
            </button>
          </div>
        </div>

        {/* Content – vissza az eredeti logika */}
        <div className="flex-1 overflow-auto bg-slate-950 relative">
          {logsLoading && logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400 gap-2">
              <span className="h-8 w-8 border-2 border-slate-700 border-t-ktsRed rounded-full animate-spin" />
              <span className="text-sm">Naplók betöltése...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
              <svg
                className="h-10 w-10 opacity-20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">Nincsenek elérhető bejegyzések.</p>
            </div>
          ) : logViewTab === "chart" ? (
            <div className="h-full w-full flex flex-col">
              <div className="px-6 pt-4 pb-2 text-xs text-slate-400 flex justify-between items-center">
                <span>
                  Válaszidő alakulása (ms) az utolsó {logs.length} mérés
                  alapján.
                </span>
                <span className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-1.5 rounded bg-slate-300" />
                    <span>&lt;= 1000ms</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-1.5 rounded bg-orange-400" />
                    <span>1001–5000ms</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-1.5 rounded bg-red-400" />
                    <span>&gt; 5000ms / hiba</span>
                  </span>
                </span>
              </div>
              <div className="flex-1 px-4 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...logs]
                      .filter((l) => l.response_time_ms !== null)
                      .map((l) => ({
                        ...l,
                        timeLabel: new Date(
                          new Date(l.checked_at || l.created_at).getTime() +
                            3600000
                        ).toLocaleTimeString("hu-HU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }),
                        bucket:
                          l.response_time_ms! > 5000
                            ? "slow"
                            : l.response_time_ms! > 1000
                            ? "medium"
                            : "fast",
                      }))
                      .reverse()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="timeLabel"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#9ca3af" }}
                      formatter={(value: any, _name, props: any) => {
                        const rt = value as number;
                        const bucket = props?.payload?.bucket;
                        const label =
                          bucket === "slow"
                            ? "> 5000ms"
                            : bucket === "medium"
                            ? "1001–5000ms"
                            : "<= 1000ms";
                        return [`${rt} ms`, label];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="response_time_ms"
                      stroke="#e5e7eb" // a vonal marad fehér
                      strokeWidth={2}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const bucket = payload.bucket as
                          | "fast"
                          | "medium"
                          | "slow";

                        const color =
                          bucket === "slow"
                            ? "#f87171" // piros: > 5000ms / hiba
                            : bucket === "medium"
                            ? "#fb923c" // narancs: 1001–5000ms
                            : "#e5e7eb"; // világos: <= 1000ms

                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill={color}
                            stroke="none"
                          />
                        );
                      }}
                      activeDot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const bucket = payload.bucket as
                          | "fast"
                          | "medium"
                          | "slow";

                        const color =
                          bucket === "slow"
                            ? "#f87171"
                            : bucket === "medium"
                            ? "#fb923c"
                            : "#e5e7eb";

                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={color}
                            stroke="#0f172a"
                            strokeWidth={2}
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur shadow-sm">
                <tr className="text-slate-400">
                  <th className="px-6 py-3 font-medium uppercase tracking-wider w-40">
                    Időpont
                  </th>
                  <th className="px-6 py-3 font-medium uppercase tracking-wider w-24 text-center">
                    Státusz
                  </th>
                  <th className="px-6 py-3 font-medium uppercase tracking-wider w-32 text-right">
                    Válaszidő
                  </th>
                  <th className="px-6 py-3 font-medium uppercase tracking-wider">
                    Hibaüzenet / Részletek
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {logs.map((log) => {
                  const isError = !log.status_code || log.status_code >= 400;
                  const statusColor = isError
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-green-500/10 text-green-400 border-green-500/20";

                  return (
                    <tr
                      key={log.id}
                      className="group hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(
                          log.checked_at || log.created_at
                        ).toLocaleString("hu-HU", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono ${statusColor}`}
                        >
                          {log.status_code ?? "ERR"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-400">
                        {log.response_time_ms ? (
                          <>
                            <span
                              className={
                                log.response_time_ms > 5000
                                  ? "text-red-400"
                                  : log.response_time_ms > 1000
                                  ? "text-orange-400"
                                  : "text-slate-200"
                              }
                            >
                              {log.response_time_ms}
                            </span>
                            <span className="text-slate-600 ml-0.5">ms</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-3 break-all">
                        {log.error_message ? (
                          <span className="text-red-400 font-medium flex items-center gap-1.5">
                            <svg
                              className="h-3 w-3 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
