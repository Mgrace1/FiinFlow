import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  companyId: string | null;
  setAuth: (token: string, companyId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('finflow_token');
      const savedCompanyId = localStorage.getItem('finflow_companyId');
      if (savedToken && savedCompanyId) {
        setToken(savedToken);
        setCompanyId(savedCompanyId);
      }
    } catch {
      // Ignore localStorage parsing/access errors and continue unauthenticated.
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuth = (newToken: string, newCompanyId: string) => {
    setToken(newToken);
    setCompanyId(newCompanyId);
    localStorage.setItem('finflow_token', newToken);
    localStorage.setItem('finflow_companyId', newCompanyId);
  };

  const logout = () => {
    setToken(null);
    setCompanyId(null);
    localStorage.removeItem('finflow_token');
    localStorage.removeItem('finflow_companyId');
    localStorage.removeItem('finflow_user');
    localStorage.removeItem('finflow_company');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        companyId,
        setAuth,
        logout,
        isAuthenticated: !!token && !!companyId,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () =>{
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
