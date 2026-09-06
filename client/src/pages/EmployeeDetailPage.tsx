import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  CreditCard,
  ShieldCheck,
  Pencil,
  Trash2,
  ExternalLink,
  Clock,
  Plus,
  FileText,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { api } from '@/lib/api';
import { formatCurrency } from '@/data';
import type { View, UserSession } from '@/types';
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid';
import { cn, formatRole } from '@/lib/utils';

interface EmployeeDetailPageProps {
  employeeId: string;
  onNavigate: (view: View, id?: string) => void;
  userSession?: UserSession | null;
}

interface EmployeeDetailRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  bankAccount?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  profileImageUrl?: string | null;
  createdAt: string;
  departmentId?: string | null;
  jobPositionId?: string | null;
  managerId?: string | null;
  workingScheduleId?: string | null;
  department?: { id: string; name: string } | null;
  jobPosition?: { id: string; title: string } | null;
  workingSchedule?: {
    id: string;
    name: string;
    type: string;
    lines?: Array<{
      day: string;
      startTime: string;
      endTime: string;
      breakMinutes: number;
    }>;
  } | null;
  manager?: { id: string; firstName: string; lastName: string; email?: string; profileImageUrl?: string | null } | null;
  user?: { id: string; role: string } | null;
  counts: {
    contracts: number;
    attendance: number;
    timeOffRequests: number;
    timeOffAllocations: number;
  };
  activeContract?: {
    id: string;
    reference?: string;
    wage: number;
    startDate: string;
    endDate: string | null;
    status: string;
    salaryStructure?: { id: string; name: string };
  } | null;
}

export function EmployeeDetailPage({ employeeId, onNavigate, userSession }: EmployeeDetailPageProps) {
  const [employee, setEmployee] = useState<EmployeeDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RBAC permissions - all managerial roles can manage employee schedules
  const isSelf = userSession?.role === 'Employee';
  const roleStr = (userSession?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canManage =
    roleStr === 'ADMIN' ||
    roleStr === 'HR_MANAGER' ||
    roleStr === 'HR_PAYROLL_MANAGER' ||
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Manager' ||
    userSession?.role === 'HR Payroll Manager';

  // Dedicated Change Working Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [scheduleUpdateError, setScheduleUpdateError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editPosId, setEditPosId] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editScheduleId, setEditScheduleId] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [overviewMode, setOverviewMode] = useState<'bento' | 'compact'>('bento');

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Lookups for Edit Form & Schedule Modal
  const [deptList, setDeptList] = useState<Array<{ id: string; name: string }>>([]);
  const [posList, setPosList] = useState<Array<{ id: string; title: string; departmentId: string | null }>>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [scheduleList, setScheduleList] = useState<Array<{ id: string; name: string; type: string; daysPerWeek?: number; weeklyHours?: number }>>([]);

  const loadEmployee = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.employees.getById(employeeId);
      setEmployee(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const openScheduleModal = async () => {
    if (!employee) return;
    setSelectedScheduleId(employee.workingSchedule?.id || '');
    setScheduleUpdateError(null);
    setIsScheduleModalOpen(true);

    try {
      const scheds = await api.workingSchedules.getAll();
      setScheduleList(Array.isArray(scheds) ? scheds : []);
    } catch {
      // Ignore lookup loading error
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setIsUpdatingSchedule(true);
    setScheduleUpdateError(null);

    try {
      await api.employees.update(employee.id, {
        workingScheduleId: selectedScheduleId || null,
      });
      setIsScheduleModalOpen(false);
      await loadEmployee();
    } catch (err: any) {
      setScheduleUpdateError(err.message || 'Failed to update working schedule');
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const openEditModal = async () => {
    if (!employee) return;
    setEditFirstName(employee.firstName);
    setEditLastName(employee.lastName);
    setEditPhone(employee.phone || '');
    setEditBankAccount(employee.bankAccount || '');
    setEditDeptId(employee.department?.id || '');
    setEditPosId(employee.jobPosition?.id || '');
    setEditManagerId(employee.manager?.id || '');
    setEditScheduleId(employee.workingSchedule?.id || '');
    setEditStatus(employee.status);
    setUpdateError(null);
    setIsEditModalOpen(true);

    try {
      const [depts, poses, emps, scheds] = await Promise.all([
        api.departments.getAll(),
        api.jobPositions.getAll(),
        api.employees.getAll(),
        api.workingSchedules.getAll(),
      ]);
      setDeptList(depts || []);
      setPosList(poses || []);
      const empItems = emps?.items || emps || [];
      setAllEmployees(Array.isArray(empItems) ? empItems.filter((e: any) => e.id !== employee.id) : []);
      setScheduleList(Array.isArray(scheds) ? scheds : []);
    } catch {
      // Ignore lookup loading error
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setIsUpdating(true);
    setUpdateError(null);

    try {
      await api.employees.update(employee.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || null,
        bankAccount: editBankAccount.trim() || null,
        departmentId: editDeptId || null,
        jobPositionId: editPosId || null,
        managerId: editManagerId || null,
        workingScheduleId: editScheduleId || null,
        status: editStatus,
      });

      setIsEditModalOpen(false);
      await loadEmployee();
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update employee details');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveEmployee = async () => {
    if (!employee) return;
    setIsArchiving(true);
    setArchiveError(null);

    try {
      await api.employees.delete(employee.id);
      setIsArchiveModalOpen(false);
      onNavigate('employees');
    } catch (err: any) {
      setArchiveError(err.message || 'Failed to archive employee');
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-ink-600">Loading live employee profile...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{error || 'Employee not found.'}</p>
        {!isSelf && (
          <button
            onClick={() => onNavigate('employees')}
            className="text-emerald-700 underline text-sm mt-3 hover:text-emerald-900"
          >
            Back to Employees
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {isSelf ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                Personal Profile
              </span>
              <span className="text-xs text-ink-500">Your account overview and assigned operational metrics</span>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('employees')}
              className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
            >
              <ArrowLeft size={15} />
              Back to Employees Directory
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Bento / Compact View Toggle */}
          <div className="flex items-center gap-1 bg-paper p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setOverviewMode('bento')}
              className={cn(
                'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                overviewMode === 'bento'
                  ? 'bg-surface text-ink-900 shadow-2xs font-semibold'
                  : 'text-ink-500 hover:text-ink-900'
              )}
            >
              Bento View
            </button>
            <button
              type="button"
              onClick={() => setOverviewMode('compact')}
              className={cn(
                'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                overviewMode === 'compact'
                  ? 'bg-surface text-ink-900 shadow-2xs font-semibold'
                  : 'text-ink-500 hover:text-ink-900'
              )}
            >
              Compact Metrics
            </button>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openEditModal}>
                <Pencil size={13} />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsArchiveModalOpen(true);
                  setArchiveError(null);
                }}
                className="text-status-danger hover:border-status-danger"
              >
                <Trash2 size={13} />
                Archive
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Bento-styled Profile Card */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-white p-6 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] hover:border-emerald-500/40 transition-all space-y-5">
            {/* Top-Right Ambient Background Graphic (Bento Signature) */}
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=500&q=80"
              alt="Office ambient"
              className="absolute -right-8 -top-8 w-44 h-36 object-cover rounded-xl opacity-15 filter grayscale group-hover:grayscale-0 group-hover:opacity-30 transition-all duration-300 pointer-events-none"
            />

            {/* Profile Avatar & Header */}
            <div className="relative z-10 flex flex-col items-center text-center pt-1">
              <Avatar
                firstName={employee.firstName}
                lastName={employee.lastName}
                color="bg-emerald-600"
                imageUrl={employee.profileImageUrl}
                onClick={employee.profileImageUrl ? () => window.open(employee.profileImageUrl || '', '_blank', 'noopener,noreferrer') : undefined}
                size="lg"
                className="ring-4 ring-emerald-100/80 shadow-sm transform-gpu transition-all duration-300 group-hover:scale-105"
              />
              <h2 className="text-xl font-bold mt-3.5 text-ink-900 tracking-tight">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-xs font-semibold text-ink-500 mt-0.5">
                {employee.jobPosition?.title || 'Team Member'}
              </p>
              {/* Prominent High-Visibility Status Badge */}
              <div className="mt-3">
                {employee.status === 'ACTIVE' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Employee
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Profile Info Attributes */}
            <div className="relative z-10 pt-4 border-t border-border-soft space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs">
                <Briefcase size={14} className="text-ink-400 shrink-0" />
                <span className="text-ink-500">Department</span>
                <span className="ml-auto text-ink-900 font-semibold">
                  {employee.department?.name || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <Mail size={14} className="text-ink-400 shrink-0" />
                <span className="text-ink-500">Email</span>
                <span className="ml-auto text-ink-900 text-xs truncate max-w-[150px] font-medium" title={employee.email}>
                  {employee.email}
                </span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone size={14} className="text-ink-400 shrink-0" />
                  <span className="text-ink-500">Phone</span>
                  <span className="ml-auto text-ink-900 font-medium tnum">{employee.phone}</span>
                </div>
              )}
              {employee.bankAccount && (
                <div className="flex items-center gap-2.5 text-xs">
                  <CreditCard size={14} className="text-ink-400 shrink-0" />
                  <span className="text-ink-500">Bank</span>
                  <span className="ml-auto text-ink-900 font-mono text-[11px] truncate max-w-[130px]" title={employee.bankAccount}>
                    {employee.bankAccount}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-xs">
                <Calendar size={14} className="text-ink-400 shrink-0" />
                <span className="text-ink-500">Joined</span>
                <span className="ml-auto text-ink-900 font-medium tnum">
                  {new Date(employee.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* System Access Role Indicator */}
            <div className="relative z-10 pt-3.5 border-t border-border-soft">
              <div className="text-[11px] text-ink-500 mb-1.5 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span className="font-semibold uppercase tracking-wider text-[10px]">System Access</span>
              </div>
              {employee.user ? (
                <div className="px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-200/80 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                  <span>Role: {formatRole(employee.user.role)}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg bg-paper text-ink-400 text-xs">
                  No login account
                </div>
              )}
            </div>

            {/* Reports To */}
            {employee.manager && (
              <div className="relative z-10 pt-3.5 border-t border-border-soft">
                <div className="text-[10px] uppercase font-bold tracking-wider text-ink-400 mb-2">Reports To</div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-paper/70 border border-border-soft hover:border-emerald-300 transition-colors">
                  <Avatar
                    firstName={employee.manager.firstName}
                    lastName={employee.manager.lastName}
                    color="#059669"
                    imageUrl={employee.manager.profileImageUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink-900 truncate">
                      {employee.manager.firstName} {employee.manager.lastName}
                    </div>
                    {employee.manager.email && (
                      <div className="text-[11px] text-ink-400 truncate">{employee.manager.email}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Working Schedule */}
            <div className="relative z-10 pt-3.5 border-t border-border-soft">
              <div className="text-xs text-ink-500 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-400">Working Schedule</span>
                <div className="flex items-center gap-1.5">
                  {employee.workingSchedule && (
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                      {employee.workingSchedule.type === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'}
                    </span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={openScheduleModal}
                      className="text-[11px] text-brand-600 hover:text-brand-700 font-medium hover:underline flex items-center gap-0.5"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs font-bold text-ink-900">
                {employee.workingSchedule?.name || 'No schedule assigned'}
              </div>
              {employee.workingSchedule?.lines && (
                <div className="text-[11px] text-ink-400 mt-0.5">
                  {employee.workingSchedule.lines.length} scheduled days / week
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.02]" />
          </div>
        </div>

        {/* Main column - Smart-Button Counts & Active Contract */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Smart-Button Bento Grid / Operational Metrics */}
          <div>
            {overviewMode === 'bento' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BentoCard
                  name="Employment Contract"
                  className="h-[14rem]"
                  Icon={FileText}
                  description={
                    employee.activeContract
                      ? `Active reference: ${employee.activeContract.reference || 'Standard'} • Monthly Wage: ${formatCurrency(employee.activeContract.wage)} • Package: ${employee.activeContract.salaryStructure?.name || 'Standard Package'}.`
                      : `No active running contract on file. Total contracts: ${employee.counts?.contracts ?? 0}.`
                  }
                  background={
                    <img
                      src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80"
                      alt="Contracts"
                      className="absolute -right-8 -top-8 w-60 h-44 object-cover rounded-xl opacity-20 filter grayscale group-hover:grayscale-0 group-hover:opacity-35 transition-all duration-300"
                    />
                  }
                />
                <BentoCard
                  name="Attendance Logs"
                  className="h-[14rem]"
                  Icon={Clock}
                  description={`${employee.counts?.attendance ?? 0} total attendance punch logs. Review daily check-ins, check-outs, missing punches, and overtime hours.`}
                  cta="View Attendance"
                  onClick={() => onNavigate('attendance', employee.id)}
                  background={
                    <img
                      src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80"
                      alt="Attendance punch history"
                      className="absolute -right-8 -top-8 w-60 h-44 object-cover rounded-xl opacity-20 filter grayscale group-hover:grayscale-0 group-hover:opacity-35 transition-all duration-300"
                    />
                  }
                />
                <BentoCard
                  name="Time Off Requests"
                  className="h-[14rem]"
                  Icon={Calendar}
                  description={`${employee.counts?.timeOffRequests ?? 0} leave request(s) submitted. Track approved, pending, and rejected leave history.`}
                  cta="Review Leaves"
                  onClick={() => onNavigate('time-off-requests', employee.id)}
                  background={
                    <img
                      src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80"
                      alt="Time off calendar"
                      className="absolute -right-8 -top-8 w-60 h-44 object-cover rounded-xl opacity-20 filter grayscale group-hover:grayscale-0 group-hover:opacity-35 transition-all duration-300"
                    />
                  }
                />
                <BentoCard
                  name="Leave Allocations"
                  className="h-[14rem]"
                  Icon={CreditCard}
                  description={`${employee.counts?.timeOffAllocations ?? 0} active leave pool allocation(s). Manage annual vacation and paid sick allowances.`}
                  cta="View Allocations"
                  onClick={() => onNavigate('time-off-allocations', employee.id)}
                  background={
                    <img
                      src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80"
                      alt="Leave balances"
                      className="absolute -right-8 -top-8 w-60 h-44 object-cover rounded-xl opacity-20 filter grayscale group-hover:grayscale-0 group-hover:opacity-35 transition-all duration-300"
                    />
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Attendance',
                    count: employee.counts?.attendance ?? 0,
                    color: 'text-emerald-700',
                    available: true,
                    targetView: 'attendance' as const,
                  },
                  {
                    label: 'Leave Requests',
                    count: employee.counts?.timeOffRequests ?? 0,
                    color: 'text-emerald-700',
                    available: true,
                    targetView: 'time-off-requests' as const,
                  },
                  {
                    label: 'Leave Allocations',
                    count: employee.counts?.timeOffAllocations ?? 0,
                    color: 'text-emerald-700',
                    available: true,
                    targetView: 'time-off-allocations' as const,
                  },
                  {
                    label: 'Contracts',
                    count: employee.counts?.contracts ?? 0,
                    color: 'text-emerald-700',
                    available: true,
                    targetView: 'contracts' as const,
                  },
                ].map((tile) => (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={() => tile.available && onNavigate(tile.targetView, employee.id)}
                    disabled={!tile.available}
                    className={cn(
                      'p-4 bg-white rounded-xl border border-border shadow-2xs text-left transition-all group',
                      tile.available
                        ? 'hover:border-emerald-400 hover:shadow-xs cursor-pointer active:scale-[0.99]'
                        : 'cursor-default opacity-80'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-500 font-medium">{tile.label}</span>
                      {tile.available && (
                        <ExternalLink size={12} className="text-ink-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div className={cn('text-2xl font-extrabold tnum', tile.color)}>
                      {tile.count}
                    </div>
                    <span className="text-[10px] text-ink-400 mt-1 block">
                      {tile.available ? 'View records →' : 'Dedicated module'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Contract Snapshot (White Bento Card) */}
          <div className="border border-border bg-white rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" />
                  Active Contract Overview
                </h3>
                {employee.activeContract?.reference && (
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {employee.activeContract.reference}
                  </span>
                )}
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('contracts', employee.id)}
                  className="text-xs"
                >
                  <Pencil size={12} className="mr-1" />
                  Manage / Edit Contract
                </Button>
              )}
            </div>

            {employee.activeContract ? (
              <div
                onClick={() => canManage && onNavigate('contracts', employee.id)}
                className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 ${canManage ? 'cursor-pointer group' : ''}`}
                title={canManage ? 'Click to manage contracts for this employee' : undefined}
              >
                <div className="p-3.5 bg-paper/60 rounded-lg border border-border group-hover:border-emerald-300 transition-colors">
                  <span className="text-xs text-ink-400 block mb-1">Monthly Wage</span>
                  <span className="text-lg font-bold text-ink-900">
                    {formatCurrency(employee.activeContract.wage)}
                  </span>
                </div>
                <div className="p-3.5 bg-paper/60 rounded-lg border border-border group-hover:border-emerald-300 transition-colors">
                  <span className="text-xs text-ink-400 block mb-1">Salary Structure</span>
                  <span className="text-sm font-semibold text-ink-900">
                    {employee.activeContract.salaryStructure?.name || 'Standard Package'}
                  </span>
                </div>
                <div className="p-3.5 bg-paper/60 rounded-lg border border-border group-hover:border-emerald-300 transition-colors">
                  <span className="text-xs text-ink-400 block mb-1">Contract Validity</span>
                  <span className="text-xs font-semibold text-ink-900">
                    {new Date(employee.activeContract.startDate).toLocaleDateString()} —{' '}
                    {employee.activeContract.endDate
                      ? new Date(employee.activeContract.endDate).toLocaleDateString()
                      : 'Indefinite (Running)'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-paper/50 rounded-lg border border-dashed border-border text-center">
                <p className="text-xs text-ink-400 mb-2">
                  No active running contract found for this employee.
                </p>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('contracts', employee.id)}
                  >
                    <Plus size={13} className="mr-1" />
                    Create Contract for Employee
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Weekly Working Schedule Breakdown (White Bento Card) */}
          <div className="border border-border bg-white rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <Clock size={16} className="text-emerald-600" />
                Working Schedule & Hours Breakdown
              </h3>
              <div className="flex items-center gap-2">
                {employee.workingSchedule && (
                  <>
                    <span className="text-xs font-semibold text-ink-700 bg-paper px-2.5 py-1 rounded border border-border">
                      {employee.workingSchedule.name}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {employee.workingSchedule.type === 'FULL_TIME' ? 'Full Time' : 'Part Time'}
                    </span>
                  </>
                )}
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openScheduleModal}
                    className="text-xs h-7 px-2.5"
                  >
                    Change Schedule
                  </Button>
                )}
              </div>
            </div>

            {employee.workingSchedule?.lines && employee.workingSchedule.lines.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="border border-border rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-paper/80 border-b border-border text-ink-500 uppercase tracking-wider text-[11px]">
                        <th className="px-3.5 py-2.5 text-left">Day</th>
                        <th className="px-3.5 py-2.5 text-left">Working Hours</th>
                        <th className="px-3.5 py-2.5 text-left">Break</th>
                        <th className="px-3.5 py-2.5 text-right">Net Daily Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                      {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((dayName) => {
                        const line = employee.workingSchedule?.lines?.find((l) => l.day === dayName);
                        const isToday =
                          new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() === dayName;

                        if (!line) {
                          return (
                            <tr key={dayName} className={cn('text-ink-400 bg-paper/20', isToday && 'bg-emerald-50/40')}>
                              <td className="px-3.5 py-2.5 font-medium capitalize">
                                <div className="flex items-center gap-1.5">
                                  <span>{dayName.toLowerCase()}</span>
                                  {isToday && (
                                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                                      Today
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 text-ink-400 italic">Off / Rest Day</td>
                              <td className="px-3.5 py-2.5 text-ink-400">—</td>
                              <td className="px-3.5 py-2.5 text-right text-ink-400 tnum">0.0h</td>
                            </tr>
                          );
                        }

                        // Calculate net daily hours
                        const [startH, startM] = line.startTime.split(':').map(Number);
                        const [endH, endM] = line.endTime.split(':').map(Number);
                        const totalMins = endH * 60 + endM - (startH * 60 + startM) - (line.breakMinutes || 0);
                        const netHours = Math.max(0, totalMins / 60).toFixed(1);

                        return (
                          <tr
                            key={dayName}
                            className={cn(
                              'hover:bg-paper/40 transition-colors',
                              isToday && 'bg-emerald-50/60 font-medium'
                            )}
                          >
                            <td className="px-3.5 py-2.5 font-semibold text-ink-900 capitalize">
                              <div className="flex items-center gap-1.5">
                                <span>{dayName.toLowerCase()}</span>
                                {isToday && (
                                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Today
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-ink-800 tnum font-medium">
                              {line.startTime} — {line.endTime}
                            </td>
                            <td className="px-3.5 py-2.5 text-ink-600 tnum">
                              {line.breakMinutes > 0 ? `${line.breakMinutes} min` : 'None'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-ink-900 tnum">
                              {netHours}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500 pt-1 px-1">
                  <span>Standard expectation used for attendance punctuality, overtime, and payroll.</span>
                  <span className="font-semibold text-ink-900">
                    Total:{' '}
                    {employee.workingSchedule.lines
                      .reduce((sum, l) => {
                        const [startH, startM] = l.startTime.split(':').map(Number);
                        const [endH, endM] = l.endTime.split(':').map(Number);
                        const totalMins = endH * 60 + endM - (startH * 60 + startM) - (l.breakMinutes || 0);
                        return sum + Math.max(0, totalMins / 60);
                      }, 0)
                      .toFixed(1)}
                    h / week
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-400 italic">No working schedule lines assigned.</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {canManage && (
        <Modal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Profile: ${employee.firstName} ${employee.lastName}`}
        >
          <form onSubmit={handleUpdateEmployee} className="space-y-4">
            {updateError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {updateError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 555-0100"
                  className="w-full px-3 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Bank Account (IBAN)
                </label>
                <input
                  type="text"
                  value={editBankAccount}
                  onChange={(e) => setEditBankAccount(e.target.value)}
                  placeholder="US893704..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full px-3 pr-8 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                >
                  <option value="">No Department</option>
                  {deptList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Job Position
                </label>
                <select
                  value={editPosId}
                  onChange={(e) => setEditPosId(e.target.value)}
                  className="w-full px-3 pr-8 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                >
                  <option value="">No Position</option>
                  {posList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Reports To (Manager)
                </label>
                <select
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="w-full px-3 pr-8 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                >
                  <option value="">No Manager</option>
                  {allEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Employment Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full px-3 pr-8 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Working Schedule
              </label>
              <select
                value={editScheduleId}
                onChange={(e) => setEditScheduleId(e.target.value)}
                className="w-full px-3 pr-8 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
              >
                <option value="">No Schedule Assigned</option>
                {scheduleList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === 'FULL_TIME' ? 'Full Time' : 'Part Time'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Working Schedule Modal */}
      {canManage && (
        <Modal
          open={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title="Change Working Schedule"
        >
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            {scheduleUpdateError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {scheduleUpdateError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Select Working Schedule
              </label>
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="w-full px-3 pr-8 py-2 text-sm border border-border rounded-sm-md bg-surface focus:outline-none focus:border-ink-400"
              >
                <option value="">No Schedule Assigned</option>
                {scheduleList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === 'FULL_TIME' ? 'Full Time' : 'Part Time'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-400 mt-1.5">
                Changing the working schedule will adjust the employee's standard shift times, daily work hours, and attendance baseline calculations.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsScheduleModalOpen(false)}
                disabled={isUpdatingSchedule}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={isUpdatingSchedule}>
                {isUpdatingSchedule ? 'Saving...' : 'Update Schedule'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Archive Confirmation Modal */}
      {canManage && (
        <Modal
          open={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          title="Archive Employee Record"
        >
          <div className="space-y-4">
            {archiveError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {archiveError}
              </div>
            )}
            <p className="text-sm text-ink-600">
              Are you sure you want to archive <strong>{employee.firstName} {employee.lastName}</strong>?
            </p>
            <p className="text-xs text-ink-500">
              This record will be soft-deleted. Historical attendance logs, contracts, and payslips will be preserved.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsArchiveModalOpen(false)}
                disabled={isArchiving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleArchiveEmployee}
                disabled={isArchiving}
              >
                {isArchiving ? 'Archiving...' : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
