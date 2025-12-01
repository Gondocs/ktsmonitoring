import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import {
  FiRefreshCw,
  FiFileText,
  FiTrash2,
  FiSettings,
  FiEdit2,
  FiZap,
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
import {
  fetchSites,
  checkAllSites,
  checkOneSite,
  checkAllSitesLight,
  checkOneSiteLight,
  createSite,
  deleteSite,
  fetchSiteLogs,
  getMonitorInterval,
  setMonitorInterval,
  getLightMonitorInterval,
  setLightMonitorInterval,
  updateSite,
  deleteSiteLogs,
  getLogRetentionDays,
  setLogRetentionDays as apiSetLogRetentionDays,
  deleteAllLogs,
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
  const [refreshingLight, setRefreshingLight] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<number[]>([]);
  const [refreshingLightIds, setRefreshingLightIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");

  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isSorting, setIsSorting] = useState(false);

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
  const [lightIntervalMinutes, setLightIntervalMinutes] = useState<
    number | null
  >(null);
  const [lightIntervalSaving, setLightIntervalSaving] = useState(false);

  const [logRetentionDays, setLogRetentionDays] = useState<number | null>(15);
  const [logRetentionSaving, setLogRetentionSaving] = useState(false);

  const [editMonitor, setEditMonitor] = useState<Monitor | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  const [deletingAllLogs, setDeletingAllLogs] = useState(false);
  const [deletingSiteLogs, setDeletingSiteLogs] = useState(false);

  const [logViewTab, setLogViewTab] = useState<"table" | "chart">("table");

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

  const handleRefreshAllLight = async () => {
    setRefreshingLight(true);
    try {
      await checkAllSitesLight();
      await loadSites();
    } catch (err: any) {
      alert(
        err.message ||
          "Nem sikerült light ellenőrzést futtatni az összes weboldalra."
      );
    } finally {
      setRefreshingLight(false);
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

  const handleRefreshOneLight = async (id: number) => {
    setRefreshingLightIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    try {
      await checkOneSiteLight(id);
      await loadSites();
    } catch (err: any) {
      alert(
        err.message || "Nem sikerült light ellenőrzést futtatni a weboldalra."
      );
    } finally {
      setRefreshingLightIds((prev) => prev.filter((x) => x !== id));
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

  const handleDeleteSiteLogs = async () => {
    if (!logModalMonitor) return;
    if (
      !window.confirm(
        "Biztosan törölni szeretnéd az összes naplóbejegyzést ehhez a weboldalhoz?"
      )
    ) {
      return;
    }
    try {
      setDeletingSiteLogs(true);
      await deleteSiteLogs(logModalMonitor.id);
      await reloadLogs();
    } catch (err: any) {
      alert(err.message || "Nem sikerült törölni a naplókat.");
    } finally {
      setDeletingSiteLogs(false);
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
  const isRowRefreshingLight = (id: number) => refreshingLightIds.includes(id);

  const openSettings = async () => {
    setSettingsOpen(true);
    setIntervalLoading(true);
    try {
      const data = await getMonitorInterval();
      setIntervalMinutesState(data.interval_minutes ?? null);
      const light = await getLightMonitorInterval();
      setLightIntervalMinutes(light.interval_minutes ?? null);
      const retention = await getLogRetentionDays();
      setLogRetentionDays(retention.retention_days ?? 15);
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

  const saveLightInterval = async () => {
    if (lightIntervalMinutes == null || Number.isNaN(lightIntervalMinutes))
      return;
    setLightIntervalSaving(true);
    try {
      const data = await setLightMonitorInterval(lightIntervalMinutes);
      setLightIntervalMinutes(data.interval_minutes ?? lightIntervalMinutes);
      alert("Light intervallum sikeresen frissítve.");
    } catch (err: any) {
      alert(err.message || "Nem sikerült menteni a light intervallumot.");
    } finally {
      setLightIntervalSaving(false);
    }
  };

  const saveLogRetention = async () => {
    if (logRetentionDays == null || Number.isNaN(logRetentionDays)) return;
    setLogRetentionSaving(true);
    try {
      await apiSetLogRetentionDays(logRetentionDays);
      alert("Napló megőrzési idő sikeresen frissítve.");
    } catch (err: any) {
      alert(
        err.message || "Nem sikerült menteni a napló megőrzési beállítást."
      );
    } finally {
      setLogRetentionSaving(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (
      !window.confirm(
        "Biztosan törölni szeretnéd az ÖSSZES naplóbejegyzést MINDEN weboldalhoz? Ez a művelet nem vonható vissza."
      )
    ) {
      return;
    }
    try {
      setDeletingAllLogs(true);
      await deleteAllLogs();
      if (logModalMonitor) {
        await reloadLogs();
      }
      alert("Minden naplóbejegyzés törölve lett.");
    } catch (err: any) {
      alert(err.message || "Nem sikerült törölni az összes naplóbejegyzést.");
    } finally {
      setDeletingAllLogs(false);
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
                KTS Online Monitor
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

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* --- Fejléc és Globális Műveletek --- */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          {/* Cím és Leírás */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-50 tracking-tight">
              Monitorozott weboldalak
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Valós idejű állapot, SSL státusz és teljesítmény mutatók egy
              helyen.
            </p>
          </div>

          {/* Toolbar Konténer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-sm shadow-sm">
            {/* Bal oldal: Rendezés */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="relative group flex-1 sm:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setIsSorting(true);
                    setSortBy(e.target.value);
                    setTimeout(() => setIsSorting(false), 250);
                  }}
                  className="w-full sm:w-auto appearance-none bg-slate-950 text-slate-200 text-xs font-medium rounded-lg pl-3 pr-9 py-2 border border-slate-800 focus:ring-1 focus:ring-ktsRed focus:border-ktsRed focus:outline-none cursor-pointer hover:border-slate-700 transition"
                >
                  <option value="name">Név (A-Z)</option>
                  <option value="response_time">Válaszidő</option>
                  <option value="status">HTTP kód</option>
                  <option value="redirect">Átirányítás</option>
                  <option value="stability">Stabilitás</option>
                  <option value="last_checked">Utolsó ellenőrzés</option>
                </select>
                {/* Custom Chevron Icon */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500 group-hover:text-slate-300 transition-colors">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSorting(true);
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  setTimeout(() => setIsSorting(false), 250);
                }}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 hover:border-slate-700 transition flex items-center justify-center min-w-[40px]"
                title={sortDirection === "asc" ? "Növekvő" : "Csökkenő"}
              >
                <span className="text-[10px] leading-none">
                  {sortDirection === "asc" ? "▲" : "▼"}
                </span>
              </button>
            </div>

            {/* Elválasztó (csak desktopon) */}
            <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block"></div>

            {/* Jobb oldal: Globális Műveletek */}
            <div className="flex gap-2">
              <button
                onClick={handleRefreshAllLight}
                disabled={refreshingLight || loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white px-4 py-2 text-xs font-semibold text-slate-300 border border-slate-700/50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <FiZap
                  className={`h-3.5 w-3.5 ${
                    refreshingLight
                      ? "animate-pulse text-amber-400"
                      : "group-hover:text-amber-400 transition-colors"
                  }`}
                />
                <span>{refreshingLight ? "Folyamatban..." : "Light Mind"}</span>
              </button>

              <button
                onClick={handleRefreshAll}
                disabled={refreshing || loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-ktsRed hover:bg-ktsLightRed px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-ktsRed/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshing ? (
                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiRefreshCw className="h-3.5 w-3.5" />
                )}
                <span>{refreshing ? "Folyamatban..." : "Deep Mind"}</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ClipLoader color="#ef4444" size={50} />
            <p className="text-slate-500 text-sm animate-pulse">
              Adatok betöltése...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-950/20 border border-red-900/50 p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* --- Desktop Table View --- */}
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
                              rowRefreshing
                                ? "opacity-40 pointer-events-none"
                                : ""
                            }`}
                          >
                            {/* Név és URL */}
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

                            {/* Status Badge */}
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

                            {/* Válaszidő */}
                            <td className="px-4 py-4 text-right font-mono text-slate-300">
                              {m.last_response_time_ms
                                ? `${m.last_response_time_ms} ms`
                                : "—"}
                            </td>

                            {/* SSL & HSTS - JAVÍTVA */}
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-center gap-1.5">
                                <span
                                  className="font-mono text-[11px]"
                                  style={{
                                    color: sslColor(m.ssl_days_remaining),
                                  }}
                                >
                                  {m.ssl_days_remaining != null
                                    ? `${m.ssl_days_remaining} nap`
                                    : "—"}
                                </span>

                                {/* Itt a logika: ha nincs HSTS, csak egy halvány vonal vagy semmi */}
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

                            {/* Rendszer Info */}
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

                            {/* Stabilitás */}
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

                            {/* Utolsó ellenőrzés */}
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

                            {/* Műveletek - ÚJ DESIGN */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-3 opacity-90 group-hover:opacity-100 transition">
                                {/* Ellenőrzés Csoport (Light / Deep) */}
                                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shadow-sm">
                                  <button
                                    onClick={() => handleRefreshOneLight(m.id)}
                                    disabled={rowRefreshing}
                                    className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition disabled:opacity-50"
                                    title="Gyors (Light) ellenőrzés"
                                  >
                                    {/* Itt FiZap van az L helyett */}
                                    <FiZap className="h-4 w-4" />
                                  </button>
                                  <div className="w-px h-4 bg-slate-800"></div>
                                  <button
                                    onClick={() => handleRefreshOne(m.id)}
                                    disabled={rowRefreshing}
                                    className="p-2 text-slate-400 hover:text-ktsRed hover:bg-slate-800 transition disabled:opacity-50"
                                    title="Teljes (Deep) ellenőrzés"
                                  >
                                    <FiRefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Adminisztrációs gombok */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openLogsModal(m)}
                                    className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                                    title="Naplók"
                                  >
                                    <FiFileText className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => startEditMonitor(m)}
                                    className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                                    title="Szerkesztés"
                                  >
                                    <FiEdit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(m.id)}
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

            {/* --- Mobile Card View --- */}
            <div className="grid gap-4 md:hidden transition-opacity duration-200">
              {activeSites.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                  Nincs megjeleníthető adat.
                </div>
              ) : (
                activeSites.map((m) => {
                  const rowRefreshing =
                    isRowRefreshing(m.id) ||
                    isRowRefreshingLight(m.id) ||
                    refreshing ||
                    refreshingLight;
                  return (
                    <div
                      key={m.id}
                      className={`relative rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm space-y-4 transition-all duration-200 ${
                        rowRefreshing
                          ? "opacity-60 pointer-events-none"
                          : "hover:translate-y-0.5 hover:border-slate-700"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-50 truncate">
                            {m.name || m.url}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {m.url}
                          </p>
                        </div>
                        <span
                          className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border"
                          style={{
                            color: statusColor(m),
                            backgroundColor: `${statusColor(m)}10`,
                            borderColor: `${statusColor(m)}20`,
                          }}
                        >
                          HTTP {m.last_status ?? "-"}
                        </span>
                      </div>

                      {/* Grid Stats */}
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        {/* Válaszidő */}
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800/50">
                          <span className="block text-slate-500 mb-0.5">
                            Válasz
                          </span>
                          <span className="font-mono text-slate-200">
                            {m.last_response_time_ms
                              ? `${m.last_response_time_ms}ms`
                              : "-"}
                          </span>
                        </div>

                        {/* SSL / HSTS - Javítva */}
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800/50 flex flex-col justify-between">
                          <span className="block text-slate-500 mb-0.5">
                            SSL
                          </span>
                          <div className="flex flex-col items-start gap-1">
                            <span
                              style={{ color: sslColor(m.ssl_days_remaining) }}
                            >
                              {m.ssl_days_remaining ?? "-"} nap
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
                        </div>

                        {/* Stabilitás */}
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800/50">
                          <span className="block text-slate-500 mb-0.5">
                            Stab.
                          </span>
                          <span
                            className={
                              m.stability_score && m.stability_score > 90
                                ? "text-green-400"
                                : "text-yellow-400"
                            }
                          >
                            {m.stability_score ? `${m.stability_score}%` : "-"}
                          </span>
                        </div>
                      </div>

                      {/* Action Footer - ÚJ DESIGN */}
                      <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-2">
                        <div className="text-[10px] text-slate-500">
                          {m.last_checked_at
                            ? new Date(m.last_checked_at).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "-"}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Ellenőrzés Csoport */}
                          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shadow-sm">
                            <button
                              onClick={() => handleRefreshOneLight(m.id)}
                              className="p-1.5 px-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                              title="Light"
                            >
                              <FiZap className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-800"></div>
                            <button
                              onClick={() => handleRefreshOne(m.id)}
                              className="p-1.5 px-2.5 text-slate-400 hover:text-ktsRed hover:bg-slate-800 transition"
                              title="Deep"
                            >
                              <FiRefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Egyéb műveletek */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => openLogsModal(m)}
                              className="p-1.5 text-slate-400 bg-slate-900 rounded border border-slate-800 hover:text-slate-200 transition"
                            >
                              <FiFileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => startEditMonitor(m)}
                              className="p-1.5 text-slate-400 bg-slate-900 rounded border border-slate-800 hover:text-slate-200 transition"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1.5 text-slate-400 bg-slate-900 rounded border border-slate-800 hover:text-red-500 transition"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* --- Inaktív Weboldalak --- */}
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
                        <p className="text-xs text-slate-500 truncate">
                          {m.url}
                        </p>
                      </div>
                      <button
                        onClick={() => startEditMonitor(m)}
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
        )}

        {/* --- Új Hozzáadása Section --- */}
        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl relative overflow-hidden group">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-ktsRed/5 rounded-full blur-3xl pointer-events-none group-hover:bg-ktsRed/10 transition duration-700"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-semibold text-slate-50">
                Új monitor hozzáadása
              </h3>
              <p className="text-sm text-slate-400">
                Add meg az URL-t a megfigyelés megkezdéséhez.
              </p>
            </div>

            <form
              onSubmit={handleAdd}
              className="w-full md:w-auto flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                placeholder="https://pelda.hu"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                required
                className="w-full sm:w-64 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-ktsRed focus:ring-1 focus:ring-ktsRed focus:outline-none transition shadow-inner"
              />
              <input
                type="text"
                placeholder="Név (opcionális)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full sm:w-48 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-ktsRed focus:ring-1 focus:ring-ktsRed focus:outline-none transition shadow-inner"
              />
              <button
                type="submit"
                className="w-full sm:w-auto whitespace-nowrap rounded-lg bg-ktsRed hover:bg-ktsLightRed px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ktsRed/20 transition active:scale-95"
              >
                Hozzáadás
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Logs modal */}
      {logModalMonitor && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLogModalMonitor(null)}
        >
          <div
            className="flex flex-col w-full max-w-5xl h-[85vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* --- Fejléc --- */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
              <div className="overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-50 truncate">
                  Napló: {logModalMonitor.name || "Névtelen monitor"}
                </h3>
                <p className="text-xs text-slate-400 truncate font-mono mt-0.5 opacity-80">
                  {logModalMonitor.url}
                </p>
              </div>
              <button
                onClick={() => setLogModalMonitor(null)}
                className="flex-shrink-0 rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition ml-4"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* --- Eszköztár --- */}
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-6 py-3">
              {/* Bal oldal: Szűrők és Frissítés */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5">
                  <span className="text-xs text-slate-400">Sorok:</span>
                  <input
                    type="number"
                    value={logsLimit}
                    min={10}
                    max={1000}
                    onChange={(e) => setLogsLimit(Number(e.target.value) || 10)}
                    className="w-12 bg-transparent text-xs font-semibold text-slate-100 focus:outline-none text-center"
                  />
                </div>

                <button
                  onClick={reloadLogs}
                  disabled={logsLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition"
                >
                  <svg
                    className={`h-3.5 w-3.5 ${
                      logsLoading ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {logsLoading ? "Betöltés..." : "Frissítés"}
                </button>

                {/* Nézet váltó: Táblázat / Grafikon */}
                <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-1 py-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLogViewTab("table")}
                    className={`px-2 py-1 rounded-md transition ${
                      logViewTab === "table"
                        ? "bg-slate-800 text-slate-100"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Táblázat
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogViewTab("chart")}
                    className={`px-2 py-1 rounded-md transition ${
                      logViewTab === "chart"
                        ? "bg-slate-800 text-slate-100"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Grafikon
                  </button>
                </div>
              </div>

              {/* Jobb oldal: Veszélyes művelet */}
              <button
                onClick={handleDeleteSiteLogs}
                disabled={deletingSiteLogs}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50 transition"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {deletingSiteLogs ? "Törlés folyamatban..." : "Napló ürítése"}
              </button>
            </div>

            {/* --- Tartalom: Táblázat vagy Grafikon --- */}
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
                      Válaszidő alakulása (ms) az utolsó {logs.length} mérés alapján.
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
                            // X tengelyre egy olvasható idő string
                            // + 1 óra hozzáadása a téli idő miatt
                            timeLabel: new Date(
                              (new Date(l.checked_at || l.created_at)).getTime() + 3600000
                            ).toLocaleTimeString("hu-HU", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }),
                            // Szín kategória a válaszidő alapján
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
                          stroke="#e5e7eb"
                          strokeWidth={2}
                          dot={{
                            r: 3,
                            strokeWidth: 0,
                            fill: "#e5e7eb",
                          }}
                          activeDot={{ r: 5 }}
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
                      const isError =
                        !log.status_code || log.status_code >= 400;
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
                                <span className="text-slate-600 ml-0.5">
                                  ms
                                </span>
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

            {/* Opcionális: Lábléc info (pl. összes találat) */}
            <div className="border-t border-slate-800 bg-slate-900/30 px-6 py-2 text-[10px] text-slate-500 text-right">
              Megjelenítve: {logs.length} bejegyzés
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* --- Fejléc --- */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-50">
                  Beállítások
                </h3>
                <p className="text-xs text-slate-400">
                  Monitorozás és adatkezelés konfigurálása.
                </p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-8">
              {intervalLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 space-y-3">
                  <span className="h-8 w-8 border-2 border-slate-700 border-t-ktsRed rounded-full animate-spin" />
                  <span className="text-sm">Beállítások betöltése...</span>
                </div>
              ) : (
                <>
                  {/* --- Monitorozás Szekció --- */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Monitorozási intervallumok
                    </h4>

                    {/* Deep Check */}
                    <div className="flex items-end gap-3">
                      <label className="flex-1 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-200">
                            Deep ellenőrzés (perc)
                          </span>
                        </div>
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
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-ktsRed focus:ring-1 focus:ring-ktsRed focus:outline-none"
                          placeholder="pl. 60"
                        />
                        <p className="text-[11px] text-slate-500">
                          Részletes ellenőrzés (SSL, tartalom, stabilitás).
                        </p>
                      </label>
                      <button
                        onClick={saveInterval}
                        disabled={intervalSaving || intervalMinutes == null}
                        className="mb-6 inline-flex h-9 items-center rounded-lg bg-slate-800 px-4 text-xs font-medium text-white hover:bg-ktsRed disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {intervalSaving ? "..." : "Mentés"}
                      </button>
                    </div>

                    {/* Light Check */}
                    <div className="flex items-end gap-3">
                      <label className="flex-1 space-y-1.5">
                        <span className="text-sm font-medium text-slate-200">
                          Light / Heartbeat (perc)
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={10080}
                          value={lightIntervalMinutes ?? ""}
                          onChange={(e) =>
                            setLightIntervalMinutes(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-ktsRed focus:ring-1 focus:ring-ktsRed focus:outline-none"
                          placeholder="pl. 5"
                        />
                        <p className="text-[11px] text-slate-500">
                          Gyors státusz és válaszidő ellenőrzés.
                        </p>
                      </label>
                      <button
                        onClick={saveLightInterval}
                        disabled={
                          lightIntervalSaving || lightIntervalMinutes == null
                        }
                        className="mb-6 inline-flex h-9 items-center rounded-lg bg-slate-800 px-4 text-xs font-medium text-white hover:bg-ktsRed disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {lightIntervalSaving ? "..." : "Mentés"}
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-800" />

                  {/* --- Adatkezelés Szekció --- */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Adatkezelés
                    </h4>

                    {/* Log Retention */}
                    <div className="flex items-end gap-3">
                      <label className="flex-1 space-y-1.5">
                        <span className="text-sm font-medium text-slate-200">
                          Napló megőrzés (nap)
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={logRetentionDays ?? ""}
                          onChange={(e) =>
                            setLogRetentionDays(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-ktsRed focus:ring-1 focus:ring-ktsRed focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-500">
                          A régebbi bejegyzések automatikusan törlődnek.
                        </p>
                      </label>
                      <button
                        onClick={saveLogRetention}
                        disabled={
                          logRetentionSaving || logRetentionDays == null
                        }
                        className="mb-6 inline-flex h-9 items-center rounded-lg bg-slate-800 px-4 text-xs font-medium text-white hover:bg-ktsRed disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {logRetentionSaving ? "..." : "Mentés"}
                      </button>
                    </div>
                  </div>

                  {/* --- Danger Zone --- */}
                  <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-red-400">
                          Veszélyes Zóna
                        </h4>
                        <p className="text-xs text-red-300/60 leading-relaxed">
                          Minden naplóbejegyzés azonnali törlése az
                          adatbázisból.
                          <br />
                          Ez a művelet nem visszavonható.
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteAllLogs}
                        disabled={deletingAllLogs}
                        className="whitespace-nowrap rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500 hover:text-white hover:border-transparent disabled:opacity-50 transition"
                      >
                        {deletingAllLogs ? "Törlés..." : "Összes törlése"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {editMonitor && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setEditMonitor(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* --- Fejléc --- */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-50">
                  Monitor szerkesztése
                </h3>
                <p className="text-xs text-slate-400">
                  A kiválasztott végpont paramétereinek módosítása.
                </p>
              </div>
              <button
                onClick={() => setEditMonitor(null)}
                className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* --- Tartalom --- */}
            <div className="p-6 space-y-6">
              {/* URL Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Célpont URL
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://pelda.hu"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-ktsRed focus:ring-1 focus:ring-ktsRed focus:outline-none transition"
                />
              </div>

              {/* Név Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Megjelenített név{" "}
                  <span className="text-slate-600 font-normal normal-case">
                    (opcionális)
                  </span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="pl. Ügyfél Portál"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-ktsRed focus:ring-1 focus:ring-ktsRed focus:outline-none transition"
                />
              </div>

              {/* Aktív Státusz Toggle */}
              <div
                onClick={() => setEditIsActive(!editIsActive)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900/80 transition"
              >
                <div className="space-y-0.5">
                  <span className="block text-sm font-medium text-slate-200">
                    Aktív monitorozás
                  </span>
                  <span className="block text-xs text-slate-500">
                    Ha kikapcsolod, a rendszer nem ellenőrzi ezt az oldalt.
                  </span>
                </div>

                {/* Custom Toggle Switch UI */}
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors duration-200 ease-in-out ${
                    editIsActive ? "bg-ktsRed" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-1 ml-1 ${
                      editIsActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* --- Lábléc / Gombok --- */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/30 px-6 py-4">
              <button
                onClick={() => setEditMonitor(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                Mégse
              </button>
              <button
                onClick={saveEditMonitor}
                disabled={editSaving}
                className="inline-flex items-center rounded-lg bg-ktsRed px-5 py-2 text-sm font-medium text-white hover:bg-ktsLightRed disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-ktsRed/20"
              >
                {editSaving ? (
                  <>
                    <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Mentés...
                  </>
                ) : (
                  "Változások mentése"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
