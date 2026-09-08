import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, loginRequest, logoutRequest, fetchCurrentUser } from '../services/auth.service';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hrms_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('hrms_token');
        localStorage.removeItem('hrms_user');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const { token, user: loggedInUser } = await loginRequest(username, password);
    localStorage.setItem('hrms_token', token);
    localStorage.setItem('hrms_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_user');
      setUser(null);
    }
  }

  function can(permissionKey: string) {
    return user?.permissions.includes(permissionKey) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
