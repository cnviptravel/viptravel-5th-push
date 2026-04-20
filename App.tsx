import React, { useState, useEffect, useRef } from 'react'; 
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthState, User, UserRole } from './types';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Services from './pages/Services';
import Live from './pages/Live';
import CreatePost from './pages/CreatePost';
import PublicProfile from './pages/PublicProfile';
import ChatList from './pages/ChatList';
import ChatDetail from './pages/ChatDetail';
import Translator from './pages/Translator';
import AdminPanel from './pages/AdminPanel';
import { LanguageProvider } from './contexts/LanguageContext';
import { apiLogout } from './services/api';
import { AppConfigProvider } from './contexts/AppConfigContext';
import { MapProvider } from './contexts/MapContext';
import { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
import { CallProvider } from './contexts/CallContext';

const API_URL = import.meta.env.VITE_API_URL || "https://viptravel-backend.erdneebatulzii23.workers.dev";

export const AuthContext = React.createContext<{
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  logout: () => void;
}>({
  auth: { user: null, isAuthenticated: false, isLoading: true },
  setAuth: () => {},
  logout: () => {},
});

const BUILD_VERSION = "v11.3-20260220";
console.log(`[VipTravel] Build: ${BUILD_VERSION}`);

import { useLanguage } from './contexts/LanguageContext';

// PersistentServices — Services хуудсыг хэзээ ч unmount хийхгүй, зөвхөн CSS-ээр нуух/харуулах
const PersistentServices: React.FC = () => {
  const location = useLocation();
  const isVisible = location.pathname === '/services';

  return (
    <div
      style={{
        display: isVisible ? 'block' : 'none',
        position: isVisible ? 'relative' : 'absolute',
        width: '100%',
        height: isVisible ? '100%' : '0',
        overflow: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
        zIndex: isVisible ? 1 : -1,
      }}
    >
      <Services />
    </div>
  );
};

const AppContent: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('cj_travel_current_user');
    if (storedUser) {
      setAuth({
        user: JSON.parse(storedUser),
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const logout = async () => {
    if (auth.user) {
      await apiLogout(auth.user._id);
    }
    localStorage.removeItem('cj_travel_current_user');
    setAuth({ user: null, isAuthenticated: false, isLoading: false });
  };

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      <CallProvider>
        <Router>
          <Layout>
            {/* Services — хэзээ ч unmount болохгүй, зөвхөн нуугдана */}
            {auth.isAuthenticated && <PersistentServices />}

            <Routes>
              {/* Landing page for unauthenticated users, Feed for authenticated */}
              <Route path="/" element={auth.isAuthenticated ? <Feed /> : <Landing />} />
              
              <Route path="/login" element={!auth.isAuthenticated ? <Login /> : <Navigate to="/" />} />
              <Route path="/role-select" element={!auth.isAuthenticated ? <RoleSelection /> : <Navigate to="/" />} />
              <Route path="/register/:role" element={!auth.isAuthenticated ? <Register /> : <Navigate to="/" />} />
              
              <Route path="/create" element={auth.isAuthenticated ? <CreatePost /> : <Navigate to="/" />} />
              <Route path="/profile" element={auth.isAuthenticated ? <Profile /> : <Navigate to="/" />} />
              <Route path="/profile/:userId" element={auth.isAuthenticated ? <PublicProfile /> : <Navigate to="/" />} />
              {/* /services route-г Routes-аас устгах — PersistentServices үүнийг орлоно */}
              <Route path="/services" element={auth.isAuthenticated ? null : <Navigate to="/" />} />
              <Route path="/live" element={auth.isAuthenticated ? <Live /> : <Navigate to="/" />} />
              
              <Route path="/chats" element={auth.isAuthenticated ? <ChatList /> : <Navigate to="/" />} />
              <Route path="/chat/:userId" element={auth.isAuthenticated ? <ChatDetail /> : <Navigate to="/" />} />
              
              <Route path="/translator" element={auth.isAuthenticated ? <Translator /> : <Navigate to="/" />} />
              
              <Route path="/admin" element={auth.isAuthenticated && (auth.user?.role === UserRole.Admin || auth.user?.isAdmin) ? <AdminPanel /> : <Navigate to="/" />} />
              
              <Route path="/resorts" element={<Navigate to="/services" />} />
              <Route path="/providers" element={<Navigate to="/services" />} />
              <Route path="/guides" element={<Navigate to="/services" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </Router>
      </CallProvider>
    </AuthContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppConfigProvider>
        <MapProvider>
          <SnackbarProvider>
            <AppContent />
          </SnackbarProvider>
        </MapProvider>
      </AppConfigProvider>
    </LanguageProvider>
  );
};

export default App;
