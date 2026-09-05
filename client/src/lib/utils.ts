export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatRole(role?: string | null): string {
  if (!role) return '';
  const map: Record<string, string> = {
    ADMIN: 'System Admin',
    HR_MANAGER: 'HR Manager',
    HR_PAYROLL_MANAGER: 'HR Payroll Manager',
    HR_PAYROLL_USER: 'HR Payroll User',
    EMPLOYEE: 'Employee',
  };
  return map[role] || role.replace(/_/g, ' ');
}
