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

  // RBAC permissions
  const isSelf = userSession?.role === 'Employee';
  const roleStr = (userSession?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canManage =
    roleStr === 'ADMIN' ||
    roleStr === 'HR_MANAGER' ||
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Manager';

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editPosId, setEditPosId] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Lookups for Edit Form
  const [deptList, setDeptList] = useState<Array<{ id: string; name: string }>>([]);
  const [posList, setPosList] = useState<Array<{ id: string; title: string; departmentId: string | null }>>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

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

  const openEditModal = async () => {
    if (!employee) return;
    setEditFirstName(employee.firstName);
    setEditLastName(employee.lastName);
    setEditPhone(employee.phone || '');
    setEditBankAccount(employee.bankAccount || '');
    setEditDeptId(employee.department?.id || '');
    setEditPosId(employee.jobPosition?.id || '');
    setEditManagerId(employee.manager?.id || '');
    setEditStatus(employee.status);
    setUpdateError(null);
    setIsEditModalOpen(true);

    try {
      const [depts, poses, emps] = await Promise.all([
        api.departments.getAll(),
        api.jobPositions.getAll(),
        api.employees.getAll(),
      ]);
      setDeptList(depts || []);
      setPosList(poses || []);
      const empItems = emps?.items || emps || [];
      setAllEmployees(Array.isArray(empItems) ? empItems.filter((e: any) => e.id !== employee.id) : []);
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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - profile card */}
        <div className="w-full lg:w-[300px] shrink-0">
          <div className="border border-border bg-surface rounded-sm-md p-5 shadow-2xs">
            <div className="flex flex-col items-center text-center">
              <Avatar
                firstName={employee.firstName}
                lastName={employee.lastName}
                color="bg-emerald-600"
                imageUrl={employee.profileImageUrl}
                onClick={employee.profileImageUrl ? () => window.open(employee.profileImageUrl || '', '_blank', 'noopener,noreferrer') : undefined}
                size="lg"
              />
              <h2 className="text-base font-bold mt-3 text-ink-900">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-sm text-ink-500 mt-0.5">
                {employee.jobPosition?.title || 'Team Member'}
              </p>
              <div className="mt-2.5">
                <StatusDot type={employee.status === 'ACTIVE' ? 'active' : 'inactive'} />
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-border-soft space-y-3">
              <div className="flex items-center gap-2.5 text-sm">
                <Briefcase size={15} className="text-ink-300 shrink-0" />
                <span className="text-ink-500">Department</span>
                <span className="ml-auto text-ink-900 font-medium">
                  {employee.department?.name || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Mail size={15} className="text-ink-300 shrink-0" />
                <span className="text-ink-500">Email</span>
                <span className="ml-auto text-ink-900 text-xs truncate max-w-[140px]" title={employee.email}>
                  {employee.email}
                </span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone size={15} className="text-ink-300 shrink-0" />
                  <span className="text-ink-500">Phone</span>
                  <span className="ml-auto text-ink-900 tnum">{employee.phone}</span>
                </div>
              )}
              {employee.bankAccount && (
                <div className="flex items-center gap-2.5 text-sm">
                  <CreditCard size={15} className="text-ink-300 shrink-0" />
                  <span className="text-ink-500">Bank</span>
                  <span className="ml-auto text-ink-900 font-mono text-xs truncate max-w-[130px]" title={employee.bankAccount}>
                    {employee.bankAccount}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar size={15} className="text-ink-300 shrink-0" />
                <span className="text-ink-500">Joined</span>
                <span className="ml-auto text-ink-900 tnum">
                  {new Date(employee.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* System Access Role Indicator */}
            <div className="mt-4 pt-4 border-t border-border-soft">
              <div className="text-xs text-ink-500 mb-1.5 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>System Access</span>
              </div>
              {employee.user ? (
                <div className="px-2.5 py-1.5 rounded bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                  <span>Role: {formatRole(employee.user.role)}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              ) : (
                <div className="px-2.5 py-1.5 rounded bg-paper text-ink-400 text-xs">
                  No login account
                </div>
              )}
            </div>

            {employee.manager && (
              <div className="mt-4 pt-4 border-t border-border-soft">
                <div className="text-xs text-ink-500 mb-2">Reports To</div>
                <div className="flex items-center gap-2.5">
                  <Avatar
                    firstName={employee.manager.firstName}
                    lastName={employee.manager.lastName}
                    color="bg-ink-700"
                    imageUrl={employee.manager.profileImageUrl}
                    size="sm"
                  />
                  <div>
                    <div className="text-sm font-medium text-ink-900">
                      {employee.manager.firstName} {employee.manager.lastName}
                    </div>
                    {employee.manager.email && (
                      <div className="text-xs text-ink-400">{employee.manager.email}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {employee.workingSchedule && (
              <div className="mt-4 pt-4 border-t border-border-soft">
                <div className="text-xs text-ink-500 mb-1 flex items-center justify-between">
                  <span>Working Schedule</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                    {employee.workingSchedule.type === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-ink-900">
                  {employee.workingSchedule.name}
                </div>
                {employee.workingSchedule.lines && (
                  <div className="text-[11px] text-ink-400 mt-0.5">
                    {employee.workingSchedule.lines.length} scheduled days / week
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main column - Smart-Button Counts & Active Contract */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Smart-Button Metric Badges (Interactive Navigation) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                Smart-Button Operational Metrics
              </h3>
              <span className="text-[11px] text-ink-400">Click any card to open related records</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Attendance',
                  count: employee.counts?.attendance ?? 0,
                  color: 'text-blue-600',
                  available: true,
                  targetView: 'attendance' as const,
                },
                {
                  label: 'Leave Requests',
                  count: employee.counts?.timeOffRequests ?? 0,
                  color: 'text-amber-600',
                  available: true,
                  targetView: 'time-off-requests' as const,
                },
                {
                  label: 'Leave Allocations',
                  count: employee.counts?.timeOffAllocations ?? 0,
                  color: 'text-purple-600',
                  available: true,
                  targetView: 'time-off-allocations' as const,
                },
                {
                  label: 'Contracts',
                  count: employee.counts?.contracts ?? 0,
                  color: 'text-emerald-600',
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
                    'p-4 bg-surface rounded-sm-md border border-border shadow-2xs text-left transition-all group',
                    tile.available
                      ? 'hover:border-ink-400 hover:shadow-xs cursor-pointer active:scale-[0.99]'
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
          </div>

          {/* Active Contract Snapshot */}
          <div className="border border-border bg-surface rounded-sm-md p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
                className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 ${canManage ? 'cursor-pointer group' : ''}`}
                title={canManage ? 'Click to manage contracts for this employee' : undefined}
              >
                <div className="p-3 bg-paper rounded border border-border group-hover:border-emerald-300 transition-colors">
                  <span className="text-xs text-ink-400 block mb-1">Monthly Wage</span>
                  <span className="text-lg font-bold text-ink-900">
                    {formatCurrency(employee.activeContract.wage)}
                  </span>
                </div>
                <div className="p-3 bg-paper rounded border border-border group-hover:border-emerald-300 transition-colors">
                  <span className="text-xs text-ink-400 block mb-1">Salary Structure</span>
                  <span className="text-sm font-semibold text-ink-900">
                    {employee.activeContract.salaryStructure?.name || 'Standard Package'}
                  </span>
                </div>
                <div className="p-3 bg-paper rounded border border-border group-hover:border-emerald-300 transition-colors">
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
              <div className="p-6 bg-paper rounded border border-dashed border-border text-center">
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

          {/* Weekly Working Schedule Breakdown */}
          <div className="border border-border bg-surface rounded-sm-md p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <Clock size={16} className="text-emerald-600" />
                Working Schedule & Hours Breakdown
              </h3>
              {employee.workingSchedule && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-700 bg-paper px-2.5 py-1 rounded border border-border">
                    {employee.workingSchedule.name}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {employee.workingSchedule.type === 'FULL_TIME' ? 'Full Time' : 'Part Time'}
                  </span>
                </div>
              )}
            </div>

            {employee.workingSchedule?.lines && employee.workingSchedule.lines.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="border border-border rounded-lg overflow-hidden">
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
                              <td className="px-3.5 py-2 font-medium capitalize">
                                <div className="flex items-center gap-1.5">
                                  <span>{dayName.toLowerCase()}</span>
                                  {isToday && (
                                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                                      Today
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-2 text-ink-400 italic">Off / Rest Day</td>
                              <td className="px-3.5 py-2 text-ink-400">—</td>
                              <td className="px-3.5 py-2 text-right text-ink-400 tnum">0.0h</td>
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
                        const totalMins =
                          endH * 60 + endM - (startH * 60 + startM) - (l.breakMinutes || 0);
                        return sum + Math.max(0, totalMins / 60);
                      }, 0)
                      .toFixed(1)}
                    h / week
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-paper rounded border border-dashed border-border text-center">
                <p className="text-xs text-ink-400">
                  No weekly working schedule lines assigned to this employee.
                </p>
              </div>
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
