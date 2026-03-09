import React from 'react';

export type BadgeVariant =
  | 'paid'
  | 'sent'
  | 'overdue'
  | 'draft'
  | 'cancelled'
  | 'pending'
  | 'transport'
  | 'office'
  | 'marketing'
  | 'utilities'
  | 'salaries'
  | 'other'
  | 'admin'
  | 'super_admin'
  | 'finance_manager'
  | 'staff'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'default';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  icon?: string;
  className?: string;
}

const Badge: React.FC<BadgeProps>= ({ variant, children, icon, className = '' }) =>{
  const getVariantClasses = (): string =>{
    const baseClasses = 'inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full';

    const variantMap: Record<BadgeVariant, string>= {
      // Invoice statuses
      paid: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-200 text-gray-600',
      pending: 'bg-yellow-100 text-yellow-800',

      // Expense categories
      transport: 'bg-blue-100 text-blue-800',
      office: 'bg-purple-100 text-purple-800',
      marketing: 'bg-pink-100 text-pink-800',
      utilities: 'bg-yellow-100 text-yellow-800',
      salaries: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',

      // User roles
      super_admin: 'bg-black text-white',
      admin: 'bg-purple-100 text-purple-800',
      finance_manager: 'bg-blue-100 text-blue-800',
      staff: 'bg-gray-100 text-gray-800',

      // Generic variants
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      default: 'bg-gray-100 text-gray-800',
    };

    return `${baseClasses} ${variantMap[variant] || variantMap.default}`;
  };

  return (
  <span className={`${getVariantClasses()} ${className}`}>
      {icon && <span>{icon}</span>}
      {children}
  </span>
  );
};

export default Badge;
