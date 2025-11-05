import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import NotesAndTodo from './pages/NotesAndTodo';
import DebtManagement from './pages/DebtManagement';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';
import { useEffect } from 'react';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // If no user and trying to access private route, redirect to login
  // but save the intended destination
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  const { currentUser, isOnline } = useAuth();
  const location = useLocation();

  // Handle navigation when coming back online
  useEffect(() => {
    if (isOnline && currentUser && location.pathname === '/') {
      // If user is authenticated and online, ensure they're on a valid route
      // This helps prevent 404 issues after coming back online
    }
  }, [isOnline, currentUser, location]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <PrivateRoute>
            <Transactions />
          </PrivateRoute>
        }
      />
      <Route
        path="/notes-todo"
        element={
          <PrivateRoute>
            <NotesAndTodo />
          </PrivateRoute>
        }
      />
      <Route
        path="/debts"
        element={
          <PrivateRoute>
            <DebtManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <PrivateRoute>
            <Budgets />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
