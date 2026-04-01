import React, { useMemo, useState } from "react";
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
import {
  ChartRange,
  formatDateTimeHu,
  getRangeStartDate,
  parseMonitorDate,
} from "./timeUtils.ts";

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

const chartRangeOptions: { value: ChartRange; label: string }[] = [
  { value: "24h", label: "24 óra" },
  { value: "7d", label: "7 nap" },
  { value: "30d", label: "30 nap" },
  { value: "90d", label: "90 nap" },
];

const BRAND_BLUE = "#073a59";

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
  const [chartRange, setChartRange] = useState<ChartRange>("7d");

  const chartData = useMemo(() => {
    const start = getRangeStartDate(chartRange).getTime();

    return [...logs]
      .filter((l) => l.response_time_ms != null)
      .map((l) => {
        const date = parseMonitorDate(l.checked_at || l.created_at);
        const time = date?.getTime() ?? 0;
        return {
          id: l.id,
          timestamp: time,
          idopont: date
            ? date.toLocaleString("hu-HU", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          valaszido: l.response_time_ms,
          bucket:
            (l.response_time_ms ?? 0) > 5000
              ? "lassu"
              : (l.response_time_ms ?? 0) > 1000
                ? "kozepes"
                : "gyors",
        };
      })
      .filter((x) => x.timestamp >= start)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [logs, chartRange]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-900 truncate">
              Naplók: {monitor.name || "Névtelen monitor"}
            </h3>
            <p className="text-xs text-slate-500 truncate font-mono mt-1 opacity-80">
              {monitor.url}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5">
              <span className="text-xs text-slate-600">Sorok:</span>
              <input
                type="number"
                className="w-16 rounded bg-white border border-slate-300 text-xs px-2 py-1 text-slate-700 focus:outline-none"
                value={logsLimit}
                min={10}
                max={1000}
                onChange={(e) =>
                  setLogsLimit(
                    Number.isNaN(Number(e.target.value))
                      ? 10
                      : Number(e.target.value),
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={reloadLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {logsLoading ? (
                <span
                  className="h-3.5 w-3.5 border-2 border-slate-300 rounded-full animate-spin"
                  style={{ borderTopColor: BRAND_BLUE }}
                />
              ) : (
                <FiRefreshCw className="h-3.5 w-3.5" />
              )}
              <span>{logsLoading ? "Betöltés..." : "Frissítés"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-1 py-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setLogViewTab("table")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition ${
                  logViewTab === "table"
                    ? "bg-white border border-slate-300 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
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
                    ? "bg-white border border-slate-300 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FiBarChart2 className="h-3 w-3" />
                Grafikon
              </button>
            </div>

            <button
              type="button"
              onClick={handleDeleteSiteLogs}
              disabled={deletingSiteLogs || logsLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deletingSiteLogs ? (
                <span className="h-3.5 w-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <FiTrash2 className="h-3.5 w-3.5" />
              )}
              <span>
                {deletingSiteLogs ? "Törlés..." : "Összes napló törlése"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white relative">
          {logsLoading && logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
              <span
                className="h-8 w-8 border-2 border-slate-300 rounded-full animate-spin"
                style={{ borderTopColor: BRAND_BLUE }}
              />
              <span className="text-sm">Naplók betöltése...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
              <p className="text-sm">Nincsenek elérhető bejegyzések.</p>
            </div>
          ) : logViewTab === "chart" ? (
            <div className="h-full w-full flex flex-col">
              <div className="px-6 pt-4 pb-2 text-xs text-slate-600 flex items-center justify-between gap-2">
                <span>
                  Válaszidő alakulása (
                  {chartRangeOptions.find((o) => o.value === chartRange)?.label}
                  ).
                </span>
                <select
                  value={chartRange}
                  onChange={(e) => setChartRange(e.target.value as ChartRange)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  {chartRangeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 px-4 pb-4">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-500">
                    Nincs adat a kiválasztott időtartamra.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="idopont"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        formatter={(value: any, _name, props: any) => {
                          const bucket = props?.payload?.bucket;
                          const label =
                            bucket === "lassu"
                              ? "5000 ms felett"
                              : bucket === "kozepes"
                                ? "1001-5000 ms"
                                : "0-1000 ms";
                          return [`${value} ms`, label];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="valaszido"
                        stroke={BRAND_BLUE}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 backdrop-blur shadow-sm">
                <tr className="text-slate-600">
                  <th className="px-6 py-3 font-medium uppercase tracking-wider w-52">
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
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {logs.map((log) => {
                  const isError = !log.status_code || log.status_code >= 400;
                  const statusColor = isError
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-green-100 text-green-700 border-green-200";

                  return (
                    <tr
                      key={log.id}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDateTimeHu(log.checked_at || log.created_at)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono ${statusColor}`}
                        >
                          {log.status_code ?? "HIBA"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-500">
                        {log.response_time_ms != null ? (
                          <>
                            <span
                              className={
                                log.response_time_ms > 5000
                                  ? "text-red-500"
                                  : log.response_time_ms > 1000
                                    ? "text-amber-500"
                                    : "text-slate-700"
                              }
                            >
                              {log.response_time_ms}
                            </span>
                            <span className="text-slate-400 ml-0.5">ms</span>
                          </>
                        ) : (
                          "Nincs adat"
                        )}
                      </td>
                      <td className="px-6 py-3 break-all">
                        {log.error_message ? (
                          <span className="text-red-500 font-medium">
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">OK</span>
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
