import React from 'react';
import { AuthProvider, useAuth } from './Auth/auth.tsx';
import { LoginPage } from './LoginPage/LoginPage.tsx';
import { MonitorPage } from './MonitorPage/MonitorPage.tsx';
import { ClipLoader } from 'react-spinners'; // You can choose other loaders like BeatLoader, PulseLoader

const AppInner: React.FC = () => {
	const { user, loading } = useAuth();

	if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                width: '100vw' 
            }}>
                <ClipLoader color="#36d7b7" size={50} />
            </div>
        );
    }

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

