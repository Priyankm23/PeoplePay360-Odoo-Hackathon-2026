import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, List, LayoutGrid, Filter, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/Button';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { api } from '@/lib/api';
import type { View, EmployeeStatus, UserSession } from '@/types';
import { cn, formatRole } from '@/lib/utils';

interface EmployeesPageProps {
  onNavigate: (view: View, employeeId?: string) => void;
  userSession?: UserSession | null;
}

interface EmployeeItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  bankAccount?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  profileImageUrl?: string | null;
  createdAt: string;
  department?: { id: string; name: string } | null;
  jobPosition?: { id: string; title: string } | null;
  workingSchedule?: { id: string; name: string; type: string } | null;
  manager?: { id: string; firstName: string; lastName: string } | null;
  user?: { id: string; role: string } | null;
}

interface DepartmentItem {
  id: string;
  name: string;
}

interface JobPositionItem {
  id: string;
  title: string;
  departmentId: string | null;
}

interface WorkingScheduleItem {
  id: string;
  name: string;
  type: string;
}

export function EmployeesPage({ onNavigate, userSession }: EmployeesPageProps) {
  // If an Employee role user accesses directory, redirect them immediately to their own profile
  useEffect(() => {
    if (userSession?.role === 'Employee' && userSession.employeeId) {
      onNavigate('employee-detail', userSession.employeeId);
    }
  }, [userSession, onNavigate]);

  const userRole = userSession?.role || '';
  const canManageEmployees =
    userRole === 'ADMIN' ||
    userRole === 'HR_MANAGER' ||
    userRole === 'HR_PAYROLL_MANAGER' ||
    userRole === 'Admin' ||
    userRole === 'HR Manager' ||
    userRole === 'HR Payroll Manager';

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPositionItem[]>([]);
  const [workingSchedules, setWorkingSchedules] = useState<WorkingScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | null>(null);

  // Cursor Pagination State
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Create Employee Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [departmentId, setDepartmentId] = useState('');
  const [jobPositionId, setJobPositionId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [workingScheduleId, setWorkingScheduleId] = useState('');
  const [issueLogin, setIssueLogin] = useState(true);
  const [role, setRole] = useState('EMPLOYEE');

  // Success Provisioning Credentials Modal State
  const [provisionedCreds, setProvisionedCreds] = useState<{
    email: string;
    role: string;
    credentialsIssued: boolean;
    deliveryNote: string;
  } | null>(null);

  // Fetch employees and lookups
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [empRes, deptRes, posRes, schedRes] = await Promise.all([
        api.employees.getAll({
          search: search || undefined,
          departmentId: selectedDeptId || undefined,
          status: statusFilter || undefined,
          cursor: cursor || undefined,
          limit: viewMode === 'kanban' ? 200 : pageSize,
        }),
        departments.length > 0 ? Promise.resolve(departments) : api.departments.getAll(),
        jobPositions.length > 0 ? Promise.resolve(jobPositions) : api.jobPositions.getAll(),
        workingSchedules.length > 0 ? Promise.resolve(workingSchedules) : api.workingSchedules.getAll(),
      ]);

      const items = empRes?.items || (Array.isArray(empRes) ? empRes : []);
      const pagination = empRes?.pagination;

      setEmployees(items);
      if (pagination) {
        setNextCursor(pagination.nextCursor || null);
        setHasNextPage(Boolean(pagination.hasNextPage));
        setTotalCount(pagination.totalCount ?? items.length);
      } else {
        setNextCursor(null);
        setHasNextPage(false);
        setTotalCount(items.length);
      }

      if (departments.length === 0) setDepartments(deptRes || []);
      if (jobPositions.length === 0) setJobPositions(posRes || []);
      if (workingSchedules.length === 0) setWorkingSchedules(Array.isArray(schedRes) ? schedRes : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load employees from server');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset cursor history whenever filters or search change
  useEffect(() => {
    setCursor(null);
    setCursorStack([null]);
  }, [search, selectedDeptId, statusFilter, viewMode]);

  useEffect(() => {
    fetchData();
  }, [search, selectedDeptId, statusFilter, cursor, pageSize, viewMode]);

  const handleNextPage = () => {
    if (nextCursor && !isLoading) {
      setCursorStack((prev) => [...prev, nextCursor]);
      setCursor(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorStack.length > 1 && !isLoading) {
      const newStack = cursorStack.slice(0, -1);
      const prevCursor = newStack[newStack.length - 1];
      setCursorStack(newStack);
      setCursor(prevCursor);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCursor(null);
    setCursorStack([null]);
  };

  const currentPage = cursorStack.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + employees.length - 1, totalCount);

  // Client-side fallback grouping for Kanban
  const kanbanData = useMemo(() => {
    const grouped: Record<string, EmployeeItem[]> = {};
    departments.forEach((d) => {
      grouped[d.name] = employees.filter((e) => e.department?.id === d.id);
    });
    // Add Unassigned group if any
    const unassigned = employees.filter((e) => !e.department);
    if (unassigned.length > 0) {
      grouped['Unassigned'] = unassigned;
    }
    return grouped;
  }, [employees, departments]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('First name, last name, and email are required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await api.employees.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        image: profileImage || undefined,
        departmentId: departmentId || undefined,
        jobPositionId: jobPositionId || undefined,
        managerId: managerId || undefined,
        workingScheduleId: workingScheduleId || undefined,
        issueLogin,
        role: issueLogin ? role : undefined,
      });

      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setBankAccount('');
      setProfileImage(null);
      setDepartmentId('');
      setJobPositionId('');
      setManagerId('');
      setWorkingScheduleId('');
      setIssueLogin(true);
      setRole('EMPLOYEE');
      setIsCreateModalOpen(false);

      // If credentials were generated, show the modal
      if (result?.initialCredentials) {
        setProvisionedCreds({
          email: result.initialCredentials.email,
          role: result.initialCredentials.role,
          credentialsIssued: result.initialCredentials.credentialsIssued,
          deliveryNote: result.initialCredentials.deliveryNote,
        });
      }

      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={
          isLoading
            ? 'Fetching live employee records...'
            : `${totalCount} total employees across ${departments.length} departments`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={fetchData} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            {canManageEmployees && (
              <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={15} />
                New Employee
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="p-4 mb-5 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-surface border border-border rounded-lg shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full text-sm pl-9 pr-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-400 transition-colors"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-sm-md overflow-hidden bg-surface">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              viewMode === 'list' ? 'bg-sidebar-bg text-white' : 'text-ink-500 hover:bg-paper'
            )}
          >
            <List size={14} />
            List
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              viewMode === 'kanban' ? 'bg-sidebar-bg text-white' : 'text-ink-500 hover:bg-paper'
            )}
          >
            <LayoutGrid size={14} />
            Kanban
          </button>
        </div>

        {/* Department Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <Filter size={14} className="text-ink-300 shrink-0" />
          <button
            onClick={() => setSelectedDeptId(null)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-sm-md border transition-colors whitespace-nowrap',
              selectedDeptId === null
                ? 'border-sidebar-bg bg-sidebar-bg text-white'
                : 'border-border bg-surface text-ink-500 hover:border-ink-300'
            )}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDeptId(selectedDeptId === dept.id ? null : dept.id)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-sm-md border transition-colors whitespace-nowrap',
                selectedDeptId === dept.id
                  ? 'border-sidebar-bg bg-sidebar-bg text-white'
                  : 'border-border bg-surface text-ink-500 hover:border-ink-300'
              )}
            >
              {dept.name}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-sm-md border transition-colors whitespace-nowrap',
              statusFilter === null
                ? 'border-sidebar-bg bg-sidebar-bg text-white'
                : 'border-border bg-surface text-ink-500 hover:border-ink-300'
            )}
          >
            All Statuses
          </button>
          {(['ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(statusFilter === st ? null : st)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-sm-md border transition-colors capitalize whitespace-nowrap',
                statusFilter === st
                  ? 'border-sidebar-bg bg-sidebar-bg text-white'
                  : 'border-border bg-surface text-ink-500 hover:border-ink-300'
              )}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 bg-surface border border-border rounded-sm-md">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-ink-600">Loading live employees from database...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-dashed border-border rounded-sm-md">
          <p className="text-sm text-ink-400">No employees match the selected criteria.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div>
          <Table className="[&>table]:table-fixed shadow-2xs rounded-b-none border-b-0">
            <THead>
              <TH className="w-[27%]">Employee</TH>
              <TH className="w-[16%]">Department</TH>
              <TH className="w-[18%]">Job Position</TH>
              <TH className="w-[14%]">Manager</TH>
              <TH className="w-[17%]">Role</TH>
              <TH className="w-[8%]" align="center">Status</TH>
            </THead>
            <TBody>
              {employees.map((emp) => (
                <TR key={emp.id} onClick={() => onNavigate('employee-detail', emp.id)}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar
                        firstName={emp.firstName}
                        lastName={emp.lastName}
                        color="#059669"
                        imageUrl={emp.profileImageUrl}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium text-ink-900">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-xs text-ink-500">{emp.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-ink-700">{emp.department?.name || '—'}</TD>
                  <TD className="text-ink-700">{emp.jobPosition?.title || '—'}</TD>
                  <TD>
                    {emp.manager ? (
                      <span className="text-ink-700 text-sm">
                        {emp.manager.firstName} {emp.manager.lastName}
                      </span>
                    ) : (
                      <span className="text-ink-300 text-xs">—</span>
                    )}
                  </TD>
                  <TD>
                    {emp.user ? (
                      <span className="inline-block whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {formatRole(emp.user.role)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-400">No Login</span>
                    )}
                  </TD>
                  <TD align="center">
                    <StatusDot type={emp.status === 'ACTIVE' ? 'active' : 'inactive'} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {/* Cursor-based Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface border border-border rounded-b-lg text-xs text-ink-600 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-ink-500">
                Showing <span className="font-semibold text-ink-900">{startIndex}</span> to{' '}
                <span className="font-semibold text-ink-900">{endIndex}</span> of{' '}
                <span className="font-semibold text-ink-900">{totalCount}</span> employees
              </span>
              <span className="text-ink-300">|</span>
              <span className="text-ink-500">
                Page <span className="font-semibold text-ink-900">{currentPage}</span>
                {totalPages > 0 && <span> of {totalPages}</span>}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-ink-500 text-[11px]">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="bg-paper border border-border text-ink-800 text-xs rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={cursorStack.length <= 1 || isLoading}
                  className="px-2.5 py-1 text-xs flex items-center gap-1"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage || isLoading}
                  className="px-2.5 py-1 text-xs flex items-center gap-1"
                  title="Next page"
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(kanbanData).map(([deptName, deptEmployees]) => (
            <div key={deptName} className="min-w-[260px] flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-ink-900 uppercase tracking-wide">
                  {deptName}
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-paper text-ink-600 border border-border tnum">
                  {deptEmployees.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {deptEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => onNavigate('employee-detail', emp.id)}
                    className="group relative overflow-hidden rounded-xl border border-border/80 bg-white p-3.5 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] hover:border-emerald-500/40 hover:shadow-xs cursor-pointer transition-all space-y-2.5"
                  >
                    {/* Subtle Corner Ambient Graphic */}
                    <img
                      src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80"
                      alt=""
                      className="absolute -right-5 -top-5 w-24 h-20 object-cover rounded-xl opacity-10 filter grayscale group-hover:grayscale-0 group-hover:opacity-25 transition-all duration-300 pointer-events-none"
                    />

                    {/* Top Row: Avatar, Name, Title, and Status */}
                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          firstName={emp.firstName}
                          lastName={emp.lastName}
                          color="#059669"
                          imageUrl={emp?.profileImageUrl}
                          size="sm"
                          className="ring-2 ring-emerald-100/80 shadow-2xs transform-gpu transition-all duration-200 group-hover:scale-105"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-ink-900 truncate group-hover:text-emerald-950 transition-colors">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-xs text-ink-500 truncate font-medium">
                            {emp.jobPosition?.title || 'Team Member'}
                          </div>
                        </div>
                      </div>

                      {/* Light status badge */}
                      <div className="shrink-0 pt-0.5">
                        {emp.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compact Footer (lightweight meta) */}
                    <div className="relative z-10 pt-2 border-t border-border-soft flex items-center justify-between text-[11px]">
                      <span className="text-ink-400 truncate max-w-[150px] font-mono text-[10px]">
                        {emp.email}
                      </span>
                      {emp.user ? (
                        <span className="font-semibold text-emerald-800 bg-emerald-50/90 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200 shrink-0">
                          {formatRole(emp.user.role)}
                        </span>
                      ) : (
                        <span className="text-ink-400 text-[10px]">Employee</span>
                      )}
                    </div>

                    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.02]" />
                  </div>
                ))}
                {deptEmployees.length === 0 && (
                  <div className="text-xs text-ink-300 text-center py-6 border border-dashed border-border/80 rounded-xl bg-paper/30">
                    No employees
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Employee Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Employee"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Jordan"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Hayes"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
              Work Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jordan.hayes@demo.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
              Profile Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 text-sm border border-border rounded-sm-md bg-surface file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
            />
            <p className="mt-1 text-[11px] text-ink-400">JPEG, PNG, or WebP up to 5 MB.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
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
                value={jobPositionId}
                onChange={(e) => setJobPositionId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              >
                <option value="">Select Job Position...</option>
                {jobPositions
                  .filter((p) => !departmentId || p.departmentId === departmentId)
                  .map((p) => (
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
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Bank Account (IBAN/Routing)
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="US89370400440532013000"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              >
                <option value="">No Direct Manager</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Working Schedule
              </label>
              <select
                value={workingScheduleId}
                onChange={(e) => setWorkingScheduleId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              >
                <option value="">Default (Standard 40h)</option>
                {workingSchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Login Account Checkbox */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-sm-md space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="issueLogin"
                checked={issueLogin}
                onChange={(e) => setIssueLogin(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="issueLogin" className="text-xs font-semibold text-emerald-900 cursor-pointer">
                Issue User Login Account (Auto-generates formatted temporary password)
              </label>
            </div>
            <p className="text-[11px] text-emerald-700 ml-6">
              Provisions a portal account with default enterprise password pattern (PeoplePay@2026_XXXX).
            </p>

            {issueLogin && (
              <div className="pt-2 ml-6">
                <label className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                  Assigned Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 rounded bg-white"
                >
                  <option value="EMPLOYEE">Employee (Self-service attendance & leave)</option>
                  <option value="HR_MANAGER">HR Manager</option>
                  <option value="HR_PAYROLL_USER">HR Payroll User</option>
                  <option value="HR_PAYROLL_MANAGER">HR Payroll Manager</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Provisioned Credentials Success Modal */}
      {provisionedCreds && (
        <Modal
          open={true}
          onClose={() => setProvisionedCreds(null)}
          title="Login Credentials Generated"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-semibold">User Account Successfully Provisioned</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  The account is ready. The initial password has been mailed to the employee's email address.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 bg-paper p-3.5 rounded-sm-md border border-border text-sm">
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-500">Email:</span>
                <span className="font-semibold text-ink-900">{provisionedCreds.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-500">Role:</span>
                <span className="font-semibold text-emerald-800">{provisionedCreds.role}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-border-soft">
                <span className="text-ink-500">Password:</span>
                <span className="font-semibold text-emerald-800">Mailed to employee email</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => setProvisionedCreds(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
