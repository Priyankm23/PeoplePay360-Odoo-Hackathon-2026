import { useState } from 'react';
import {
  Users,
  Building2,
  CalendarClock,
  FileText,
  CalendarCheck,
  Briefcase,
  Wallet,
  LayoutDashboard,
  Receipt,
  Settings2,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import type { View, UserSession, UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  current: View;
  onNavigate: (view: View, id?: string) => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  view: View;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultOpen?: boolean;
}

function getNavItems(role?: UserRole): (NavItem | NavGroup)[] {
  // Role: Employee
  // Per Problem Statement & ia (2).md §1:
  // Employees ▾ collapses to just single "My Profile", no dropdown.
  // Attendance and Time Off are self-scoped, Payslips self-scoped without Payroll dropdown.
  if (role === 'Employee') {
    return [
      { label: 'My Profile', icon: Users, view: 'employee-detail' },
      { label: 'My Attendance', icon: CalendarCheck, view: 'attendance' },
      { label: 'My Time Off', icon: Briefcase, view: 'time-off-requests' },
      { label: 'My Payslips', icon: FileText, view: 'payslips' },
    ];
  }

  const items: (NavItem | NavGroup)[] = [
    { label: 'Dashboard', icon: LayoutDashboard, view: 'payroll-dashboard' },
    {
      label: 'Employees',
      icon: Users,
      defaultOpen: true,
      items: [
        { label: 'Employees', icon: Users, view: 'employees' },
        { label: 'Departments', icon: Building2, view: 'departments' },
        { label: 'Job Positions', icon: Briefcase, view: 'job-positions' },
        { label: 'Working Schedules', icon: CalendarClock, view: 'working-schedules' },
      ],
    },
    { label: 'Contracts', icon: FileText, view: 'contracts' },
    { label: 'Attendance', icon: CalendarCheck, view: 'attendance' },
    {
      label: 'Time Off',
      icon: Briefcase,
      items: [
        { label: 'Requests', icon: Briefcase, view: 'time-off-requests' },
        { label: 'Allocations', icon: Briefcase, view: 'time-off-allocations' },
        { label: 'Types', icon: Briefcase, view: 'time-off-types' },
      ],
    },
  ];

  // HR Manager has NO payroll execution/config access per PDF §3 & ia (2).md §1
  if (role !== 'HR Manager') {
    items.push({
      label: 'Payroll',
      icon: Wallet,
      defaultOpen: true,
      items: [
        { label: 'Payruns', icon: Receipt, view: 'payruns' },
        { label: 'Payslips', icon: FileText, view: 'payslips' },
        { label: 'Salary Structures', icon: Settings2, view: 'salary-structures' },
        { label: 'Salary Rules', icon: Calculator, view: 'salary-rules' },
      ],
    });
  }

  return items;
}

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'items' in item;
}

export function Sidebar({ current, onNavigate, userSession, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = getNavItems(userSession?.role);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Employees: true,
    Payroll: true,
  });

  const isActive = (view: View) => {
    if (view === 'employee-detail' && current === 'employee-detail') return true;
    if (view === 'payrun-detail' && current === 'payrun-detail') return true;
    if (view === 'payslip-detail' && current === 'payslip-detail') return true;
    return view === current;
  };

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.view));

  const handleItemClick = (view: View) => {
    if (view === 'employee-detail' && userSession?.role === 'Employee' && userSession.employeeId) {
      onNavigate('employee-detail', userSession.employeeId);
    } else {
      onNavigate(view);
    }
  };

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col shrink-0 transition-all duration-200',
        'bg-sidebar-gradient border-r border-sidebar-border',
        collapsed ? 'w-16' : 'w-56'
      )}
      style={{ background: 'linear-gradient(180deg, #1A2E24 0%, #152618 100%)' }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-sm-md bg-ink-900 flex items-center justify-center shrink-0">
          <CircleDollarSign size={18} className="text-chartreuse-300" />
        </div>
        {!collapsed && (
          <div className="leading-none">
            <div className="text-sm font-bold text-sidebar-textStrong tracking-tight">PeoplePay<span className="text-chartreuse-300">360</span></div>
            <div className="text-[10px] text-sidebar-textMuted mt-0.5 tracking-wide uppercase font-medium">HR & Payroll</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          if (isGroup(item)) {
            const open = openGroups[item.label];
            const active = isGroupActive(item);
            const Icon = item.icon;
            return (
              <div key={item.label} className="mb-0.5">
                <button
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      return;
                    }

                    setOpenGroups((prev) => ({
                      ...prev,
                      [item.label]: !prev[item.label],
                    }));
                  }}
                  onMouseEnter={() => collapsed && setCollapsed(false)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm-md text-sm transition-colors',
                    active
                      ? 'text-sidebar-textStrong'
                      : 'text-white/80 hover:text-white hover:bg-sidebar-hover'
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                </button>
                {!collapsed && open && (
                  <div className="mt-0.5 mb-1">
                    {item.items.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = isActive(sub.view);
                      return (
                        <button
                          key={sub.view}
                          onClick={() => handleItemClick(sub.view)}
                          className={cn(
                            'w-full flex items-center gap-2.5 pl-7 pr-2.5 py-1.5 rounded-sm-md text-sm transition-colors relative',
                            active
                              ? 'bg-sidebar-active text-sidebar-textStrong font-semibold'
                              : 'text-white/80 hover:text-white hover:bg-sidebar-hover'
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold-400 rounded-r-full" />
                          )}
                          <SubIcon size={14} className="shrink-0 opacity-70" />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const active = isActive(item.view);
          return (
            <button
              key={item.label}
              onClick={() => handleItemClick(item.view)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm-md text-sm transition-colors relative mb-0.5',
                active
                  ? 'bg-sidebar-active text-sidebar-textStrong font-semibold'
                  : 'text-white/80 hover:text-white hover:bg-sidebar-hover'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold-400 rounded-r-full" />
              )}
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      {userSession && (
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-sm-md bg-sidebar-hover', collapsed && 'justify-center px-0')}>
            <div className="w-7 h-7 rounded-full bg-ink-900 text-chartreuse-300 font-bold text-[11px] flex items-center justify-center shrink-0">
              {userSession.name.charAt(0)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-sidebar-textStrong truncate">{userSession.name}</div>
                <div className="text-[10px] text-sidebar-textMuted truncate">{userSession.role}</div>
              </div>
            )}
            {onLogout && !collapsed && (
              <button
                onClick={onLogout}
                title="Log Out to Landing"
                className="p-1 rounded text-sidebar-textMuted hover:text-red-300 hover:bg-red-900/30 transition-colors ml-auto"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-sm-md text-xs text-white/60 hover:text-white hover:bg-sidebar-hover transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronDown size={14} /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
