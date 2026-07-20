import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from '../components/LandingPage';
import AuthPages from '../components/AuthPages';
import SecurityPortal from '../components/SecurityPortal';
import AdminDashboard from '../components/AdminDashboard';
import ResetPasswordPage from '../components/ResetPasswordPage';
import useAuthStore from '../store/useAuthStore';
import { fetchAdminUsers, fetchAdminLogs } from '../api/auth';

export default function AppRoutes() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const setSessionToken = useAuthStore((state) => state.setSessionToken);
  const users = useAuthStore((state) => state.users);
  const setUsers = useAuthStore((state) => state.setUsers);
  const logs = useAuthStore((state) => state.logs);
  const setLogs = useAuthStore((state) => state.setLogs);
  const addLog = useAuthStore((state) => state.addLog);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const refreshUsers = async () => {
    const response = await fetchAdminUsers();
    setUsers(response.data.users);
  };

  const refreshLogs = async () => {
    const response = await fetchAdminLogs();
    setLogs(response.data.logs);
  };

  const routeNavigate = (view: 'landing' | 'login' | 'register' | 'dashboard' | 'admin') =>
    view === 'landing' ? '/' : `/${view}`;

  return (
    <Routes>
      <Route path="/" element={<LandingPage onNavigate={(view) => handleNavigate(routeNavigate(view))} />} />
      <Route
        path="/login"
        element={
          <AuthPages
            authMode="login"
            onNavigate={(view) => handleNavigate(routeNavigate(view))}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            setSessionToken={setSessionToken}
            users={users}
            setUsers={setUsers}
            addLog={addLog}
          />
        }
      />
      <Route
        path="/register"
        element={
          <AuthPages
            authMode="register"
            onNavigate={(view) => handleNavigate(routeNavigate(view))}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            setSessionToken={setSessionToken}
            users={users}
            setUsers={setUsers}
            addLog={addLog}
          />
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          currentUser ? (
            <SecurityPortal
              onNavigate={(view) => handleNavigate(routeNavigate(view))}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              setSessionToken={setSessionToken}
              logs={logs}
              setLogs={setLogs}
              addLog={addLog}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin"
        element={
          currentUser?.role === 'Admin' ? (
            <AdminDashboard
              onNavigate={(view) => handleNavigate(routeNavigate(view))}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              setSessionToken={setSessionToken}
              users={users}
              setUsers={setUsers}
              logs={logs}
              setLogs={setLogs}
              refreshUsers={refreshUsers}
              refreshLogs={refreshLogs}
              addLog={addLog}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
