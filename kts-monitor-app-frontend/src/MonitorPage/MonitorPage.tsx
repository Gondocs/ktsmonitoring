import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiTrash2,
  FiUpload,
  FiMaximize2,
  FiX,
  FiZap,
} from "react-icons/fi";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  getAlertEmailSettings,
  setAlertEmailSettings,
  sendAlertTestEmail as apiSendAlertTestEmail,
  updateSite,
  deleteSiteLogs,
  getLogRetentionDays,
  setLogRetentionDays as apiSetLogRetentionDays,
  deleteAllLogs,
} from "../Api/api.ts";
import { useAuth } from "../Auth/auth.tsx";
import { Monitor, MonitorLog } from "./MonitorTypes.ts";
import { LogsModal } from "./LogsModal.tsx";
import { SettingsModal } from "./SettingsModal.tsx";
import { EditMonitorModal } from "./EditMonitorModal.tsx";
import { ActivityHeatmap, HeatmapRange } from "./ActivityHeatmap.tsx";
import {
  ChartRange,
  formatDateTimeHu,
  formatRelativeTimeHu,
  getRangeStartDate,
  parseMonitorDate,
} from "./timeUtils.ts";

type MainView = "monitorok" | "globalisNaplok";
type GlobalLogsTab = "all" | "outages";

type GlobalLogEntry = MonitorLog & {
  monitor_name: string;
  monitor_url: string;
};

type ImportResultRow = {
  lineNumber: number;
  url: string;
  name: string;
  status: "success" | "error";
  message: string;
};

const getGlobalLogKey = (log: Pick<GlobalLogEntry, "monitor_id" | "id">) =>
  `${log.monitor_id}-${log.id}`;

type MonitorListFilter = "all" | "active" | "offline";
type ExpandedPanel =
  | "detailResponse"
  | "detailHeatmap"
  | "globalTrend"
  | "globalHeatmap"
  | null;

const BRAND_BLUE = "#073a59";
const BRAND_RED = "#af272f";

const responseChartRangeOptions: { value: ChartRange; label: string }[] = [
  { value: "1h", label: "1 óra" },
  { value: "4h", label: "4 óra" },
  { value: "12h", label: "12 óra" },
  { value: "24h", label: "24 óra" },
  { value: "48h", label: "48 óra" },
  { value: "7d", label: "7 nap" },
  { value: "14d", label: "14 nap" },
];

const globalChartRangeOptions: { value: ChartRange; label: string }[] = [
  { value: "24h", label: "24 óra" },
  { value: "48h", label: "48 óra" },
  { value: "7d", label: "7 nap" },
  { value: "14d", label: "14 nap" },
];

const heatmapRangeOptions: { value: HeatmapRange; label: string }[] = [
  { value: "6h", label: "6 óra" },
  { value: "12h", label: "12 óra" },
  { value: "24h", label: "24 óra" },
  { value: "48h", label: "48 óra" },
  { value: "7d", label: "7 nap" },
  { value: "14d", label: "14 nap" },
];

const safeHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const isStatusUp = (status: number | null | undefined) =>
  status != null && status > 0 && status < 400;

const isOutageStatus = (status: number | null | undefined) =>
  status == null || status <= 0 || status >= 400;

const getStatusColor = (m: Monitor) => {
  if (isStatusUp(m.last_status)) {
    if ((m.last_response_time_ms ?? 0) > 5000) return "#f59e0b";
    if ((m.stability_score ?? 100) < 67) return "#f59e0b";
    return "#16a34a";
  }
  return BRAND_RED;
};

const getSslColor = (days: number | null) => {
  if (days == null) return "#64748b";
  if (days < 3) return BRAND_RED;
  if (days < 14) return "#f59e0b";
  return "#16a34a";
};

const formatResponseTick = (timestamp: number, range: ChartRange) => {
  const date = new Date(timestamp);
  const shortRange = ["1h", "4h", "12h", "24h", "48h"].includes(range);

  if (shortRange) {
    return date.toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString("hu-HU", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildMonitorResponseChart = (logs: MonitorLog[], range: ChartRange) => {
  const start = getRangeStartDate(range).getTime();

  const points = [...logs]
    .filter((l) => l.response_time_ms != null)
    .map((l) => {
      const date = parseMonitorDate(l.checked_at || l.created_at);
      return {
        timestamp: date?.getTime() ?? 0,
        tooltipLabel: date
          ? date.toLocaleString("hu-HU", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "-",
        valaszido: l.response_time_ms,
      };
    })
    .filter((x) => x.timestamp >= start)
    .sort((a, b) => a.timestamp - b.timestamp);

  const used = new Set<number>();
  return points.map((p) => {
    let ts = p.timestamp;
    while (used.has(ts)) {
      ts += 1;
    }
    used.add(ts);
    return {
      ...p,
      timestamp: ts,
    };
  });
};

const buildGlobalOutageChart = (logs: GlobalLogEntry[], range: ChartRange) => {
  const startDate = getRangeStartDate(range);
  startDate.setHours(0, 0, 0, 0);

  const now = new Date();
  const map = new Map<
    string,
    { datum: string; kimaradas: number; figyelmeztetes: number }
  >();

  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, {
      datum: d.toLocaleDateString("hu-HU", {
        month: "2-digit",
        day: "2-digit",
      }),
      kimaradas: 0,
      figyelmeztetes: 0,
    });
  }

  logs.forEach((log) => {
    const date = parseMonitorDate(log.checked_at || log.created_at);
    if (!date || date < startDate) return;

    const key = new Date(date).toISOString().slice(0, 10);
    const day = map.get(key);
    if (!day) return;

    if (!log.status_code || log.status_code >= 500) {
      day.kimaradas += 1;
      return;
    }

    if (log.status_code >= 400 || (log.response_time_ms ?? 0) > 2500) {
      day.figyelmeztetes += 1;
    }
  });

  return Array.from(map.values());
};

export const MonitorPage: React.FC = () => {
  const { user, logout } = useAuth();
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const [mainView, setMainView] = useState<MainView>("monitorok");

  const [sites, setSites] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingLight, setRefreshingLight] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<number[]>([]);
  const [refreshingLightIds, setRefreshingLightIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [addMonitorOpen, setAddMonitorOpen] = useState(false);

  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isSorting, setIsSorting] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [monitorListFilter, setMonitorListFilter] =
    useState<MonitorListFilter>("all");
  const [selectedMonitorId, setSelectedMonitorId] = useState<number | null>(
    null,
  );
  const [detailChartRange, setDetailChartRange] = useState<ChartRange>("7d");
  const [detailHeatmapRange, setDetailHeatmapRange] =
    useState<HeatmapRange>("24h");

  const [selectedMonitorLogs, setSelectedMonitorLogs] = useState<MonitorLog[]>(
    [],
  );
  const [selectedMonitorLogsLoading, setSelectedMonitorLogsLoading] =
    useState(false);

  const [globalLogs, setGlobalLogs] = useState<GlobalLogEntry[]>([]);
  const [globalLogsLoading, setGlobalLogsLoading] = useState(false);
  const [globalLogsError, setGlobalLogsError] = useState<string | null>(null);
  const [globalLogsTab, setGlobalLogsTab] = useState<GlobalLogsTab>("all");
  const [outagesDays, setOutagesDays] = useState<number>(7);
  const [globalLogsScope, setGlobalLogsScope] = useState<string>("all");
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalChartRange, setGlobalChartRange] = useState<ChartRange>("7d");
  const [globalHeatmapRange, setGlobalHeatmapRange] =
    useState<HeatmapRange>("24h");
  const [selectedGlobalLogKey, setSelectedGlobalLogKey] = useState<
    string | null
  >(null);
  const [selectedDetailHeatmapLog, setSelectedDetailHeatmapLog] =
    useState<MonitorLog | null>(null);
  const [selectedGlobalHeatmapLog, setSelectedGlobalHeatmapLog] =
    useState<GlobalLogEntry | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);

  const [logModalMonitor, setLogModalMonitor] = useState<Monitor | null>(null);
  const [logs, setLogs] = useState<MonitorLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLimit, setLogsLimit] = useState(80);
  const [logViewTab, setLogViewTab] = useState<"table" | "chart">("table");
  const [deletingSiteLogs, setDeletingSiteLogs] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [intervalMinutes, setIntervalMinutesState] = useState<number | null>(
    null,
  );
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalSaving, setIntervalSaving] = useState(false);
  const [lightIntervalMinutes, setLightIntervalMinutes] = useState<
    number | null
  >(null);
  const [lightIntervalSaving, setLightIntervalSaving] = useState(false);
  const [logRetentionDays, setLogRetentionDays] = useState<number | null>(15);
  const [logRetentionSaving, setLogRetentionSaving] = useState(false);
  const [alertRecipientEmail, setAlertRecipientEmail] = useState(
    "gondocs.robert@gmail.com",
  );
  const [alertEmailSaving, setAlertEmailSaving] = useState(false);
  const [alertTestSending, setAlertTestSending] = useState(false);
  const [deletingAllLogs, setDeletingAllLogs] = useState(false);

  const [editMonitor, setEditMonitor] = useState<Monitor | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [importingSites, setImportingSites] = useState(false);
  const [lastImportFileName, setLastImportFileName] = useState<string | null>(
    null,
  );
  const [lastImportSummary, setLastImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);
  const [lastImportRows, setLastImportRows] = useState<ImportResultRow[]>([]);

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

  const refreshSelectedMonitorLogs = useCallback(async () => {
    if (selectedMonitorId == null) return;
    try {
      const data = await fetchSiteLogs(selectedMonitorId, 400);
      setSelectedMonitorLogs(data);
    } catch {
      // keep current chart data if refresh fails
    }
  }, [selectedMonitorId]);

  const filteredSites = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) return sites;

    return sites.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const url = (s.url || "").toLowerCase();
      return name.includes(search) || url.includes(search);
    });
  }, [sites, searchValue]);

  const kpiFilteredSites = useMemo(() => {
    if (monitorListFilter === "active") {
      return filteredSites.filter((s) => s.is_active);
    }

    if (monitorListFilter === "offline") {
      return filteredSites.filter((s) => isOutageStatus(s.last_status));
    }

    return filteredSites;
  }, [filteredSites, monitorListFilter]);

  const sortedSites = useMemo(() => {
    return [...kpiFilteredSites].sort((a, b) => {
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
          v1 = parseMonitorDate(a.last_checked_at)?.getTime() ?? 0;
          v2 = parseMonitorDate(b.last_checked_at)?.getTime() ?? 0;
          break;
        default:
          v1 = "";
          v2 = "";
      }

      if (v1 < v2) return sortDirection === "asc" ? -1 : 1;
      if (v1 > v2) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [kpiFilteredSites, sortBy, sortDirection]);

  const selectedMonitor =
    sites.find((s) => s.id === selectedMonitorId) ?? sortedSites[0] ?? null;

  useEffect(() => {
    if (sites.length === 0) {
      setSelectedMonitorId(null);
      setSelectedDetailHeatmapLog(null);
      return;
    }

    const hasSelected = sites.some((s) => s.id === selectedMonitorId);
    if (!hasSelected) {
      setSelectedMonitorId(sites[0].id);
    }
  }, [sites, selectedMonitorId]);

  useEffect(() => {
    setSelectedDetailHeatmapLog(null);
  }, [selectedMonitorId]);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedLogs = async () => {
      if (selectedMonitorId == null) {
        setSelectedMonitorLogs([]);
        return;
      }

      setSelectedMonitorLogsLoading(true);
      try {
        const data = await fetchSiteLogs(selectedMonitorId, 400);
        if (!cancelled) {
          setSelectedMonitorLogs(data);
        }
      } catch {
        if (!cancelled) {
          setSelectedMonitorLogs([]);
        }
      } finally {
        if (!cancelled) {
          setSelectedMonitorLogsLoading(false);
        }
      }
    };

    loadSelectedLogs();
    return () => {
      cancelled = true;
    };
  }, [selectedMonitorId]);

  const loadGlobalLogs = useCallback(
    async (scope: string = globalLogsScope) => {
      setGlobalLogsLoading(true);
      setGlobalLogsError(null);

      try {
        let monitorsToQuery: Monitor[] = [];
        if (scope === "all") {
          monitorsToQuery = [...sites].sort((a, b) => {
            const at = parseMonitorDate(a.last_checked_at)?.getTime() ?? 0;
            const bt = parseMonitorDate(b.last_checked_at)?.getTime() ?? 0;
            return bt - at;
          });
        } else {
          const found = sites.find((s) => String(s.id) === scope);
          monitorsToQuery = found ? [found] : [];
        }

        if (monitorsToQuery.length === 0) {
          setGlobalLogs([]);
          setGlobalLogsLoading(false);
          return;
        }

        const settled = await Promise.allSettled(
          monitorsToQuery.map(async (monitor) => {
            const entries = await fetchSiteLogs(monitor.id, 120);
            return entries.map((entry: MonitorLog) => ({
              ...entry,
              monitor_name: monitor.name || safeHost(monitor.url),
              monitor_url: monitor.url,
            }));
          }),
        );

        const merged: GlobalLogEntry[] = [];
        settled.forEach((res) => {
          if (res.status === "fulfilled") {
            merged.push(...res.value);
          }
        });

        merged.sort((a, b) => {
          const at =
            parseMonitorDate(a.checked_at || a.created_at)?.getTime() ?? 0;
          const bt =
            parseMonitorDate(b.checked_at || b.created_at)?.getTime() ?? 0;
          return bt - at;
        });

        setGlobalLogs(merged);

        const failedCount = settled.filter(
          (r) => r.status === "rejected",
        ).length;
        if (failedCount > 0) {
          setGlobalLogsError(
            `${failedCount} monitor naplója nem volt elérhető, a többi adat betöltve.`,
          );
        }
      } catch (err: any) {
        setGlobalLogsError(
          err.message || "Nem sikerült betölteni a globális naplókat.",
        );
      } finally {
        setGlobalLogsLoading(false);
      }
    },
    [globalLogsScope, sites],
  );

  useEffect(() => {
    if (mainView === "globalisNaplok") {
      loadGlobalLogs(globalLogsScope);
    }
  }, [mainView, globalLogsScope, loadGlobalLogs]);

  useEffect(() => {
    setSelectedGlobalLogKey(null);
  }, [globalLogsScope, globalSearch]);

  useEffect(() => {
    setSelectedGlobalHeatmapLog(null);
  }, [globalLogsScope, globalSearch, globalLogsTab, outagesDays]);

  const globalFilteredLogs = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    if (!search) return globalLogs;

    return globalLogs.filter((log) => {
      return (
        log.monitor_name.toLowerCase().includes(search) ||
        log.monitor_url.toLowerCase().includes(search) ||
        (log.error_message || "").toLowerCase().includes(search)
      );
    });
  }, [globalLogs, globalSearch]);

  const selectedGlobalLog = useMemo(
    () =>
      selectedGlobalLogKey
        ? globalFilteredLogs.find(
            (log) => getGlobalLogKey(log) === selectedGlobalLogKey,
          )
        : null,
    [globalFilteredLogs, selectedGlobalLogKey],
  );

  const globalLogsForTable = useMemo(() => {
    if (!selectedGlobalLogKey) return globalFilteredLogs;
    return globalFilteredLogs.filter(
      (log) => getGlobalLogKey(log) === selectedGlobalLogKey,
    );
  }, [globalFilteredLogs, selectedGlobalLogKey]);

  const outageLogsForTable = useMemo(() => {
    const fromTs = Date.now() - outagesDays * 24 * 60 * 60 * 1000;

    return globalFilteredLogs.filter((log) => {
      const ts = parseMonitorDate(log.checked_at || log.created_at)?.getTime();
      if (!ts || ts < fromTs) {
        return false;
      }

      return isOutageStatus(log.status_code);
    });
  }, [globalFilteredLogs, outagesDays]);

  const detailResponseChartData = useMemo(
    () => buildMonitorResponseChart(selectedMonitorLogs, detailChartRange),
    [selectedMonitorLogs, detailChartRange],
  );

  const globalOutageChartData = useMemo(
    () => buildGlobalOutageChart(globalFilteredLogs, globalChartRange),
    [globalFilteredLogs, globalChartRange],
  );

  const stats = useMemo(() => {
    const total = sites.length;
    const active = sites.filter((s) => s.is_active).length;
    const offline = sites.filter((s) => isOutageStatus(s.last_status)).length;
    const criticalSsl = sites.filter(
      (s) => s.ssl_days_remaining != null && s.ssl_days_remaining <= 7,
    ).length;
    const responseTimes = sites
      .map((s) => s.last_response_time_ms)
      .filter((v): v is number => v != null);
    const avgResponse = responseTimes.length
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        )
      : null;

    return { total, active, offline, criticalSsl, avgResponse };
  }, [sites]);

  const isRowRefreshing = (id: number) => refreshingIds.includes(id);
  const isRowRefreshingLight = (id: number) => refreshingLightIds.includes(id);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await checkAllSites();
      await loadSites();
      await refreshSelectedMonitorLogs();
      if (mainView === "globalisNaplok") {
        await loadGlobalLogs(globalLogsScope);
      }
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
      await refreshSelectedMonitorLogs();
      if (mainView === "globalisNaplok") {
        await loadGlobalLogs(globalLogsScope);
      }
    } catch (err: any) {
      alert(
        err.message ||
          "Nem sikerült gyors ellenőrzést futtatni az összes weboldalra.",
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
      if (selectedMonitorId === id) {
        await refreshSelectedMonitorLogs();
      }
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
      if (selectedMonitorId === id) {
        await refreshSelectedMonitorLogs();
      }
    } catch (err: any) {
      alert(
        err.message || "Nem sikerült gyors ellenőrzést futtatni a weboldalra.",
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
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      await createSite({ url: normalizedUrl, name: newName || undefined });
      setNewUrl("");
      setNewName("");
      setAddMonitorOpen(false);
      await loadSites();
    } catch (err: any) {
      alert(err.message || "Nem sikerült hozzáadni a weboldalt.");
    }
  };

  const triggerImportFilePicker = () => {
    if (importingSites) return;
    importFileInputRef.current?.click();
  };

  const handleImportSitesFromFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLastImportFileName(file.name);
    setLastImportSummary(null);
    setLastImportRows([]);
    setImportingSites(true);

    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (rows.length === 0) {
        setLastImportSummary({ total: 0, success: 0, failed: 0 });
        setLastImportRows([
          {
            lineNumber: 0,
            url: "",
            name: "",
            status: "error",
            message: "A fájl üres.",
          },
        ]);
        return;
      }

      let successCount = 0;
      const importRows: ImportResultRow[] = [];

      for (let i = 0; i < rows.length; i++) {
        const line = rows[i];
        const [rawUrl, ...nameParts] = line.split("\t");
        const sourceUrl = (rawUrl || "").trim();
        const sourceName = nameParts.join("\t").trim();

        if (!sourceUrl) {
          importRows.push({
            lineNumber: i + 1,
            url: "",
            name: sourceName,
            status: "error",
            message: "Hiányzó URL.",
          });
          continue;
        }

        let normalizedUrl = sourceUrl;
        if (!/^https?:\/\//i.test(normalizedUrl)) {
          normalizedUrl = `https://${normalizedUrl}`;
        }

        try {
          await createSite({
            url: normalizedUrl,
            name: sourceName || undefined,
          });
          successCount++;
          importRows.push({
            lineNumber: i + 1,
            url: normalizedUrl,
            name: sourceName,
            status: "success",
            message: "Sikeresen hozzáadva.",
          });
        } catch (err: any) {
          importRows.push({
            lineNumber: i + 1,
            url: normalizedUrl,
            name: sourceName,
            status: "error",
            message: err?.message || "Nem sikerült hozzáadni.",
          });
        }
      }

      await loadSites();

      const failedCount = importRows.filter((r) => r.status === "error").length;
      setLastImportSummary({
        total: rows.length,
        success: successCount,
        failed: failedCount,
      });
      setLastImportRows(importRows);
    } finally {
      event.target.value = "";
      setImportingSites(false);
    }
  };

  const handleExportImportErrorsCsv = () => {
    const failedRows = lastImportRows.filter((row) => row.status === "error");
    if (failedRows.length === 0) {
      return;
    }

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const header = ["Sor", "URL", "Nev", "Hiba"];
    const lines = [
      header.join(","),
      ...failedRows.map((row) =>
        [
          String(row.lineNumber > 0 ? row.lineNumber : ""),
          row.url,
          row.name,
          row.message,
        ]
          .map((cell) => escapeCsv(cell))
          .join(","),
      ),
    ];

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSuffix = new Date().toISOString().slice(0, 10);

    link.href = objectUrl;
    link.download = `import-hibak-${dateSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        "Biztosan törölni szeretnéd ezt a monitorozott weboldalt?",
      )
    ) {
      return;
    }

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
        "Biztosan törölni szeretnéd az összes naplóbejegyzést ehhez a weboldalhoz?",
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

  const openSettings = async () => {
    setSettingsOpen(true);
    setIntervalLoading(true);

    try {
      const data = await getMonitorInterval();
      setIntervalMinutesState(data.interval_minutes ?? null);
      const light = await getLightMonitorInterval();
      setLightIntervalMinutes(light.interval_minutes ?? null);
      const alertEmailSettings = await getAlertEmailSettings();
      setAlertRecipientEmail(
        alertEmailSettings.recipient_email ?? "gondocs.robert@gmail.com",
      );
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
      alert("Gyors ellenőrzés intervallum sikeresen frissítve.");
    } catch (err: any) {
      alert(
        err.message || "Nem sikerült menteni a gyors ellenőrzés intervallumot.",
      );
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
        err.message || "Nem sikerült menteni a napló megőrzési beállítást.",
      );
    } finally {
      setLogRetentionSaving(false);
    }
  };

  const saveAlertEmail = async () => {
    const email = alertRecipientEmail.trim();
    if (!email || !email.includes("@")) return;

    setAlertEmailSaving(true);
    try {
      const data = await setAlertEmailSettings(email);
      setAlertRecipientEmail(data.recipient_email ?? email);
      alert("Ertesitesi email sikeresen mentve.");
    } catch (err: any) {
      alert(err.message || "Nem sikerult menteni az ertesitesi email cimet.");
    } finally {
      setAlertEmailSaving(false);
    }
  };

  const sendAlertTestEmail = async () => {
    const email = alertRecipientEmail.trim();
    if (!email || !email.includes("@")) return;

    setAlertTestSending(true);
    try {
      await apiSendAlertTestEmail(email);
      alert(`Teszt email elkuldve: ${email}`);
    } catch (err: any) {
      alert(err.message || "Nem sikerult teszt emailt kuldeni.");
    } finally {
      setAlertTestSending(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (
      !window.confirm(
        "Biztosan törölni szeretnéd az összes naplóbejegyzést minden weboldalhoz? Ez a művelet nem vonható vissza.",
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
      if (mainView === "globalisNaplok") {
        await loadGlobalLogs(globalLogsScope);
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

  const isDetailExpanded =
    expandedPanel === "detailResponse" || expandedPanel === "detailHeatmap";
  const isGlobalExpanded =
    expandedPanel === "globalTrend" || expandedPanel === "globalHeatmap";

  const handleSelectGlobalLog = (
    log: Pick<GlobalLogEntry, "monitor_id" | "id">,
  ) => {
    setSelectedGlobalLogKey(getGlobalLogKey(log));
  };

  return (
    <div
      className="min-h-screen bg-[#f6f9fc] text-slate-800"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#073a59]/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-[#af272f]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 h-screen">
          <div className="p-5 space-y-6">
            <button
              type="button"
              onClick={() => setMainView("monitorok")}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-center hover:bg-slate-50 transition"
              title="Vissza a monitorok áttekintéséhez"
            >
              <img
                src="/ktsonlinelogo.png"
                alt="KTS Online"
                className="h-20 w-auto max-w-full lg:h-[200px]"
              />
            </button>

            <nav className="space-y-2 text-sm">
              <button
                type="button"
                onClick={() => setMainView("monitorok")}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                  mainView === "monitorok"
                    ? "border border-[#073a59]/20 bg-[#073a59]/10 text-[#073a59] font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FiActivity className="h-4 w-4" />
                Monitorok áttekintése
              </button>

              <button
                type="button"
                onClick={() => setMainView("globalisNaplok")}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                  mainView === "globalisNaplok"
                    ? "border border-[#073a59]/20 bg-[#073a59]/10 text-[#073a59] font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FiFileText className="h-4 w-4" />
                Globális naplók
              </button>
            </nav>
          </div>

          <div className="p-5 border-t border-slate-200 space-y-2">
            <button
              type="button"
              onClick={openSettings}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <FiSettings className="h-4 w-4" />
              Beállítások
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <FiLogOut className="h-4 w-4" />
              Kijelentkezés
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  KTS Online
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {mainView === "monitorok"
                    ? "Monitorok egy oldalon"
                    : "Globális napló nézet"}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Belépve: {user?.email || "ismeretlen felhasználó"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshAllLight}
                  disabled={refreshingLight || loading}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-60"
                  style={{
                    borderColor: "#073a59",
                    color: "#073a59",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <FiZap
                    className={`h-4 w-4 ${refreshingLight ? "animate-pulse" : ""}`}
                  />
                  {refreshingLight
                    ? "Gyors ellenőrzés fut..."
                    : "Gyors ellenőrzés"}
                </button>
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  disabled={refreshing || loading}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  <FiRefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing
                    ? "Teljes ellenőrzés fut..."
                    : "Teljes ellenőrzés"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMainView("monitorok")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  mainView === "monitorok"
                    ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                Monitorok
              </button>
              <button
                type="button"
                onClick={() => setMainView("globalisNaplok")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  mainView === "globalisNaplok"
                    ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                Globális naplók
              </button>
            </div>
          </header>

          {mainView === "monitorok" ? (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setMonitorListFilter("all")}
                  className={`rounded-2xl border bg-white p-4 shadow-sm text-left transition ${
                    monitorListFilter === "all"
                      ? "border-[#073a59] ring-2 ring-[#073a59]/15"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Összes webhely
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stats.total}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMonitorListFilter("active")}
                  className={`rounded-2xl border bg-emerald-50 p-4 shadow-sm text-left transition ${
                    monitorListFilter === "active"
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-emerald-200 hover:border-emerald-300"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wider text-emerald-700">
                    Aktív webhely
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {stats.active}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMonitorListFilter("offline")}
                  className={`rounded-2xl border bg-[#af272f]/10 p-4 shadow-sm text-left transition ${
                    monitorListFilter === "offline"
                      ? "border-[#af272f] ring-2 ring-[#af272f]/20"
                      : "border-[#af272f]/25 hover:border-[#af272f]/45"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wider text-[#af272f]">
                    Offline / hiba
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#af272f]">
                    {stats.offline}
                  </p>
                </button>
                <div className="rounded-2xl border border-[#073a59]/20 bg-[#073a59]/10 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-[#073a59]">
                    Átlag válaszidő
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#073a59]">
                    {stats.avgResponse != null
                      ? `${stats.avgResponse} ms`
                      : "Nincs adat"}
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 w-full sm:w-80">
                      <FiSearch className="h-4 w-4 text-slate-500" />
                      <input
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                        placeholder="Keresés név vagy URL alapján"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setIsSorting(true);
                          setSortBy(e.target.value);
                          setTimeout(() => setIsSorting(false), 200);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        <option value="name">Név</option>
                        <option value="response_time">Válaszidő</option>
                        <option value="status">HTTP státusz</option>
                        <option value="redirect">Átirányítás</option>
                        <option value="stability">Stabilitás</option>
                        <option value="last_checked">Utolsó ellenőrzés</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSorting(true);
                          setSortDirection((d) =>
                            d === "asc" ? "desc" : "asc",
                          );
                          setTimeout(() => setIsSorting(false), 200);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                        title={sortDirection === "asc" ? "Növekvő" : "Csökkenő"}
                      >
                        {sortDirection === "asc" ? "NÖV" : "CSÖK"}
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                      <ClipLoader color={BRAND_BLUE} size={36} />
                      <p className="text-sm text-slate-500">
                        Adatok betöltése...
                      </p>
                    </div>
                  ) : error ? (
                    <div className="p-6">
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Webhely</th>
                            <th className="px-4 py-3">Státusz</th>
                            <th className="px-4 py-3">Válaszidő</th>
                            <th className="px-4 py-3">SSL</th>
                            <th className="px-4 py-3">Stabilitás</th>
                            <th className="px-4 py-3">Utolsó ellenőrzés</th>
                            <th className="px-4 py-3 text-right">Műveletek</th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y divide-slate-100 transition-opacity ${isSorting ? "opacity-60" : "opacity-100"}`}
                        >
                          {sortedSites.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-10 text-center text-slate-500"
                              >
                                Nincs megjeleníthető monitor a kiválasztott
                                szűrőben.
                              </td>
                            </tr>
                          ) : (
                            sortedSites.map((m) => {
                              const rowRefreshing =
                                isRowRefreshing(m.id) ||
                                isRowRefreshingLight(m.id) ||
                                refreshing ||
                                refreshingLight;

                              const selected = selectedMonitor?.id === m.id;

                              return (
                                <tr
                                  key={m.id}
                                  className={`transition ${selected ? "bg-[#073a59]/5" : "hover:bg-slate-50"} ${rowRefreshing ? "opacity-60" : ""}`}
                                  onClick={() => setSelectedMonitorId(m.id)}
                                >
                                  <td className="px-4 py-3 min-w-[220px]">
                                    <p className="font-semibold text-slate-900">
                                      {m.name || safeHost(m.url)}
                                    </p>
                                    <a
                                      href={m.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs inline-flex items-center gap-1"
                                      style={{ color: BRAND_BLUE }}
                                    >
                                      {safeHost(m.url)}
                                      <FiExternalLink className="h-3 w-3" />
                                    </a>
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold"
                                      style={{
                                        color: getStatusColor(m),
                                        backgroundColor: `${getStatusColor(m)}18`,
                                      }}
                                    >
                                      {m.last_status ?? "HIBA"}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-xs text-slate-700">
                                    <div className="font-mono">
                                      {m.last_response_time_ms != null
                                        ? `${m.last_response_time_ms} ms`
                                        : "Nincs adat"}
                                    </div>
                                    {(m.redirect_count ?? 0) > 0 && (
                                      <div className="mt-0.5 text-[10px] text-amber-600">
                                        ↪ {m.redirect_count} átirányítás
                                      </div>
                                    )}
                                  </td>

                                  <td
                                    className="px-4 py-3 text-xs font-semibold"
                                    style={{
                                      color: getSslColor(m.ssl_days_remaining),
                                    }}
                                  >
                                    {m.ssl_days_remaining != null
                                      ? `${m.ssl_days_remaining} nap`
                                      : "Nincs adat"}
                                  </td>

                                  <td className="px-4 py-3">
                                    {m.stability_score != null ? (
                                      <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                                          <div
                                            className={`h-full rounded-full ${
                                              m.stability_score >= 95
                                                ? "bg-emerald-500"
                                                : m.stability_score >= 85
                                                  ? "bg-amber-500"
                                                  : "bg-[#af272f]"
                                            }`}
                                            style={{
                                              width: `${m.stability_score}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs font-mono text-slate-700">
                                          {m.stability_score}%
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-500">
                                        Nincs adat
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-xs text-slate-500">
                                    {formatRelativeTimeHu(m.last_checked_at)}
                                  </td>

                                  <td className="px-4 py-3">
                                    <div
                                      className="flex items-center justify-end gap-1.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRefreshOneLight(m.id)
                                        }
                                        disabled={rowRefreshing}
                                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                                        title="Gyors ellenőrzés"
                                      >
                                        <FiZap className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRefreshOne(m.id)}
                                        disabled={rowRefreshing}
                                        className="rounded-lg p-2 text-white disabled:opacity-50"
                                        title="Teljes ellenőrzés"
                                        style={{ backgroundColor: BRAND_BLUE }}
                                      >
                                        <FiRefreshCw className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => startEditMonitor(m)}
                                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100"
                                        title="Szerkesztés"
                                      >
                                        <FiEdit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(m.id)}
                                        className="rounded-lg border p-2 hover:bg-red-50"
                                        title="Törlés"
                                        style={{
                                          borderColor: `${BRAND_RED}55`,
                                          color: BRAND_RED,
                                        }}
                                      >
                                        <FiTrash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">
                        Webhely részletei
                      </h3>
                      {selectedMonitor && (
                        <span className="text-xs text-slate-500">
                          ID #{selectedMonitor.id}
                        </span>
                      )}
                    </div>

                    {!selectedMonitor ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Válassz egy sort a táblázatból.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {selectedMonitor.name ||
                              safeHost(selectedMonitor.url)}
                          </p>
                          <a
                            href={selectedMonitor.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs"
                            style={{ color: BRAND_BLUE }}
                          >
                            {selectedMonitor.url}
                            <FiExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-slate-500">Állapot</p>
                            <p
                              className="mt-1 font-bold"
                              style={{ color: getStatusColor(selectedMonitor) }}
                            >
                              {isStatusUp(selectedMonitor.last_status)
                                ? "Elérhető"
                                : "Hiba"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-slate-500">SSL</p>
                            <p
                              className="mt-1 font-bold"
                              style={{
                                color: getSslColor(
                                  selectedMonitor.ssl_days_remaining,
                                ),
                              }}
                            >
                              {selectedMonitor.ssl_days_remaining != null
                                ? `${selectedMonitor.ssl_days_remaining} nap`
                                : "Nincs adat"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-slate-500">Válaszidő</p>
                            <p className="mt-1 font-bold text-slate-800">
                              {selectedMonitor.last_response_time_ms != null
                                ? `${selectedMonitor.last_response_time_ms} ms`
                                : "Nincs adat"}
                            </p>
                            {(selectedMonitor.redirect_count ?? 0) > 0 && (
                              <p className="mt-1 text-[10px] text-amber-600">
                                ↪ {selectedMonitor.redirect_count} átirányítás
                              </p>
                            )}
                          </div>
                          <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-slate-500">Utolsó ellenőrzés</p>
                            <p className="mt-1 font-bold text-slate-800">
                              {formatRelativeTimeHu(
                                selectedMonitor.last_checked_at,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                          <p className="text-xs uppercase tracking-wider text-slate-500">
                            Rendszerinformációk
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <p className="text-slate-500">CMS</p>
                              <p className="font-semibold text-slate-800">
                                {selectedMonitor.is_wordpress
                                  ? "WordPress"
                                  : "Nem azonosított"}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <p className="text-slate-500">WP verzió</p>
                              <p className="font-semibold text-slate-800">
                                {selectedMonitor.wordpress_version ||
                                  "Nincs adat"}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <p className="text-slate-500">Átirányítás</p>
                              <p className="font-semibold text-slate-800">
                                {selectedMonitor.redirect_count ?? 0}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <p className="text-slate-500">HSTS</p>
                              <p className="font-semibold text-slate-800">
                                {selectedMonitor.has_hsts
                                  ? "Engedélyezve"
                                  : "Hiányzik"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Válaszidő grafikon
                            </p>
                            <div className="flex items-center gap-2">
                              <select
                                value={detailChartRange}
                                onChange={(e) =>
                                  setDetailChartRange(
                                    e.target.value as ChartRange,
                                  )
                                }
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                              >
                                {responseChartRangeOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPanel("detailResponse")
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                <FiMaximize2 className="h-3.5 w-3.5" />
                                Nagyban
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 h-48">
                            {selectedMonitorLogsLoading ? (
                              <div className="h-full flex items-center justify-center">
                                <ClipLoader color={BRAND_BLUE} size={24} />
                              </div>
                            ) : detailResponseChartData.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                Nincs elegendő adat a grafikonhoz.
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={detailResponseChartData}>
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e2e8f0"
                                  />
                                  <XAxis
                                    dataKey="timestamp"
                                    type="number"
                                    scale="time"
                                    domain={["dataMin", "dataMax"]}
                                    tickFormatter={(value) =>
                                      formatResponseTick(
                                        Number(value),
                                        detailChartRange,
                                      )
                                    }
                                    tick={{ fontSize: 10, fill: "#64748b" }}
                                    interval="preserveStartEnd"
                                    minTickGap={36}
                                  />
                                  <YAxis
                                    tick={{ fontSize: 10, fill: "#64748b" }}
                                    width={42}
                                  />
                                  <Tooltip
                                    formatter={(value: any) => [
                                      `${value} ms`,
                                      "Válaszidő",
                                    ]}
                                    labelFormatter={(_label, payload: any) => {
                                      const point = payload?.[0]?.payload;
                                      return `Időpont: ${point?.tooltipLabel ?? "-"}`;
                                    }}
                                  />
                                  <Line
                                    type="linear"
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

                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Kimaradások
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPanel("detailHeatmap")
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                <FiMaximize2 className="h-3.5 w-3.5" />
                                Nagyban
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {heatmapRangeOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setDetailHeatmapRange(opt.value)}
                                className={`rounded-lg border px-2 py-1 text-xs transition ${
                                  detailHeatmapRange === opt.value
                                    ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          <div className="mt-2">
                            <ActivityHeatmap
                              logs={selectedMonitorLogs}
                              title="Kimaradások"
                              range={detailHeatmapRange}
                              onCellClick={(log) =>
                                setSelectedDetailHeatmapLog(log as MonitorLog)
                              }
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openLogsModal(selectedMonitor)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <FiFileText className="h-3.5 w-3.5" />
                            Naplók
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditMonitor(selectedMonitor)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                            Szerkesztés
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <button
                      type="button"
                      onClick={() => setAddMonitorOpen((v) => !v)}
                      className="w-full inline-flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FiPlus className="h-4 w-4" />
                        Új monitor hozzáadása
                      </span>
                      {addMonitorOpen ? (
                        <FiChevronUp className="h-4 w-4" />
                      ) : (
                        <FiChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {addMonitorOpen && (
                      <div className="space-y-3">
                        <form onSubmit={handleAdd} className="space-y-3">
                          <input
                            type="text"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            required
                            placeholder="https://pelda.hu"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none"
                          />
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Név (opcionális)"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition"
                            style={{ backgroundColor: BRAND_BLUE }}
                          >
                            Hozzáadás
                          </button>
                        </form>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="h-px flex-1 bg-slate-200" />
                          vagy
                          <span className="h-px flex-1 bg-slate-200" />
                        </div>

                        <input
                          ref={importFileInputRef}
                          type="file"
                          accept=".txt,text/plain"
                          className="hidden"
                          onChange={handleImportSitesFromFile}
                        />

                        <button
                          type="button"
                          onClick={triggerImportFilePicker}
                          disabled={importingSites}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                        >
                          <FiUpload className="h-4 w-4" />
                          {importingSites
                            ? "Import folyamatban..."
                            : "Weboldalak importálása .txt fájlból"}
                        </button>

                        <p className="text-xs text-slate-500">
                          Formátum soronként: URL Név (tabulátorral elválasztva,
                          a név opcionális).
                        </p>

                        {lastImportSummary && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-800">
                              Import eredmény
                              {lastImportFileName
                                ? `: ${lastImportFileName}`
                                : ""}
                            </p>

                            <div className="grid grid-cols-3 gap-2 text-[11px]">
                              <div className="rounded-lg bg-white border border-slate-200 px-2 py-1.5 text-slate-600">
                                Összes sor:{" "}
                                <strong>{lastImportSummary.total}</strong>
                              </div>
                              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-emerald-700">
                                Sikeres:{" "}
                                <strong>{lastImportSummary.success}</strong>
                              </div>
                              <div className="rounded-lg bg-red-50 border border-red-200 px-2 py-1.5 text-red-700">
                                Hibás:{" "}
                                <strong>{lastImportSummary.failed}</strong>
                              </div>
                            </div>

                            {lastImportSummary.failed > 0 && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={handleExportImportErrorsCsv}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  <FiUpload className="h-3.5 w-3.5" />
                                  Hibás sorok exportálása CSV-be
                                </button>
                              </div>
                            )}

                            {lastImportRows.length > 0 && (
                              <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white">
                                <table className="min-w-full text-left text-[11px]">
                                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                                    <tr>
                                      <th className="px-2 py-1.5">Sor</th>
                                      <th className="px-2 py-1.5">URL</th>
                                      <th className="px-2 py-1.5">Név</th>
                                      <th className="px-2 py-1.5">Eredmény</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {lastImportRows.map((row, index) => (
                                      <tr key={`${row.lineNumber}-${index}`}>
                                        <td className="px-2 py-1.5 font-mono text-slate-600">
                                          {row.lineNumber > 0
                                            ? row.lineNumber
                                            : "-"}
                                        </td>
                                        <td className="px-2 py-1.5 break-all text-slate-700">
                                          {row.url || "-"}
                                        </td>
                                        <td className="px-2 py-1.5 break-all text-slate-700">
                                          {row.name || "-"}
                                        </td>
                                        <td
                                          className={`px-2 py-1.5 ${
                                            row.status === "success"
                                              ? "text-emerald-700"
                                              : "text-red-700"
                                          }`}
                                        >
                                          {row.message}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Élő riasztások
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <FiCheckCircle className="h-4 w-4" />
                        Aktív monitorok: {stats.active}
                      </div>
                      <div
                        className="flex items-center gap-2"
                        style={{ color: BRAND_RED }}
                      >
                        <FiAlertTriangle className="h-4 w-4" />
                        Kritikus SSL: {stats.criticalSsl}
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <FiClock className="h-4 w-4" />
                        Offline / hiba: {stats.offline}
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <FiShield className="h-4 w-4" />
                        Összes monitor: {stats.total}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2">
                      <FiSearch className="h-4 w-4 text-slate-500" />
                      <input
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                        placeholder="Keresés monitor név, URL vagy hiba szerint"
                      />
                    </div>

                    <select
                      value={globalLogsScope}
                      onChange={(e) => setGlobalLogsScope(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="all">Összes monitor</option>
                      {sites.map((site) => (
                        <option key={site.id} value={String(site.id)}>
                          {site.name || safeHost(site.url)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={globalChartRange}
                      onChange={(e) =>
                        setGlobalChartRange(e.target.value as ChartRange)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      {globalChartRangeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          Grafikon: {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadGlobalLogs(globalLogsScope)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    <FiRefreshCw
                      className={`h-4 w-4 ${globalLogsLoading ? "animate-spin" : ""}`}
                    />
                    Globális naplók frissítése
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGlobalLogsTab("all")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      globalLogsTab === "all"
                        ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Összes napló
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalLogsTab("outages")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      globalLogsTab === "outages"
                        ? "border-[#af272f] bg-[#af272f]/10 text-[#af272f]"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Kimaradások
                  </button>

                  {globalLogsTab === "outages" && (
                    <select
                      value={outagesDays}
                      onChange={(e) => setOutagesDays(Number(e.target.value))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      <option value={1}>Elmúlt 1 nap</option>
                      <option value={3}>Elmúlt 3 nap</option>
                      <option value={7}>Elmúlt 7 nap</option>
                      <option value={14}>Elmúlt 14 nap</option>
                      <option value={30}>Elmúlt 30 nap</option>
                    </select>
                  )}
                </div>

                {globalLogsError && (
                  <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {globalLogsError}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kimaradási trend
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpandedPanel("globalTrend")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <FiMaximize2 className="h-3.5 w-3.5" />
                    Nagyban
                  </button>
                </div>
                <div className="mt-3 h-64">
                  {globalLogsLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <ClipLoader color={BRAND_BLUE} size={28} />
                    </div>
                  ) : globalOutageChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">
                      Nincs adat a globális grafikonhoz.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={globalOutageChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="datum"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          interval="preserveStartEnd"
                          minTickGap={28}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          width={42}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="linear"
                          dataKey="figyelmeztetes"
                          name="Figyelmeztetés"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="linear"
                          dataKey="kimaradas"
                          name="Kimaradás"
                          stroke={BRAND_RED}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kimaradások
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpandedPanel("globalHeatmap")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <FiMaximize2 className="h-3.5 w-3.5" />
                    Nagyban
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {heatmapRangeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGlobalHeatmapRange(opt.value)}
                      className={`rounded-lg border px-2 py-1 text-xs transition ${
                        globalHeatmapRange === opt.value
                          ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  <ActivityHeatmap
                    logs={globalFilteredLogs}
                    title="Kimaradások"
                    range={globalHeatmapRange}
                    onCellClick={(log) => {
                      const globalLog = log as GlobalLogEntry;
                      setSelectedGlobalHeatmapLog(globalLog);
                      handleSelectGlobalLog(globalLog);
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {globalLogsTab === "all"
                      ? "Globális naplólista"
                      : `Kimaradások listája (${outagesDays} nap)`}
                  </p>
                </div>

                {globalLogsTab === "all" && selectedGlobalLogKey && (
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                    <span>
                      Kijelölt log:{" "}
                      {selectedGlobalLog?.monitor_name || "ismeretlen monitor"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedGlobalLogKey(null)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      Szűrés törlése
                    </button>
                  </div>
                )}

                {globalLogsLoading ? (
                  <div className="py-14 flex items-center justify-center">
                    <ClipLoader color={BRAND_BLUE} size={28} />
                  </div>
                ) : globalLogsTab === "all" &&
                  globalLogsForTable.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Nincs megjeleníthető globális naplóbejegyzés.
                  </div>
                ) : globalLogsTab === "outages" &&
                  outageLogsForTable.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Nincs kimaradás az elmúlt {outagesDays} napban.
                  </div>
                ) : globalLogsTab === "all" ? (
                  <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Időpont</th>
                          <th className="px-4 py-3">Webhely</th>
                          <th className="px-4 py-3">HTTP státusz</th>
                          <th className="px-4 py-3">Válaszidő</th>
                          <th className="px-4 py-3">Részletek</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {globalLogsForTable.map((log) => {
                          const hasError = isOutageStatus(log.status_code);
                          const rowKey = getGlobalLogKey(log);
                          const selectedRow = rowKey === selectedGlobalLogKey;
                          return (
                            <tr
                              key={rowKey}
                              onClick={() => handleSelectGlobalLog(log)}
                              className={`cursor-pointer hover:bg-slate-50 ${selectedRow ? "bg-[#073a59]/10" : ""}`}
                            >
                              <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                                {formatDateTimeHu(
                                  log.checked_at || log.created_at,
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="min-w-[220px]">
                                  <p className="font-semibold text-slate-800">
                                    {log.monitor_name}
                                  </p>
                                  <a
                                    href={log.monitor_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs inline-flex items-center gap-1"
                                    style={{ color: BRAND_BLUE }}
                                  >
                                    {safeHost(log.monitor_url)}
                                    <FiExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-flex rounded-full px-2 py-1 text-xs font-bold"
                                  style={{
                                    color: hasError ? BRAND_RED : "#16a34a",
                                    backgroundColor: hasError
                                      ? `${BRAND_RED}18`
                                      : "#16a34a18",
                                  }}
                                >
                                  {log.status_code ?? "HIBA"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-mono text-slate-700">
                                {log.response_time_ms != null
                                  ? `${log.response_time_ms} ms`
                                  : "Nincs adat"}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 break-all">
                                {log.error_message || "OK"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Időpont</th>
                          <th className="px-4 py-3">Webhely</th>
                          <th className="px-4 py-3">HTTP státusz</th>
                          <th className="px-4 py-3">Válaszidő</th>
                          <th className="px-4 py-3">Hiba</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {outageLogsForTable.map((log) => {
                          const rowKey = getGlobalLogKey(log);

                          return (
                            <tr
                              key={rowKey}
                              onClick={() => {
                                setSelectedGlobalHeatmapLog(log);
                                handleSelectGlobalLog(log);
                              }}
                              className="cursor-pointer hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                                {formatDateTimeHu(
                                  log.checked_at || log.created_at,
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="min-w-[220px]">
                                  <p className="font-semibold text-slate-800">
                                    {log.monitor_name}
                                  </p>
                                  <a
                                    href={log.monitor_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs inline-flex items-center gap-1"
                                    style={{ color: BRAND_BLUE }}
                                  >
                                    {safeHost(log.monitor_url)}
                                    <FiExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-flex rounded-full px-2 py-1 text-xs font-bold"
                                  style={{
                                    color: BRAND_RED,
                                    backgroundColor: `${BRAND_RED}18`,
                                  }}
                                >
                                  {log.status_code ?? "HIBA"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-mono text-slate-700">
                                {log.response_time_ms != null
                                  ? `${log.response_time_ms} ms`
                                  : "Nincs adat"}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 break-all">
                                {log.error_message ||
                                  "Állapotkód alapú kimaradás"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {expandedPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
          onClick={() => setExpandedPanel(null)}
        >
          <div
            className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {expandedPanel === "detailResponse" &&
                  "Válaszidő grafikon - nagy nézet"}
                {expandedPanel === "detailHeatmap" &&
                  "Kimaradások - nagy nézet"}
                {expandedPanel === "globalTrend" &&
                  "Globális kimaradási trend - nagy nézet"}
                {expandedPanel === "globalHeatmap" &&
                  "Globális kimaradások - nagy nézet"}
              </h3>
              <button
                type="button"
                onClick={() => setExpandedPanel(null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-white px-5 py-3 space-y-2">
              {isDetailExpanded && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedPanel("detailResponse")}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                      expandedPanel === "detailResponse"
                        ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Válaszidő
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedPanel("detailHeatmap")}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                      expandedPanel === "detailHeatmap"
                        ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Kimaradások
                  </button>
                </div>
              )}

              {isGlobalExpanded && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedPanel("globalTrend")}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                      expandedPanel === "globalTrend"
                        ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Kimaradási trend
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedPanel("globalHeatmap")}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                      expandedPanel === "globalHeatmap"
                        ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Kimaradások
                  </button>
                </div>
              )}

              {(expandedPanel === "detailResponse" ||
                expandedPanel === "globalTrend") && (
                <select
                  value={
                    expandedPanel === "detailResponse"
                      ? detailChartRange
                      : globalChartRange
                  }
                  onChange={(e) => {
                    const next = e.target.value as ChartRange;
                    if (expandedPanel === "detailResponse") {
                      setDetailChartRange(next);
                    } else {
                      setGlobalChartRange(next);
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  {(expandedPanel === "detailResponse"
                    ? responseChartRangeOptions
                    : globalChartRangeOptions
                  ).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {(expandedPanel === "detailHeatmap" ||
                expandedPanel === "globalHeatmap") && (
                <div className="flex flex-wrap gap-1.5">
                  {heatmapRangeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (expandedPanel === "detailHeatmap") {
                          setDetailHeatmapRange(opt.value);
                        } else {
                          setGlobalHeatmapRange(opt.value);
                        }
                      }}
                      className={`rounded-lg border px-2 py-1 text-xs transition ${
                        (expandedPanel === "detailHeatmap"
                          ? detailHeatmapRange
                          : globalHeatmapRange) === opt.value
                          ? "border-[#073a59] bg-[#073a59]/10 text-[#073a59]"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-5">
              {expandedPanel === "detailResponse" && (
                <div className="h-full min-h-[420px]">
                  {selectedMonitorLogsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <ClipLoader color={BRAND_BLUE} size={30} />
                    </div>
                  ) : detailResponseChartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Nincs elegendő adat a grafikonhoz.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={detailResponseChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="timestamp"
                          type="number"
                          scale="time"
                          domain={["dataMin", "dataMax"]}
                          tickFormatter={(value) =>
                            formatResponseTick(Number(value), detailChartRange)
                          }
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          interval="preserveStartEnd"
                          minTickGap={40}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          width={50}
                        />
                        <Tooltip
                          formatter={(value: any) => [
                            `${value} ms`,
                            "Válaszidő",
                          ]}
                          labelFormatter={(_label, payload: any) => {
                            const point = payload?.[0]?.payload;
                            return `Időpont: ${point?.tooltipLabel ?? "-"}`;
                          }}
                        />
                        <Line
                          type="linear"
                          dataKey="valaszido"
                          stroke={BRAND_BLUE}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {expandedPanel === "detailHeatmap" && (
                <div className="space-y-4">
                  <ActivityHeatmap
                    logs={selectedMonitorLogs}
                    title="Kimaradások"
                    range={detailHeatmapRange}
                    cellSize="lg"
                    onCellClick={(log) =>
                      setSelectedDetailHeatmapLog(log as MonitorLog)
                    }
                  />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {selectedDetailHeatmapLog
                        ? "Kiválasztott napló részletei"
                        : "Kattints egy kockára a részletes naplóadatokhoz."}
                    </p>

                    {selectedDetailHeatmapLog && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-slate-500">Időpont</p>
                          <p className="font-mono">
                            {formatDateTimeHu(
                              selectedDetailHeatmapLog.checked_at ||
                                selectedDetailHeatmapLog.created_at,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">HTTP státusz</p>
                          <p className="font-semibold">
                            {selectedDetailHeatmapLog.status_code ?? "HIBA"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Válaszidő</p>
                          <p className="font-mono">
                            {selectedDetailHeatmapLog.response_time_ms != null
                              ? `${selectedDetailHeatmapLog.response_time_ms} ms`
                              : "Nincs adat"}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-slate-500">Részletek</p>
                          <p className="break-all">
                            {selectedDetailHeatmapLog.error_message || "OK"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expandedPanel === "globalTrend" && (
                <div className="h-full min-h-[420px]">
                  {globalLogsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <ClipLoader color={BRAND_BLUE} size={30} />
                    </div>
                  ) : globalOutageChartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Nincs adat a globális grafikonhoz.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={globalOutageChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="datum"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          interval="preserveStartEnd"
                          minTickGap={34}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          width={50}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="linear"
                          dataKey="figyelmeztetes"
                          name="Figyelmeztetés"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="linear"
                          dataKey="kimaradas"
                          name="Kimaradás"
                          stroke={BRAND_RED}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {expandedPanel === "globalHeatmap" && (
                <div className="space-y-4">
                  <ActivityHeatmap
                    logs={globalFilteredLogs}
                    title="Kimaradások"
                    range={globalHeatmapRange}
                    cellSize="lg"
                    onCellClick={(log) => {
                      const globalLog = log as GlobalLogEntry;
                      setSelectedGlobalHeatmapLog(globalLog);
                      handleSelectGlobalLog(globalLog);
                    }}
                  />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {selectedGlobalHeatmapLog
                        ? "Kiválasztott globális napló részletei"
                        : "Kattints egy kockára a részletes naplóadatokhoz."}
                    </p>

                    {selectedGlobalHeatmapLog && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-slate-500">Időpont</p>
                          <p className="font-mono">
                            {formatDateTimeHu(
                              selectedGlobalHeatmapLog.checked_at ||
                                selectedGlobalHeatmapLog.created_at,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Monitor</p>
                          <p className="font-semibold">
                            {selectedGlobalHeatmapLog.monitor_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">HTTP státusz</p>
                          <p className="font-semibold">
                            {selectedGlobalHeatmapLog.status_code ?? "HIBA"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Válaszidő</p>
                          <p className="font-mono">
                            {selectedGlobalHeatmapLog.response_time_ms != null
                              ? `${selectedGlobalHeatmapLog.response_time_ms} ms`
                              : "Nincs adat"}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-slate-500">URL</p>
                          <a
                            href={selectedGlobalHeatmapLog.monitor_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 break-all"
                            style={{ color: BRAND_BLUE }}
                          >
                            {selectedGlobalHeatmapLog.monitor_url}
                            <FiExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-slate-500">Részletek</p>
                          <p className="break-all">
                            {selectedGlobalHeatmapLog.error_message || "OK"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          alertRecipientEmail={alertRecipientEmail}
          setAlertRecipientEmail={setAlertRecipientEmail}
          alertEmailSaving={alertEmailSaving}
          saveAlertEmail={saveAlertEmail}
          alertTestSending={alertTestSending}
          sendAlertTestEmail={sendAlertTestEmail}
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
