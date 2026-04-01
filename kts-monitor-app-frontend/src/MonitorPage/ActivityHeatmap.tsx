import React, { useMemo } from "react";
import { MonitorLog } from "./MonitorTypes.ts";
import { parseMonitorDate } from "./timeUtils.ts";

type HeatmapLog = MonitorLog & {
  monitor_name?: string;
  monitor_url?: string;
};

type Props = {
  logs: HeatmapLog[];
  title: string;
  range: HeatmapRange;
  cellSize?: "sm" | "lg";
  onCellClick?: (log: HeatmapLog) => void;
};

export type HeatmapRange = "6h" | "12h" | "24h" | "48h" | "7d" | "14d";

type Cell = {
  key: string;
  label: string;
  level: 0 | 1 | 2 | 3;
  log: HeatmapLog;
};

const levelColor: Record<Cell["level"], string> = {
  0: "#e2e8f0",
  1: "#22c55e",
  2: "#f59e0b",
  3: "#af272f",
};

const getLogLevel = (log: MonitorLog): Cell["level"] => {
  if (!log.status_code || log.status_code >= 500) return 3;
  if (log.status_code >= 400) return 2;
  if ((log.response_time_ms ?? 0) > 2500) return 2;
  return 1;
};

export const ActivityHeatmap: React.FC<Props> = ({
  logs,
  title,
  range,
  cellSize = "sm",
  onCellClick,
}) => {
  const cells = useMemo(() => {
    const now = Date.now();
    const isHourRange = range.endsWith("h");
    const amount = isHourRange
      ? Number.parseInt(range.replace("h", ""), 10)
      : Number.parseInt(range.replace("d", ""), 10);
    const rangeMs = isHourRange
      ? amount * 60 * 60 * 1000
      : amount * 24 * 60 * 60 * 1000;
    const start = now - rangeMs;

    return [...logs]
      .map((log) => {
        const date = parseMonitorDate(log.checked_at || log.created_at);
        return {
          log,
          date,
          ts: date?.getTime() ?? 0,
        };
      })
      .filter((x) => x.date && x.ts >= start && x.ts <= now)
      .sort((a, b) => a.ts - b.ts)
      .map((entry) => {
        const dateLabel = entry.date
          ? entry.date.toLocaleString("hu-HU", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Nincs időpont";
        const monitorLabel = entry.log.monitor_name
          ? ` | ${entry.log.monitor_name}`
          : "";
        const statusLabel = ` | HTTP ${entry.log.status_code ?? "HIBA"}`;

        return {
          key: `${entry.log.id}-${entry.ts}`,
          level: getLogLevel(entry.log),
          label: `${dateLabel}${monitorLabel}${statusLabel}`,
          log: entry.log,
        };
      });
  }, [logs, range]);
  const columns = cellSize === "lg" ? 36 : 28;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </p>

      <div className="mt-3">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {cells.map((cell) => (
            <div
              key={cell.key}
              title={cell.label}
              onClick={onCellClick ? () => onCellClick(cell.log) : undefined}
              className={`aspect-square rounded-[2px] border border-white ${
                onCellClick
                  ? "cursor-pointer hover:ring-1 hover:ring-slate-400"
                  : ""
              }`}
              style={{ backgroundColor: levelColor[cell.level] }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-slate-500">
        <span>Kevesebb</span>
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: levelColor[0] }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: levelColor[1] }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: levelColor[2] }}
        />
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: levelColor[3] }}
        />
        <span>Több kiesés</span>
      </div>
    </div>
  );
};
