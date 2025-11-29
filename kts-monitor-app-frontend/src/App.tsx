import React from 'react';
import { AuthProvider, useAuth } from './auth.tsx';
import { LoginPage } from './LoginPage.tsx';
import { MonitorPage } from './MonitorPage.tsx';

const AppInner: React.FC = () => {
	const { user, loading } = useAuth();

	if (loading) return <p>Betöltés…</p>;

	if (!user) {
		return <LoginPage onLoggedIn={() => {}} />;
	}

	return <MonitorPage />;
};

const App: React.FC = () => (
	<AuthProvider>
		<AppInner />
	</AuthProvider>
);

export default App;

