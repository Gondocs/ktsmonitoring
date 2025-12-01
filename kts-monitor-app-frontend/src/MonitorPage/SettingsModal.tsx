// src/MonitorPage/SettingsModal.tsx
import React from "react";
import { FiX, FiSave, FiAlertTriangle, FiTrash2 } from "react-icons/fi";

type SettingsModalProps = {
  onClose: () => void;
  intervalLoading: boolean;
  intervalMinutes: number | null;
  setIntervalMinutes: (value: number | null) => void;
  intervalSaving: boolean;
  saveInterval: () => void;

  lightIntervalMinutes: number | null;
  setLightIntervalMinutes: (value: number | null) => void;
  lightIntervalSaving: boolean;
  saveLightInterval: () => void;

  logRetentionDays: number | null;
  setLogRetentionDays: (value: number | null) => void;
  logRetentionSaving: boolean;
  saveLogRetention: () => void;

  deletingAllLogs: boolean;
  handleDeleteAllLogs: () => void;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  intervalLoading,
  intervalMinutes,
  setIntervalMinutes,
  intervalSaving,
  saveInterval,
  lightIntervalMinutes,
  setLightIntervalMinutes,
  lightIntervalSaving,
  saveLightInterval,
  logRetentionDays,
  setLogRetentionDays,
  logRetentionSaving,
  saveLogRetention,
  deletingAllLogs,
  handleDeleteAllLogs,
}) => {
  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: number | null) => void
  ) => {
    const value = e.target.value;
    if (value === "") {
      setter(null);
      return;
    }
    const n = Number(value);
    setter(Number.isNaN(n) ? null : n);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        // FŐ VÁLTOZÁSOK: max-h és flex-col, hogy a tartalom belül scrollozzon
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              Monitor beállítások
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Intervallumok és napló megőrzés konfigurálása.
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

        {/* Content – EZ SCROLLOZIK */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {intervalLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-3">
                <span className="h-8 w-8 border-2 border-slate-700 border-t-ktsRed rounded-full animate-spin" />
                <p className="text-xs text-slate-400">
                  Beállítások betöltése...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Deep monitor interval */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Deep monitor intervallum
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Milyen gyakran fusson a teljes (Deep) ellenőrzés
                      automatikusan. Rövidebb intervallum pontosabb, de több
                      erőforrást használ.
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-ktsRed focus:border-ktsRed"
                      value={intervalMinutes ?? ""}
                      onChange={(e) =>
                        handleNumberChange(e, setIntervalMinutes)
                      }
                    />
                    <span className="text-xs text-slate-400">perc</span>
                  </div>

                  <button
                    type="button"
                    onClick={saveInterval}
                    disabled={
                      intervalSaving ||
                      intervalMinutes == null ||
                      Number.isNaN(intervalMinutes)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-ktsRed px-4 py-2 text-xs font-semibold text-white shadow-md shadow-ktsRed/30 hover:bg-ktsLightRed transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {intervalSaving ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Mentés...
                      </>
                    ) : (
                      <>
                        <FiSave className="h-3.5 w-3.5" />
                        Mentés
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Light monitor interval */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Light monitor intervallum
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Milyen gyakran fusson a gyors (Light) ellenőrzés
                      automatikusan. Ez gyorsabb, de kevesebb részletet vizsgál.
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-ktsRed focus:border-ktsRed"
                      value={lightIntervalMinutes ?? ""}
                      onChange={(e) =>
                        handleNumberChange(e, setLightIntervalMinutes)
                      }
                    />
                    <span className="text-xs text-slate-400">perc</span>
                  </div>

                  <button
                    type="button"
                    onClick={saveLightInterval}
                    disabled={
                      lightIntervalSaving ||
                      lightIntervalMinutes == null ||
                      Number.isNaN(lightIntervalMinutes)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {lightIntervalSaving ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-slate-300/40 border-t-white rounded-full animate-spin" />
                        Mentés...
                      </>
                    ) : (
                      <>
                        <FiSave className="h-3.5 w-3.5" />
                        Mentés
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Log retention */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Napló megőrzési idő
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Hány napig maradjanak meg a naplóbejegyzések. A régebbi
                      bejegyzések automatikusan törlésre kerülnek.
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-ktsRed focus:border-ktsRed"
                      value={logRetentionDays ?? ""}
                      onChange={(e) =>
                        handleNumberChange(e, setLogRetentionDays)
                      }
                    />
                    <span className="text-xs text-slate-400">nap</span>
                  </div>

                  <button
                    type="button"
                    onClick={saveLogRetention}
                    disabled={
                      logRetentionSaving ||
                      logRetentionDays == null ||
                      Number.isNaN(logRetentionDays)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {logRetentionSaving ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-slate-300/40 border-t-white rounded-full animate-spin" />
                        Mentés...
                      </>
                    ) : (
                      <>
                        <FiSave className="h-3.5 w-3.5" />
                        Mentés
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Danger zone */}
              <section className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <FiAlertTriangle className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-200">
                      Veszélyes műveletek
                    </h3>
                    <p className="text-xs text-red-200/80 mt-1">
                      Az alábbi gomb a teljes rendszer összes naplóbejegyzését
                      törli. A művelet nem vonható vissza.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteAllLogs}
                  disabled={deletingAllLogs}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/50 px-4 py-2 text-xs font-semibold text-red-50 hover:bg-red-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deletingAllLogs ? (
                    <>
                      <span className="h-3.5 w-3.5 border-2 border-red-200/60 border-t-red-50 rounded-full animate-spin" />
                      Minden napló törlése...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Minden napló törlése
                    </>
                  )}
                </button>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/80 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
