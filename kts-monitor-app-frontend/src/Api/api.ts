const API_BASE = 'http://127.0.0.1:8000/api';

let authToken: string | null = localStorage.getItem('authToken');

export function setAuthToken(token: string | null) {
	authToken = token;
	if (token) {
		localStorage.setItem('authToken', token);
	} else {
		localStorage.removeItem('authToken');
	}
}

async function apiFetch(path: string, options: RequestInit = {}) {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string> | undefined),
	};

	if (authToken) {
		headers['Authorization'] = `Bearer ${authToken}`;
	}

	const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

	if (res.status === 401) {
		throw new Error('UNAUTHENTICATED');
	}

	const text = await res.text();
	const data = text ? JSON.parse(text) : null;

	if (!res.ok) {
		const message = (data && data.message) || res.statusText;
		const err: any = new Error(message);
		err.status = res.status;
		err.data = data;
		throw err;
	}

	return data;
}

export async function login(email: string, password: string) {
	return apiFetch('/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	});
}

export async function fetchMe() {
	return apiFetch('/me');
}

export async function fetchSites() {
	return apiFetch('/sites');
}

export async function createSite(payload: { url: string; name?: string }) {
	return apiFetch('/sites', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export async function deleteSite(id: number) {
	return apiFetch(`/sites/${id}`, {
		method: 'DELETE',
	});
}

export async function updateSite(id: number, payload: { url?: string; name?: string | null; is_active?: boolean }) {
	return apiFetch(`/sites/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	});
}

export async function checkAllSites() {
	return apiFetch('/sites/check-all', {
		method: 'POST',
	});
}

export async function checkOneSite(id: number) {
	return apiFetch(`/sites/${id}/check`, {
		method: 'POST',
	});
}

export async function checkAllSitesLight() {
	return apiFetch('/sites/check-all-light', {
		method: 'POST',
	});
}

export async function checkOneSiteLight(id: number) {
	return apiFetch(`/sites/${id}/check-light`, {
		method: 'POST',
	});
}

export async function fetchSiteLogs(id: number, limit = 50) {
	return apiFetch(`/sites/${id}/logs?limit=${limit}`);
}

export async function deleteSiteLogs(id: number) {
	return apiFetch(`/sites/${id}/logs`, {
		method: 'DELETE',
	});
}

export async function getMonitorInterval() {
	return apiFetch('/settings/monitor-interval');
}

export async function setMonitorInterval(minutes: number) {
	return apiFetch('/settings/monitor-interval', {
		method: 'POST',
		body: JSON.stringify({ interval_minutes: minutes }),
	});
}

export async function getLightMonitorInterval(): Promise<{ interval_minutes: number }> {
	return apiFetch('/settings/monitor-interval-light');
}

export async function setLightMonitorInterval(interval_minutes: number) {
	return apiFetch('/settings/monitor-interval-light', {
		method: 'POST',
		body: JSON.stringify({ interval_minutes }),
	});
}

export async function getLogRetentionDays(): Promise<{ retention_days: number }> {
	return apiFetch('/settings/log-retention');
}

export async function setLogRetentionDays(retention_days: number) {
	return apiFetch('/settings/log-retention', {
		method: 'POST',
		body: JSON.stringify({ retention_days }),
	});
}

export async function deleteAllLogs() {
	return apiFetch('/logs', {
		method: 'DELETE',
	});
}