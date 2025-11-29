import React, { useEffect, useState } from "react";
import {
  FiRefreshCw,
  FiFileText,
  FiTrash2,
  FiSettings,
  FiEdit2,
} from "react-icons/fi";
import {
  fetchSites,
  checkAllSites,
  checkOneSite,
  createSite,
  deleteSite,
  fetchSiteLogs,
  getMonitorInterval,
  setMonitorInterval,
  updateSite,
} from "./api.ts";
import { useAuth } from "./auth.tsx";

type Monitor = {
  id: number;
  url: string;
  name: string;
  last_status: number | null;
  last_response_time_ms: number | null;
  ssl_days_remaining: number | null;
  has_hsts: boolean | null;
  redirect_count: number | null;
  is_wordpress: boolean | null;
  wordpress_version: string | null;
  content_last_modified_at: string | null;
  stability_score: number | null;
  last_checked_at: string | null;
  is_active: boolean;
};

type MonitorLog = {
  id: number;
  monitor_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
  created_at: string;
};

export const MonitorPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [sites, setSites] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");

  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [logModalMonitor, setLogModalMonitor] = useState<Monitor | null>(null);
  const [logs, setLogs] = useState<MonitorLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLimit, setLogsLimit] = useState(50);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [intervalMinutes, setIntervalMinutesState] = useState<number | null>(
    null
  );
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalSaving, setIntervalSaving] = useState(false);

  const [editMonitor, setEditMonitor] = useState<Monitor | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  const loadSites = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSites();
      setSites(data);
    } catch (err: any) {
      setError(err.message || "Nem sikerült betölteni a monitorokat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await checkAllSites();
      await loadSites();
    } catch (err: any) {
      alert(err.message || "Nem sikerült frissíteni az összes weboldalt.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshOne = async (id: number) => {
    setRefreshingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    try {
      await checkOneSite(id);
      await loadSites();
    } catch (err: any) {
      alert(err.message || "Nem sikerült frissíteni a weboldalt.");
    } finally {
      setRefreshingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    try {
      let normalizedUrl = newUrl.trim();

      // Ha nincs séma (http/https), akkor tegyünk elé https://
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      await createSite({ url: normalizedUrl, name: newName || undefined });
      setNewUrl("");
      setNewName("");
      await loadSites();
    } catch (err: any) {
      alert(err.message || "Nem sikerült hozzáadni a weboldalt.");
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        "Biztosan törölni szeretnéd ezt a monitorozott weboldalt?"
      )
    )
      return;
    try {
      await deleteSite(id);
      await loadSites();
    } catch (err: any) {
      alert(err.message || "Nem sikerült törölni a weboldalt.");
    }
  };

  const openLogsModal = async (monitor: Monitor) => {
    setLogModalMonitor(monitor);
    setLogs([]);
    setLogsLoading(true);
    try {
      const data = await fetchSiteLogs(monitor.id, logsLimit);
      setLogs(data);
    } catch (err: any) {
      alert(err.message || "Nem sikerült betölteni a naplókat.");
      setLogModalMonitor(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const reloadLogs = async () => {
    if (!logModalMonitor) return;
    setLogsLoading(true);
    try {
      const data = await fetchSiteLogs(logModalMonitor.id, logsLimit);
      setLogs(data);
    } catch (err: any) {
      alert(err.message || "Nem sikerült betölteni a naplókat.");
    } finally {
      setLogsLoading(false);
    }
  };

  const statusColor = (m: Monitor) => {
    if (m.last_status === 200) {
      if (m.last_response_time_ms != null && m.last_response_time_ms > 5000) {
        return "orange";
      }
      if (m.stability_score != null && m.stability_score < 67) {
        return "orange";
      }
      return "green";
    }
    return "red";
  };

  const sslColor = (days: number | null) => {
    if (days == null) return "";
    if (days < 3) return "red";
    if (days < 14) return "orange";
    return "green";
  };

  const isRowRefreshing = (id: number) => refreshingIds.includes(id);

  const openSettings = async () => {
    setSettingsOpen(true);
    setIntervalLoading(true);
    try {
      const data = await getMonitorInterval();
      setIntervalMinutesState(data.interval_minutes ?? null);
    } catch (err: any) {
      alert(err.message || "Nem sikerült betölteni a beállításokat.");
    } finally {
      setIntervalLoading(false);
    }
  };

  const saveInterval = async () => {
    if (intervalMinutes == null || Number.isNaN(intervalMinutes)) return;
    setIntervalSaving(true);
    try {
      const data = await setMonitorInterval(intervalMinutes);
      setIntervalMinutesState(data.interval_minutes ?? intervalMinutes);
      alert("Intervallum sikeresen frissítve.");
    } catch (err: any) {
      alert(err.message || "Nem sikerült menteni az intervallumot.");
    } finally {
      setIntervalSaving(false);
    }
  };

  const startEditMonitor = (monitor: Monitor) => {
    setEditMonitor(monitor);
    setEditUrl(monitor.url || "");
    setEditName(monitor.name || "");
    setEditIsActive(monitor.is_active);
  };

  const saveEditMonitor = async () => {
    if (!editMonitor) return;
    setEditSaving(true);
    try {
      let normalizedUrl = editUrl.trim();
      if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      await updateSite(editMonitor.id, {
        url: normalizedUrl || undefined,
        name: editName || null,
        is_active: editIsActive,
      });

      await loadSites();
      setEditMonitor(null);
    } catch (err: any) {
      alert(err.message || "Nem sikerült menteni a módosításokat.");
    } finally {
      setEditSaving(false);
    }
  };

  let activeSites = sites.filter((s) => s.is_active);

  // Rendezés
  activeSites = [...activeSites].sort((a, b) => {
    let v1: any;
    let v2: any;

    switch (sortBy) {
      case "name":
        v1 = a.name?.toLowerCase() ?? "";
        v2 = b.name?.toLowerCase() ?? "";
        break;
      case "response_time":
        v1 = a.last_response_time_ms ?? 999999;
        v2 = b.last_response_time_ms ?? 999999;
        break;
      case "status":
        v1 = a.last_status ?? 0;
        v2 = b.last_status ?? 0;
        break;
      case "redirect":
        v1 = a.redirect_count ?? 0;
        v2 = b.redirect_count ?? 0;
        break;
      case "stability":
        v1 = a.stability_score ?? 0;
        v2 = b.stability_score ?? 0;
        break;
      case "last_checked":
        v1 = a.last_checked_at ? new Date(a.last_checked_at).getTime() : 0;
        v2 = b.last_checked_at ? new Date(b.last_checked_at).getTime() : 0;
        break;
      default:
        v1 = "";
        v2 = "";
    }

    if (v1 < v2) return sortDirection === "asc" ? -1 : 1;
    if (v1 > v2) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const inactiveSites = sites.filter((s) => !s.is_active);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/ktsonlinelogo.png"
              alt="KTS Online logó"
              className="h-10 w-auto drop-shadow-md"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                Weboldal monitoring felület
              </span>
              <h1 className="text-lg font-semibold text-slate-50 hidden sm:block">
                Weboldal monitorozó áttekintés
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {user && (
              <p className="text-xs sm:text-sm text-slate-300">
                Belépve mint{" "}
                <span className="font-semibold text-ktsLightRed">
                  {user.email}
                </span>
              </p>
            )}
            <button
              type="button"
              onClick={openSettings}
              className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 p-2 text-slate-200 hover:border-ktsRed hover:text-white hover:bg-ktsRed/80 transition"
              title="Beállítások"
            >
              <FiSettings className="h-4 w-4" />
            </button>

            <button
              onClick={logout}
              className="text-xs sm:text-sm inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-100 hover:border-ktsRed hover:text-white hover:bg-ktsRed/80 transition"
            >
              Kijelentkezés
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
            <label>Rendezés:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1"
            >
              <option value="name">Név (A-Z)</option>
              <option value="response_time">Válaszidő</option>
              <option value="status">HTTP kód</option>
              <option value="redirect">Átirányítás</option>
              <option value="stability">Stabilitás</option>
              <option value="last_checked">Utolsó ellenőrzés</option>
            </select>

            <button
              onClick={() =>
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              }
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
            >
              {sortDirection === "asc" ? "▲" : "▼"}
            </button>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              Monitorozott weboldalak
            </h2>
            <p className="text-sm text-slate-400">
              Állapot, válaszidő, SSL lejárat és stabilitás egy helyen.
            </p>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ktsRed hover:bg-ktsLightRed disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white shadow-md shadow-ktsRed/30 transition"
          >
            {refreshing && (
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {refreshing ? "Összes frissítése…" : "Összes weboldal frissítése"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="h-4 w-4 border-2 border-slate-600 border-t-ktsRed rounded-full animate-spin" />
            <span>Monitorozott weboldalak betöltése…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            {/* Mobile / small-screen card layout for aktív oldalak */}
            <div className="space-y-3 md:hidden">
              {activeSites.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400 text-center">
                  Jelenleg nincs még aktív monitorozott weboldal.
                </div>
              ) : (
                activeSites.map((m) => {
                  const rowRefreshing = isRowRefreshing(m.id) || refreshing;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border border-slate-800 bg-slate-900/70 p-3 shadow-sm flex flex-col gap-2 ${
                        rowRefreshing ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-semibold text-slate-50 truncate"
                            title={m.name}
                          >
                            {m.name || m.url}
                          </p>
                          <p
                            className="text-xs text-slate-400 truncate"
                            title={m.url}
                          >
                            {m.url}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => startEditMonitor(m)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
                            title="Szerkesztés"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRefreshOne(m.id)}
                            disabled={rowRefreshing}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                            title="Frissítés"
                          >
                            <FiRefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openLogsModal(m)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
                            title="Naplók"
                          >
                            <FiFileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-900/70 hover:bg-red-700 text-red-50 border border-red-700 transition"
                            title="Törlés"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300 mt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">HTTP</span>
                          <span style={{ color: statusColor(m) }}>
                            {m.last_status ?? "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Válaszidő</span>
                          <span>
                            {m.last_response_time_ms != null
                              ? `${m.last_response_time_ms} ms`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">SSL napok</span>
                          <span
                            style={{ color: sslColor(m.ssl_days_remaining) }}
                          >
                            {m.ssl_days_remaining != null
                              ? `${m.ssl_days_remaining} nap`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">HSTS</span>
                          <span>{m.has_hsts ? "igen" : "nem"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Átirányítás</span>
                          <span>{m.redirect_count ?? "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">WordPress</span>
                          <span>
                            {m.is_wordpress
                              ? m.wordpress_version
                                ? `WP ${m.wordpress_version}`
                                : "WordPress"
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Stabilitás</span>
                          <span>
                            {m.stability_score != null
                              ? `${m.stability_score}%`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-slate-400">
                            Utolsó ellenőrzés
                          </span>
                          <span>
                            {m.last_checked_at
                              ? new Date(m.last_checked_at).toLocaleString()
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop / tablet table layout */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
              <table className="min-w-full text-[11px] sm:text-xs">
                <thead className="bg-slate-900/80 text-slate-300 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Név</th>
                    <th className="px-3 py-2 text-left">URL</th>
                    <th className="px-3 py-2 text-center">HTTP</th>
                    <th className="px-3 py-2 text-center">Válaszidő (ms)</th>
                    <th className="px-3 py-2 text-center">SSL napok</th>
                    <th className="px-3 py-2 text-center">HSTS</th>
                    <th className="px-3 py-2 text-center">Átirányítás</th>
                    <th className="px-3 py-2 text-center">WordPress</th>
                    <th className="px-3 py-2 text-center">Stabilitás</th>
                    <th className="px-3 py-2 text-center">Utolsó ellenőrzés</th>
                    <th className="px-3 py-2">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {activeSites.map((m) => {
                    const rowRefreshing = isRowRefreshing(m.id) || refreshing;
                    return (
                      <tr
                        key={m.id}
                        className={
                          "hover:bg-slate-800/60 transition " +
                          (rowRefreshing
                            ? "opacity-60 pointer-events-none"
                            : "")
                        }
                      >
                        <td className="px-3 py-2 font-medium text-slate-100 flex items-center gap-2">
                          {rowRefreshing && (
                            <span className="h-3 w-3 border-2 border-slate-500 border-t-ktsRed rounded-full animate-spin" />
                          )}
                          <span>{m.name}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-300 break-all ">
                          {m.url}
                        </td>
                        <td
                          className="px-3 py-2 font-mono text-xs text-center"
                          style={{ color: statusColor(m) }}
                        >
                          {m.last_status ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.last_response_time_ms ?? "-"}
                        </td>
                        <td
                          className="px-3 py-2 font-mono text-xs text-center"
                          style={{ color: sslColor(m.ssl_days_remaining) }}
                        >
                          {m.ssl_days_remaining != null
                            ? `${m.ssl_days_remaining} nap`
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.has_hsts ? "igen" : "nem"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.redirect_count ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.is_wordpress
                            ? m.wordpress_version
                              ? `WordPress ${m.wordpress_version}`
                              : "WordPress"
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.stability_score != null
                            ? `${m.stability_score}%`
                            : "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          {m.last_checked_at
                            ? new Date(m.last_checked_at).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-nowrap items-center gap-1.5 justify-end min-w-[220px]">
                            <button
                              onClick={() => startEditMonitor(m)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
                              title="Szerkesztés"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRefreshOne(m.id)}
                              disabled={rowRefreshing}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                              title="Frissítés"
                            >
                              <FiRefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openLogsModal(m)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
                              title="Naplók"
                            >
                              <FiFileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-900/70 hover:bg-red-700 text-red-50 border border-red-700 transition"
                              title="Törlés"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {activeSites.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-3 py-6 text-center text-sm text-slate-400"
                      >
                        Jelenleg nincs még aktív monitorozott weboldal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Inaktív weboldalak szekció */}
            {inactiveSites.length > 0 && (
              <section className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold text-slate-200">
                  Inaktív weboldalak
                </h3>
                <p className="text-xs text-slate-400">
                  Ezek a weboldalak jelenleg nincsenek aktívan monitorozva.
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {inactiveSites.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="font-semibold text-slate-100 truncate"
                            title={m.name || m.url}
                          >
                            {m.name || m.url}
                          </p>
                          <p className="text-[11px] text-slate-400 break-all">
                            {m.url}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-slate-800 text-[10px] px-2 py-0.5 text-amber-300 border border-amber-500/50">
                          Inaktív
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => startEditMonitor(m)}
                          className="inline-flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 border border-slate-700 text-[11px]"
                        >
                          Szerkesztés
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section className="mt-6 border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Új weboldal monitor hozzáadása
          </h3>
          <p className="text-xs text-slate-400">
            Add meg az URL-t, opcionálisan egy könnyen azonosítható nevet.
          </p>
          <form
            onSubmit={handleAdd}
            className="flex flex-col sm:flex-row gap-3 flex-wrap"
          >
            <input
              type="text"
              placeholder="URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
              className="flex-1 min-w-[220px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
            />

            <input
              type="text"
              placeholder="Opcionális megjelenített név"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[160px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-ktsRed hover:bg-ktsLightRed px-4 py-2 text-sm font-semibold text-white shadow-md shadow-ktsRed/30 transition"
            >
              Hozzáadás
            </button>
          </form>
        </section>
      </main>

      {/* Logs modal */}
      {logModalMonitor && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70"
          onClick={() => setLogModalMonitor(null)}
        >
          <div
            className="max-w-4xl w-[94%] max-h-[80vh] overflow-auto rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-50">
                  Naplóbejegyzések: {logModalMonitor.name}
                </h3>
                <p className="text-xs text-slate-400 break-all">
                  {logModalMonitor.url}
                </p>
              </div>
              <button
                onClick={() => setLogModalMonitor(null)}
                className="self-start inline-flex items-center rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 px-3 py-1.5 border border-slate-600 transition"
              >
                Bezárás
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <span>Megjelenített sorok száma:</span>
                <input
                  type="number"
                  value={logsLimit}
                  min={10}
                  max={1000}
                  onChange={(e) => setLogsLimit(Number(e.target.value) || 10)}
                  className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-ktsRed"
                />
              </label>
              <button
                onClick={reloadLogs}
                disabled={logsLoading}
                className="inline-flex items-center rounded-full bg-ktsRed hover:bg-ktsLightRed disabled:opacity-60 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                {logsLoading ? "Betöltés…" : "Naplók újratöltése"}
              </button>
            </div>

            {logsLoading ? (
              <p className="text-sm text-slate-300">Betöltés…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-slate-300">
                Még nincsenek naplóbejegyzések.
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/70">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-900/90 text-slate-300 uppercase tracking-wide text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-left">Időpont</th>
                      <th className="px-3 py-2">HTTP</th>
                      <th className="px-3 py-2">Válaszidő (ms)</th>
                      <th className="px-3 py-2 text-left">Hibaüzenet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/60">
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {new Date(
                            log.checked_at || log.created_at
                          ).toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {log.status_code ?? "-"}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {log.response_time_ms ?? "-"}
                        </td>
                        <td
                          className="px-3 py-1.5 text-left text-xs"
                          style={{
                            color: log.error_message ? "#f87171" : undefined,
                          }}
                        >
                          {log.error_message ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="max-w-md w-[94%] rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-50">
                  Beállítások
                </h3>
                <p className="text-xs text-slate-400">
                  Monitor ellenőrzési intervallum módosítása (percben).
                </p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="inline-flex items-center rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 px-3 py-1.5 border border-slate-600 transition"
              >
                Bezárás
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-200">
              <label className="flex flex-col gap-1">
                <span>Intervallum percekben</span>
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={intervalMinutes ?? ""}
                  onChange={(e) =>
                    setIntervalMinutesState(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="mt-0.5 w-32 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-ktsRed"
                />
                <span className="text-xs text-slate-400">
                  6 óra = 360 perc, 5 perc = 5 perc stb.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {intervalLoading ? (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="h-3 w-3 border-2 border-slate-600 border-t-ktsRed rounded-full animate-spin" />
                  <span>Intervallum betöltése…</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Aktuális érték:{" "}
                  {intervalMinutes != null ? `${intervalMinutes} perc` : "—"}
                </p>
              )}
              <button
                onClick={saveInterval}
                disabled={
                  intervalSaving || intervalLoading || intervalMinutes == null
                }
                className="inline-flex items-center rounded-full bg-ktsRed hover:bg-ktsLightRed disabled:opacity-60 disabled:cursor-not-allowed px-4 py-1.5 text-xs font-semibold text-white transition"
              >
                {intervalSaving ? "Mentés…" : "Mentés"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit monitor modal */}
      {editMonitor && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70"
          onClick={() => setEditMonitor(null)}
        >
          <div
            className="max-w-md w-[94%] rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-50">
                  Monitor szerkesztése
                </h3>
                <p className="text-xs text-slate-400 break-all">
                  {editMonitor.url}
                </p>
              </div>
              <button
                onClick={() => setEditMonitor(null)}
                className="inline-flex items-center rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 px-3 py-1.5 border border-slate-600 transition"
              >
                Bezárás
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-200">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  URL
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Megjelenített név (opcionális)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-ktsRed focus:ring-ktsRed"
                />
                <span>Aktív monitorozás engedélyezése</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setEditMonitor(null)}
                className="inline-flex items-center rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 px-4 py-1.5 border border-slate-600 transition"
              >
                Mégse
              </button>
              <button
                onClick={saveEditMonitor}
                disabled={editSaving}
                className="inline-flex items-center rounded-full bg-ktsRed hover:bg-ktsLightRed disabled:opacity-60 disabled:cursor-not-allowed px-4 py-1.5 text-xs font-semibold text-white transition"
              >
                {editSaving ? "Mentés…" : "Mentés"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
