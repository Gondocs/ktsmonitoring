import React, { useMemo } from "react";
import { MonitorLog } from "./MonitorTypes.ts";
import { formatDateTimeHu, parseMonitorDate } from "./timeUtils.ts";

type Props = {
  logs: MonitorLog[];
  title: string;
  days?: number;
};

type Cell = {
  key: string;
  label: string;
  level: 0 | 1 | 2 | 3;
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
  days = 84,
}) => {
  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const levelByDay = new Map<string, Cell["level"]>();

    logs.forEach((log) => {
      const date = parseMonitorDate(log.checked_at || log.created_at);
      if (!date) return;

      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      const key = day.toISOString().slice(0, 10);
      const current = levelByDay.get(key) ?? 0;
      const next = getLogLevel(log);
      levelByDay.set(key, Math.max(current, next) as Cell["level"]);
    });

    const result: Cell[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const level = levelByDay.get(key) ?? 0;
      result.push({
        key,
        level,
        label: formatDateTimeHu(d.toISOString()),
      });
    }

    return result;
  }, [logs, days]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </p>

      <div className="mt-3 grid grid-cols-14 gap-1">
        {cells.map((cell) => (
          <div
            key={cell.key}
            title={`${cell.key}`}
            className="h-3.5 w-3.5 rounded-[2px] border border-white"
            style={{ backgroundColor: levelColor[cell.level] }}
          />
        ))}
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
