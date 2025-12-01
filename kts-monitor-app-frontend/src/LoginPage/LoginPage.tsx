import React, { useState } from "react";
import { useAuth } from "../Auth/auth.tsx";
import { FiMail, FiLock, FiArrowRight, FiLoader } from "react-icons/fi";
import Aurora from "../Aurora.tsx"; // Adjust path if necessary

type Props = {
  onLoggedIn: () => void;
};

export const LoginPage: React.FC<Props> = ({ onLoggedIn }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onLoggedIn();
    } catch (err: any) {
      setError(err.message || "Sikertelen bejelentkezés");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4">
      
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-10 space-y-8">
          {/* Fejléc */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-2xl">
              <img
                src="/ktsonlinelogo.png"
                alt="KTS Online"
                className="h-24 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                KTS Monitoring Rendszer
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                Jelentkezzen be a weboldal-felügyeleti rendszerbe.
              </p>
            </div>
          </div>

          {/* Űrlap */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Email Mező */}
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1"
                  htmlFor="email"
                >
                  E-mail cím
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-ktsRed transition-colors">
                    <FiMail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-ktsRed focus:ring-1 focus:ring-ktsRed transition-all shadow-inner"
                    placeholder="pelda@kts.hu"
                    required
                  />
                </div>
              </div>

              {/* Jelszó Mező */}
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1"
                  htmlFor="password"
                >
                  Jelszó
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-ktsRed transition-colors">
                    <FiLock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-ktsRed focus:ring-1 focus:ring-ktsRed transition-all shadow-inner"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Hibaüzenet */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-200 bg-red-900/30 border border-red-800/50 rounded-lg animate-fade-in">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Gomb */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-ktsRed to-red-600 hover:to-red-500 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-red-900/20 hover:shadow-red-900/40 transform active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <FiLoader className="h-5 w-5 animate-spin" />
                  <span>Hitelesítés...</span>
                </>
              ) : (
                <>
                  <span>Bejelentkezés</span>
                  <FiArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lábléc */}
        <p className="mt-8 text-center text-[11px] text-slate-600">
          © {new Date().getFullYear()} KTS Online Kft. • Biztonságos rendszer
        </p>
      </div>
    </div>
  );
};