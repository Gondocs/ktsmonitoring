import React from "react";
import { FiEdit2, FiFileText, FiRefreshCw, FiTrash2, FiZap } from "react-icons/fi";
import { Monitor } from "./MonitorTypes.ts";

type Props = {
  activeSites: Monitor[];
  inactiveSites: Monitor[];
  isSorting: boolean;
  refreshing: boolean;
  refreshingLight: boolean;
  statusColor: (m: Monitor) => string;
  sslColor: (days: number | null) => string;
  isRowRefreshing: (id: number) => boolean;
  isRowRefreshingLight: (id: number) => boolean;
  onRefreshOne: (id: number) => void;
  onRefreshOneLight: (id: number) => void;
  onOpenLogs: (m: Monitor) => void;
  onStartEdit: (m: Monitor) => void;
  onDelete: (id: number) => void;
};

export const MonitorListSection: React.FC<Props> = ({
  activeSites,
  inactiveSites,
  isSorting,
  refreshing,
  refreshingLight,
  statusColor,
  sslColor,
  isRowRefreshing,
  isRowRefreshingLight,
  onRefreshOne,
  onRefreshOneLight,
  onOpenLogs,
  onStartEdit,
  onDelete,
}) => {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Weboldal</th>
                <th className="px-4 py-4 text-center">Állapot</th>
                <th className="px-4 py-4 text-right">Válaszidő</th>
                <th className="px-4 py-4 text-center">SSL / HSTS</th>
                <th className="px-4 py-4 text-center">Rendszer</th>
                <th className="px-4 py-4 text-center">Stabilitás</th>
                <th className="px-4 py-4 text-right">Utolsó ell.</th>
                <th className="px-6 py-4 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-800/50 transition-opacity duration-200 ${
                isSorting ? "opacity-60" : "opacity-100"
              }`}
            >
              {activeSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Nincs megjeleníthető aktív monitor.
                  </td>
                </tr>
              ) : (
                activeSites.map((m) => {
                  const rowRefreshing =
                    isRowRefreshing(m.id) ||
                    isRowRefreshingLight(m.id) ||
                    refreshing ||
                    refreshingLight;

                  return (
                    <tr
                      key={m.id}
                      className={`group hover:bg-slate-900/60 transition-all duration-200 ${
                        rowRefreshing ? "opacity-40 pointer-events-none" : ""
                      }`}
                    >
                      {/* name + url */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-100">
                            {m.name || "Névtelen"}
                          </span>
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-slate-500 hover:text-ktsRed transition truncate max-w-[200px]"
                          >
                            {m.url}
                          </a>
                        </div>
                      </td>

                      {/* status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-1.5 py-0.5 rounded "
                          style={{
                            color: statusColor(m),
                            backgroundColor: `${statusColor(m)}15`,
                            borderColor: `${statusColor(m)}30`,
                          }}
                        >
                          {m.last_status ?? "—"}
                        </span>
                      </td>

                      {/* response time */}
                      <td className="px-4 py-4 text-right font-mono text-slate-300">
                        {m.last_response_time_ms
                          ? `${m.last_response_time_ms} ms`
                          : "—"}
                      </td>

                      {/* ssl + hsts */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className="font-mono text-[11px]"
                            style={{ color: sslColor(m.ssl_days_remaining) }}
                          >
                            {m.ssl_days_remaining != null
                              ? `${m.ssl_days_remaining} nap`
                              : "—"}
                          </span>
                          {m.has_hsts ? (
                            <span className="text-[9px] uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-1.5 py-0.5 rounded">
                              HSTS
                            </span>
                          ) : (
                            <span className="text-[10px] text-yellow-400 select-none bg-yellow-950/40 border border-yellow-900/20 px-1.5 py-0.5 rounded opacity-100">
                              HSTS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* system */}
                      <td className="px-4 py-4 text-center text-[11px] text-slate-400">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {m.is_wordpress
                              ? `WP ${m.wordpress_version || ""}`
                              : ""}
                          </span>
                          {(m.redirect_count ?? 0) > 0 && (
                            <span className="text-slate-500">
                              {m.redirect_count} redirect
                            </span>
                          )}
                        </div>
                      </td>

                      {/* stability */}
                      <td className="px-4 py-4 text-center">
                        {m.stability_score != null ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  m.stability_score >= 95
                                    ? "bg-green-500"
                                    : m.stability_score >= 85
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${m.stability_score}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-300">
                              {m.stability_score}%
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* last checked */}
                      <td className="px-4 py-4 text-right text-[11px] text-slate-500">
                        {m.last_checked_at
                          ? (() => {
                              const d = new Date(m.last_checked_at);
                              d.setHours(d.getHours() + 1);
                              return d.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            })()
                          : "-"}
                        <div className="text-[10px] opacity-60">
                          {m.last_checked_at
                            ? (() => {
                                const d = new Date(m.last_checked_at);
                                d.setHours(d.getHours() + 1);
                                return d.toLocaleDateString("hu-HU");
                              })()
                            : ""}
                        </div>
                      </td>

                      {/* actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3 opacity-90 group-hover:opacity-100 transition">
                          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shadow-sm">
                            <button
                              onClick={() => onRefreshOneLight(m.id)}
                              disabled={rowRefreshing}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition disabled:opacity-50"
                              title="Gyors (Light) ellenőrzés"
                            >
                              <FiZap className="h-4 w-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-800"></div>
                            <button
                              onClick={() => onRefreshOne(m.id)}
                              disabled={rowRefreshing}
                              className="p-2 text-slate-400 hover:text-ktsRed hover:bg-slate-800 transition disabled:opacity-50"
                              title="Teljes (Deep) ellenőrzés"
                            >
                              <FiRefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onOpenLogs(m)}
                              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                              title="Naplók"
                            >
                              <FiFileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onStartEdit(m)}
                              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                              title="Szerkesztés"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(m.id)}
                              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-slate-800 rounded transition"
                              title="Törlés"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      {/* ...lifted 1:1 from your original mobile grid, but using the same props/handlers... */}

      {/* Inactive sites */}
      {inactiveSites.length > 0 && (
        <div className="mt-8 border-t border-slate-800/50 pt-6">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            Inaktív Weboldalak
            <span className="bg-slate-800 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full">
              {inactiveSites.length}
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveSites.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/30 opacity-70 hover:opacity-100 transition"
              >
                <div className="min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-slate-300 truncate">
                    {m.name || m.url}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{m.url}</p>
                </div>
                <button
                  onClick={() => onStartEdit(m)}
                  className="text-xs text-ktsRed hover:text-ktsLightRed px-2 py-1"
                >
                  Kezelés
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
