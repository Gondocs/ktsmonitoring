import React from "react";
import { FiRefreshCw, FiSettings, FiZap } from "react-icons/fi";

type Props = {
  user: { email: string } | null;
  logout: () => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortDirection: "asc" | "desc";
  toggleSortDirection: () => void;
  isSorting: boolean;
  refreshing: boolean;
  refreshingLight: boolean;
  loading: boolean;
  onRefreshAll: () => void;
  onRefreshAllLight: () => void;
  openSettings: () => void;
};

export const MonitorHeader: React.FC<Props> = ({
  user,
  logout,
  sortBy,
  setSortBy,
  sortDirection,
  toggleSortDirection,
  refreshing,
  refreshingLight,
  loading,
  onRefreshAll,
  onRefreshAllLight,
  openSettings,
}) => {
  return (
    <>
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

      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
        {/* Title + toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-50 tracking-tight">
              Monitorozott weboldalak
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Valós idejű állapot, SSL státusz és teljesítmény mutatók egy
              helyen.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-sm shadow-sm">
            {/* Sort controls */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="relative group flex-1 sm:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-slate-950 text-slate-200 text-xs font-medium rounded-lg pl-3 pr-9 py-2 border border-slate-800 focus:ring-1 focus:ring-ktsRed focus:border-ktsRed focus:outline-none cursor-pointer hover:border-slate-700 transition"
                >
                  <option value="name">Név (A-Z)</option>
                  <option value="response_time">Válaszidő</option>
                  <option value="status">HTTP kód</option>
                  <option value="redirect">Átirányítás</option>
                  <option value="stability">Stabilitás</option>
                  <option value="last_checked">Utolsó ellenőrzés</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500 group-hover:text-slate-300 transition-colors">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              <button
                onClick={toggleSortDirection}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 hover:border-slate-700 transition flex items-center justify-center min-w-[40px]"
                title={sortDirection === "asc" ? "Növekvő" : "Csökkenő"}
              >
                <span className="text-[10px] leading-none">
                  {sortDirection === "asc" ? "▲" : "▼"}
                </span>
              </button>
            </div>

            <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block"></div>

            {/* Global actions */}
            <div className="flex gap-2">
              <button
                onClick={onRefreshAllLight}
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
                onClick={onRefreshAll}
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
      </main>
    </>
  );
};
