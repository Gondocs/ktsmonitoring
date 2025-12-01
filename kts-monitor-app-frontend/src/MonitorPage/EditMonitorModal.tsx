import React from "react";
import { FiX, FiSave, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { Monitor } from "./MonitorTypes.ts";

type EditMonitorModalProps = {
  monitor: Monitor;
  editUrl: string;
  setEditUrl: (value: string) => void;
  editName: string;
  setEditName: (value: string) => void;
  editIsActive: boolean;
  setEditIsActive: (value: boolean) => void;
  editSaving: boolean;
  onClose: () => void;
  onSave: () => void;
};

export const EditMonitorModal: React.FC<EditMonitorModalProps> = ({
  monitor,
  editUrl,
  setEditUrl,
  editName,
  setEditName,
  editIsActive,
  setEditIsActive,
  editSaving,
  onClose,
  onSave,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSaving) {
      onSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-50 truncate">
              Monitor szerkesztése
            </h2>
            <p className="text-xs text-slate-400 mt-1 truncate">
              {monitor.name || monitor.url}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Célpont URL
            </label>
            <input
              type="text"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://pelda.hu"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-ktsRed focus:border-ktsRed"
            />
            <p className="text-[10px] text-slate-500">
              Ha nem adsz meg protokollt, automatikusan{" "}
              <span className="font-mono text-slate-300">https://</span>-re
              egészül ki.
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Megjelenített név
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Opcinális név"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-ktsRed focus:border-ktsRed"
            />
            <p className="text-[10px] text-slate-500">
              Ha üresen hagyod, a rendszer az URL-t jeleníti meg névként.
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-100 uppercase tracking-wide">
                Monitorozás státusz
              </p>
              <p className="text-[11px] text-slate-400">
                Ha inaktívra állítod, a rendszer nem fogja automatikusan
                ellenőrizni ezt a weboldalt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditIsActive(!editIsActive)}
              className="ml-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-ktsRed hover:text-ktsRed transition"
            >
              {editIsActive ? (
                <>
                  <FiToggleRight className="h-5 w-5 text-emerald-400" />
                  Aktív
                </>
              ) : (
                <>
                  <FiToggleLeft className="h-5 w-5 text-slate-500" />
                  Inaktív
                </>
              )}
            </button>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
              disabled={editSaving}
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-ktsRed px-5 py-1.5 text-xs font-semibold text-white shadow-md shadow-ktsRed/30 hover:bg-ktsLightRed transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {editSaving ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <FiSave className="h-3.5 w-3.5" />
                  Változások mentése
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
