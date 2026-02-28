import { useState, useEffect } from 'react';

export const useRole = () =>{
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() =>{
    // Get role from localStorage or token
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    setRole(user.role || null);
    setLoading(false);
  }, []);

  const isAdmin = role === 'admin';
  const isFinanceManager = role === 'finance_manager';
  const isStaff = role === 'staff';
  const canManageUsers = isAdmin;
  const canManageFinances = isAdmin || isFinanceManager;

  return { role, isAdmin, isFinanceManager, isStaff, canManageUsers, canManageFinances, loading };
};
