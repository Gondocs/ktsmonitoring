// src/MonitorPage/SettingsModal.tsx
import React from "react";
import { FiX, FiSave, FiAlertTriangle, FiTrash2, FiSend } from "react-icons/fi";

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

  alertRecipientEmail: string;
  setAlertRecipientEmail: (value: string) => void;
  alertEmailSaving: boolean;
  saveAlertEmail: () => void;
  alertTestSending: boolean;
  sendAlertTestEmail: () => void;

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
  alertRecipientEmail,
  setAlertRecipientEmail,
  alertEmailSaving,
  saveAlertEmail,
  alertTestSending,
  sendAlertTestEmail,
  deletingAllLogs,
  handleDeleteAllLogs,
}) => {
  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: number | null) => void,
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Monitor beállítások
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Intervallumok és napló megőrzés konfigurálása.
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

        {/* Content – EZ SCROLLOZIK */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {intervalLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-3">
                <span
                  className="h-8 w-8 border-2 border-slate-300 rounded-full animate-spin"
                  style={{ borderTopColor: "#073a59" }}
                />
                <p className="text-xs text-slate-500">
                  Beállítások betöltése...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Deep monitor interval */}
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Deep monitor intervallum
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
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
                      className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                      value={intervalMinutes ?? ""}
                      onChange={(e) =>
                        handleNumberChange(e, setIntervalMinutes)
                      }
                    />
                    <span className="text-xs text-slate-500">perc</span>
                  </div>

                  <button
                    type="button"
                    onClick={saveInterval}
                    disabled={
                      intervalSaving ||
                      intervalMinutes == null ||
                      Number.isNaN(intervalMinutes)
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#073a59" }}
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
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Light monitor intervallum
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
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
                      className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                      value={lightIntervalMinutes ?? ""}
                      onChange={(e) =>
                        handleNumberChange(e, setLightIntervalMinutes)
                      }
                    />
                    <span className="text-xs text-slate-500">perc</span>
                  </div>

                  <button
                    type="button"
                    onClick={saveLightInterval}
                    disabled={
                      lightIntervalSaving ||
                      lightIntervalMinutes == null ||
                      Number.isNaN(lightIntervalMinutes)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Napló megőrzési idő
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
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
                      className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                      value={logRetentionDays ?? ""}
                      onChange={(e) =>
                        handleNumberChange(e, setLogRetentionDays)
                      }
                    />
                    <span className="text-xs text-slate-500">nap</span>
                  </div>

                  <button
                    type="button"
                    onClick={saveLogRetention}
                    disabled={
                      logRetentionSaving ||
                      logRetentionDays == null ||
                      Number.isNaN(logRetentionDays)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
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

              {/* Alert email */}
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Leállás értesítési email
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Ha egy oldal piros statuszba kerul (pl. 4xx/5xx vagy nem
                      erheto el), ide automatikusan ertesites megy.
                    </p>
                  </div>
                </div>

                <div className="mt-2 space-y-3">
                  <input
                    type="email"
                    placeholder="pelda@email.hu"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                    value={alertRecipientEmail}
                    onChange={(e) => setAlertRecipientEmail(e.target.value)}
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={saveAlertEmail}
                      disabled={
                        alertEmailSaving ||
                        !alertRecipientEmail ||
                        !alertRecipientEmail.includes("@")
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {alertEmailSaving ? (
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

                    <button
                      type="button"
                      onClick={sendAlertTestEmail}
                      disabled={
                        alertTestSending ||
                        !alertRecipientEmail ||
                        !alertRecipientEmail.includes("@")
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {alertTestSending ? (
                        <>
                          <span className="h-3.5 w-3.5 border-2 border-slate-300/40 border-t-slate-700 rounded-full animate-spin" />
                          Teszt kuldes...
                        </>
                      ) : (
                        <>
                          <FiSend className="h-3.5 w-3.5" />
                          Teszt email küldése
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* Danger zone */}
              <section className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <FiAlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-700">
                      Veszélyes műveletek
                    </h3>
                    <p className="text-xs text-red-700/80 mt-1">
                      Az alábbi gomb a teljes rendszer összes naplóbejegyzését
                      törli. A művelet nem vonható vissza.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteAllLogs}
                  disabled={deletingAllLogs}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
