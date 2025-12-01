import React from "react";

type Props = {
  newUrl: string;
  newName: string;
  setNewUrl: (v: string) => void;
  setNewName: (v: string) => void;
  onAdd: (e: React.FormEvent) => void;
};

export const AddMonitorSection: React.FC<Props> = ({
  newUrl,
  newName,
  setNewUrl,
  setNewName,
  onAdd,
}) => (
  <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl relative overflow-hidden group">
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
        onSubmit={onAdd}
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
);
