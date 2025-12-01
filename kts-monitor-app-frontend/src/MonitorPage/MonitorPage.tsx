// src/MonitorPage/MonitorPage.tsx
import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
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
} from "../Api/api.ts";
import { useAuth } from "../Auth/auth.tsx";
import { Monitor, MonitorLog } from "./MonitorTypes.ts";
import { MonitorHeader } from "./MonitorHeader.tsx";
import { MonitorListSection } from "./MonitorListSection.tsx";
import { AddMonitorSection } from "./AddMonitorSection.tsx";
import { LogsModal } from "./LogsModal.tsx";
import { SettingsModal } from "./SettingsModal.tsx";
import { EditMonitorModal } from "./EditMonitorModal.tsx";

export const MonitorPage: React.FC = () => {
  const { user, logout } = useAuth();

  // ---- Core data state ----
  const [sites, setSites] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingLight, setRefreshingLight] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<number[]>([]);
  const [refreshingLightIds, setRefreshingLightIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ---- New monitor form ----
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");

  // ---- Sorting ----
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isSorting, setIsSorting] = useState(false);

  // ---- Logs modal ----
  const [logModalMonitor, setLogModalMonitor] = useState<Monitor | null>(null);
  const [logs, setLogs] = useState<MonitorLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLimit, setLogsLimit] = useState(50);
  const [logViewTab, setLogViewTab] = useState<"table" | "chart">("table");
  const [deletingSiteLogs, setDeletingSiteLogs] = useState(false);

  // ---- Settings modal ----
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [intervalMinutes, setIntervalMinutesState] = useState<number | null>(null);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalSaving, setIntervalSaving] = useState(false);
  const [lightIntervalMinutes, setLightIntervalMinutes] = useState<number | null>(null);
  const [lightIntervalSaving, setLightIntervalSaving] = useState(false);
  const [logRetentionDays, setLogRetentionDays] = useState<number | null>(15);
  const [logRetentionSaving, setLogRetentionSaving] = useState(false);
  const [deletingAllLogs, setDeletingAllLogs] = useState(false);

  // ---- Edit monitor modal ----
  const [editMonitor, setEditMonitor] = useState<Monitor | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  // ---- Load sites ----
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

  // ---- Helpers ----
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

  // ---- Global refresh ----
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

  // ---- Row refresh ----
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

  // ---- Add monitor ----
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    try {
      let normalizedUrl = newUrl.trim();
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

  // ---- Delete monitor ----
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

  // ---- Logs modal logic ----
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

  // ---- Settings modal logic ----
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
    if (lightIntervalMinutes == null || Number.isNaN(lightIntervalMinutes)) return;
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

  // ---- Edit monitor logic ----
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

  // ---- Derived lists & sorting ----
  let activeSites = sites.filter((s) => s.is_active);

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

  // ---- Render ----
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <MonitorHeader
        user={user}
        logout={logout}
        sortBy={sortBy}
        setSortBy={(value) => {
          setIsSorting(true);
          setSortBy(value);
          setTimeout(() => setIsSorting(false), 250);
        }}
        sortDirection={sortDirection}
        toggleSortDirection={() => {
          setIsSorting(true);
          setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
          setTimeout(() => setIsSorting(false), 250);
        }}
        isSorting={isSorting}
        refreshing={refreshing}
        refreshingLight={refreshingLight}
        loading={loading}
        onRefreshAll={handleRefreshAll}
        onRefreshAllLight={handleRefreshAllLight}
        openSettings={openSettings}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
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
            <MonitorListSection
              activeSites={activeSites}
              inactiveSites={inactiveSites}
              isSorting={isSorting}
              refreshing={refreshing}
              refreshingLight={refreshingLight}
              statusColor={statusColor}
              sslColor={sslColor}
              isRowRefreshing={isRowRefreshing}
              isRowRefreshingLight={isRowRefreshingLight}
              onRefreshOne={handleRefreshOne}
              onRefreshOneLight={handleRefreshOneLight}
              onOpenLogs={openLogsModal}
              onStartEdit={startEditMonitor}
              onDelete={handleDelete}
            />

            <AddMonitorSection
              newUrl={newUrl}
              newName={newName}
              setNewUrl={setNewUrl}
              setNewName={setNewName}
              onAdd={handleAdd}
            />
          </>
        )}
      </main>

      {/* Modals */}
      {logModalMonitor && (
        <LogsModal
          monitor={logModalMonitor}
          logs={logs}
          logsLoading={logsLoading}
          logsLimit={logsLimit}
          setLogsLimit={setLogsLimit}
          logViewTab={logViewTab}
          setLogViewTab={setLogViewTab}
          onClose={() => setLogModalMonitor(null)}
          reloadLogs={reloadLogs}
          deletingSiteLogs={deletingSiteLogs}
          handleDeleteSiteLogs={handleDeleteSiteLogs}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          intervalLoading={intervalLoading}
          intervalMinutes={intervalMinutes}
          setIntervalMinutes={setIntervalMinutesState}
          intervalSaving={intervalSaving}
          saveInterval={saveInterval}
          lightIntervalMinutes={lightIntervalMinutes}
          setLightIntervalMinutes={setLightIntervalMinutes}
          lightIntervalSaving={lightIntervalSaving}
          saveLightInterval={saveLightInterval}
          logRetentionDays={logRetentionDays}
          setLogRetentionDays={setLogRetentionDays}
          logRetentionSaving={logRetentionSaving}
          saveLogRetention={saveLogRetention}
          deletingAllLogs={deletingAllLogs}
          handleDeleteAllLogs={handleDeleteAllLogs}
        />
      )}

      {editMonitor && (
        <EditMonitorModal
          monitor={editMonitor}
          editUrl={editUrl}
          setEditUrl={setEditUrl}
          editName={editName}
          setEditName={setEditName}
          editIsActive={editIsActive}
          setEditIsActive={setEditIsActive}
          editSaving={editSaving}
          onClose={() => setEditMonitor(null)}
          onSave={saveEditMonitor}
        />
      )}
    </div>
  );
};
