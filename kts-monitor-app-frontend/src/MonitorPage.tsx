import React, { useEffect, useState } from 'react';
import {
	fetchSites,
	checkAllSites,
	checkOneSite,
	createSite,
	deleteSite,
	fetchSiteLogs,
} from './api.ts';
import { useAuth } from './auth.tsx';

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
	const [refreshingIds, setRefreshingIds] = useState<number[]>([]);
	const [error, setError] = useState<string | null>(null);

	const [newUrl, setNewUrl] = useState('');
	const [newName, setNewName] = useState('');

	const [logModalMonitor, setLogModalMonitor] = useState<Monitor | null>(null);
	const [logs, setLogs] = useState<MonitorLog[]>([]);
	const [logsLoading, setLogsLoading] = useState(false);
	const [logsLimit, setLogsLimit] = useState(50);

	const loadSites = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchSites();
			setSites(data);
		} catch (err: any) {
			setError(err.message || 'Nem sikerült betölteni a monitorokat.');
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
			alert(err.message || 'Nem sikerült frissíteni az összes weboldalt.');
		} finally {
			setRefreshing(false);
		}
	};

	const handleRefreshOne = async (id: number) => {
		setRefreshingIds(prev => (prev.includes(id) ? prev : [...prev, id]));
		try {
			await checkOneSite(id);
			await loadSites();
		} catch (err: any) {
			alert(err.message || 'Nem sikerült frissíteni a weboldalt.');
		} finally {
			setRefreshingIds(prev => prev.filter(x => x !== id));
		}
	};

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newUrl) return;
		try {
			await createSite({ url: newUrl, name: newName || undefined });
			setNewUrl('');
			setNewName('');
			await loadSites();
		} catch (err: any) {
			alert(err.message || 'Nem sikerült hozzáadni a weboldalt.');
		}
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Biztosan törölni szeretnéd ezt a monitorozott weboldalt?')) return;
		try {
			await deleteSite(id);
			await loadSites();
		} catch (err: any) {
			alert(err.message || 'Nem sikerült törölni a weboldalt.');
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
			alert(err.message || 'Nem sikerült betölteni a naplókat.');
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
			alert(err.message || 'Nem sikerült betölteni a naplókat.');
		} finally {
			setLogsLoading(false);
		}
	};

	const statusColor = (m: Monitor) => {
		if (m.last_status === 200) {
			if (m.last_response_time_ms != null && m.last_response_time_ms > 5000) {
				return 'orange';
			}
			if (m.stability_score != null && m.stability_score < 67) {
				return 'orange';
			}
			return 'green';
		}
		return 'red';
	};

	const sslColor = (days: number | null) => {
		if (days == null) return '';
		if (days < 3) return 'red';
		if (days < 14) return 'orange';
		return 'green';
	};

	const isRowRefreshing = (id: number) => refreshingIds.includes(id);

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
								Weboldal monitorozó áttekintés
							</h1>
						</div>
					</div>
					<div className="flex items-center gap-4">
						{user && (
							<p className="text-xs sm:text-sm text-slate-300">
								Belépve mint <span className="font-semibold text-ktsLightRed">{user.email}</span>
							</p>
						)}
						<button
							onClick={logout}
							className="text-xs sm:text-sm inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-100 hover:border-ktsRed hover:text-white hover:bg-ktsRed/80 transition"
						>
							Kijelentkezés
						</button>
					</div>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h2 className="text-xl font-semibold text-slate-50">Monitorozott weboldalak</h2>
						<p className="text-sm text-slate-400">
							Állapot, válaszidő, SSL lejárat és stabilitás egy helyen.
						</p>
					</div>
					<button
						onClick={handleRefreshAll}
						disabled={refreshing || loading}
						className="inline-flex items-center justify-center gap-2 rounded-full bg-ktsRed hover:bg-ktsLightRed disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white shadow-md shadow-ktsRed/30 transition"
					>
						{refreshing && (
							<span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
						)}
						{refreshing ? 'Összes frissítése…' : 'Összes weboldal frissítése'}
					</button>
				</div>

				{loading ? (
					<div className="flex items-center gap-3 text-sm text-slate-300">
						<span className="h-4 w-4 border-2 border-slate-600 border-t-ktsRed rounded-full animate-spin" />
						<span>Monitorozott weboldalak betöltése…</span>
					</div>
				) : error ? (
					<p className="text-sm text-red-400">{error}</p>
				) : (
					<div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
						<table className="min-w-full text-xs sm:text-sm">
							<thead className="bg-slate-900/80 text-slate-300 text-[11px] uppercase tracking-wide">
								<tr>
									<th className="px-3 py-2 text-left">Név</th>
									<th className="px-3 py-2 text-left">URL</th>
									<th className="px-3 py-2">HTTP</th>
									<th className="px-3 py-2">Válaszidő (ms)</th>
									<th className="px-3 py-2">SSL napok</th>
									<th className="px-3 py-2">HSTS</th>
									<th className="px-3 py-2">Átirányítás</th>
									<th className="px-3 py-2">WordPress</th>
									<th className="px-3 py-2">Stabilitás</th>
									<th className="px-3 py-2">Utolsó ellenőrzés</th>
									<th className="px-3 py-2">Műveletek</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/80">
								{sites.map(m => {
									const rowRefreshing = isRowRefreshing(m.id) || refreshing;
									return (
										<tr
											key={m.id}
											className={
												'hover:bg-slate-800/60 transition ' +
												(rowRefreshing ? 'opacity-60 pointer-events-none' : '')
											}
										>
											<td className="px-3 py-2 font-medium text-slate-100 flex items-center gap-2">
												{rowRefreshing && (
													<span className="h-3 w-3 border-2 border-slate-500 border-t-ktsRed rounded-full animate-spin" />
												)}
												<span>{m.name}</span>
											</td>
											<td className="px-3 py-2 text-slate-300 break-all">{m.url}</td>
											<td className="px-3 py-2 font-mono text-xs" style={{ color: statusColor(m) }}>
												{m.last_status ?? '-'}
											</td>
											<td className="px-3 py-2">{m.last_response_time_ms ?? '-'}</td>
											<td className="px-3 py-2 font-mono text-xs" style={{ color: sslColor(m.ssl_days_remaining) }}>
												{m.ssl_days_remaining != null ? `${m.ssl_days_remaining} nap` : '-'}
											</td>
											<td className="px-3 py-2">{m.has_hsts ? 'igen' : 'nem'}</td>
											<td className="px-3 py-2">{m.redirect_count ?? '-'}</td>
											<td className="px-3 py-2">
												{m.is_wordpress
														? m.wordpress_version
															? `WordPress ${m.wordpress_version}`
															: 'WordPress'
													: '-'}
											</td>
											<td className="px-3 py-2">{m.stability_score != null ? `${m.stability_score}%` : '-'}</td>
											<td className="px-3 py-2 whitespace-nowrap">
												{m.last_checked_at ? new Date(m.last_checked_at).toLocaleString() : '-'}
											</td>
											<td className="px-3 py-2">
												<div className="flex flex-nowrap items-center gap-1.5 justify-end min-w-[180px]">
													<button
														onClick={() => handleRefreshOne(m.id)}
														disabled={rowRefreshing}
														className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-100 border border-slate-700 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed transition"
													>
														Frissítés
													</button>
													<button
														onClick={() => openLogsModal(m)}
														className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-100 border border-slate-700 whitespace-nowrap transition"
													>
														Naplók
													</button>
													<button
														onClick={() => handleDelete(m.id)}
														className="px-3 py-1 rounded-full bg-red-900/70 hover:bg-red-700 text-[11px] text-red-50 border border-red-700 whitespace-nowrap transition"
													>
														Törlés
													</button>
												</div>
											</td>
										</tr>
									);
								})}
								{sites.length === 0 && (
									<tr>
										<td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-400">
											Jelenleg nincs még monitorozott weboldal.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}

				<section className="mt-6 border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-4 space-y-3">
					<h3 className="text-sm font-semibold text-slate-100">Új weboldal monitor hozzáadása</h3>
					<p className="text-xs text-slate-400">
						Add meg az URL-t, opcionálisan egy könnyen azonosítható nevet.
					</p>
					<form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 flex-wrap">
						<input
							type="url"
							placeholder="https://pelda.hu"
							value={newUrl}
							onChange={e => setNewUrl(e.target.value)}
							required
							className="flex-1 min-w-[220px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
						/>
						<input
							type="text"
							placeholder="Opcionális megjelenített név"
							value={newName}
							onChange={e => setNewName(e.target.value)}
							className="flex-1 min-w-[160px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ktsRed focus:border-ktsRed transition"
						/>
						<button
							type="submit"
							className="inline-flex items-center justify-center rounded-lg bg-ktsRed hover:bg-ktsLightRed px-4 py-2 text-sm font-semibold text-white shadow-md shadow-ktsRed/30 transition"
						>
							Hozzáadás
						</button>
					</form>
				</section>
			</main>

			{/* Logs modal */}
			{logModalMonitor && (
				<div
					className="fixed inset-0 z-30 flex items-center justify-center bg-black/70"
					onClick={() => setLogModalMonitor(null)}
				>
					<div
						className="max-w-4xl w-[94%] max-h-[80vh] overflow-auto rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl p-4 sm:p-6"
						onClick={e => e.stopPropagation()}
					>
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
							<div>
								<h3 className="text-base sm:text-lg font-semibold text-slate-50">
									Naplóbejegyzések: {logModalMonitor.name}
								</h3>
								<p className="text-xs text-slate-400 break-all">{logModalMonitor.url}</p>
							</div>
							<button
								onClick={() => setLogModalMonitor(null)}
								className="self-start inline-flex items-center rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 px-3 py-1.5 border border-slate-600 transition"
							>
								Bezárás
							</button>
						</div>

						<div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
							<label className="flex items-center gap-2">
								<span>Megjelenített sorok száma:</span>
								<input
									type="number"
									value={logsLimit}
									min={10}
									max={1000}
									onChange={e => setLogsLimit(Number(e.target.value) || 10)}
									className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-ktsRed"
								/>
							</label>
							<button
								onClick={reloadLogs}
								disabled={logsLoading}
								className="inline-flex items-center rounded-full bg-ktsRed hover:bg-ktsLightRed disabled:opacity-60 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition"
							>
								{logsLoading ? 'Betöltés…' : 'Naplók újratöltése'}
							</button>
						</div>

						{logsLoading ? (
							<p className="text-sm text-slate-300">Betöltés…</p>
						) : logs.length === 0 ? (
							<p className="text-sm text-slate-300">Még nincsenek naplóbejegyzések.</p>
						) : (
							<div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/70">
								<table className="min-w-full text-xs">
									<thead className="bg-slate-900/90 text-slate-300 uppercase tracking-wide text-[11px]">
										<tr>
											<th className="px-3 py-2 text-left">Időpont</th>
											<th className="px-3 py-2">HTTP</th>
											<th className="px-3 py-2">Válaszidő (ms)</th>
											<th className="px-3 py-2 text-left">Hibaüzenet</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-800/80">
										{logs.map(log => (
											<tr key={log.id} className="hover:bg-slate-800/60">
												<td className="px-3 py-1.5 whitespace-nowrap">
													{new Date(log.checked_at || log.created_at).toLocaleString()}
												</td>
												<td className="px-3 py-1.5 text-center">{log.status_code ?? '-'}</td>
												<td className="px-3 py-1.5 text-center">{log.response_time_ms ?? '-'}</td>
												<td className="px-3 py-1.5 text-left text-xs" style={{ color: log.error_message ? '#f87171' : undefined }}>
													{log.error_message ?? ''}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

