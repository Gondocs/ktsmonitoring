import React, { useState } from 'react';
import { useAuth } from './auth.tsx';
type Props = {
	onLoggedIn: () => void;
};

export const LoginPage: React.FC<Props> = ({ onLoggedIn }) => {
	const { login } = useAuth();
	const [email, setEmail] = useState('test@example.com');
	const [password, setPassword] = useState('password');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
        console.log('Attempting login')
		setLoading(true);
		try {
			await login(email, password);
			onLoggedIn();
		} catch (err: any) {
			setError(err.message || 'Sikertelen bejelentkezés');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ktsDarkBlue via-ktsBlue to-slate-900 px-4">
				<div className="w-full max-w-md bg-slate-900/80 border border-ktsBlue/60 rounded-2xl shadow-2xl p-8 space-y-6">
					<div className="flex flex-col items-center gap-3 text-center">
						<img
							src="/ktsonlinelogo.png"
							alt="KTS Online logó"
							className="h-20 w-auto drop-shadow-lg"
						/>
						<h1 className="mt-1 text-xl font-semibold text-white">Weboldal monitorozó belépés</h1>
						<p className="text-sm text-slate-300 max-w-sm">
							Jelentkezz be a KTS Online Kft. weboldal-felügyeleti felületére.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4 mt-4">
						<div className="space-y-1">
							<label className="block text-sm font-medium text-slate-200" htmlFor="email">
								E-mail cím
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={e => setEmail(e.target.value)}
								className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
								placeholder="pelda@kts.hu"
								required
							/>
						</div>
						<div className="space-y-1">
							<label className="block text-sm font-medium text-slate-200" htmlFor="password">
								Jelszó
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
								placeholder="••••••••"
								required
							/>
						</div>
						{error && (
							<div className="text-sm text-red-400 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2">
								{error}
							</div>
						)}
						<button
							type="submit"
							disabled={loading}
							className="w-full inline-flex justify-center items-center rounded-lg bg-ktsRed hover:bg-ktsLightRed disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white py-2.5 mt-2 shadow-lg shadow-ktsRed/30 transition"
						>
							{loading ? 'Bejelentkezés folyamatban…' : 'Bejelentkezés'}
						</button>
					</form>

					<p className="text-[11px] text-center text-slate-500 pt-2">
						© {new Date().getFullYear()} KTS Online Kft. Minden jog fenntartva.
					</p>
				</div>
			</div>
		);
};

