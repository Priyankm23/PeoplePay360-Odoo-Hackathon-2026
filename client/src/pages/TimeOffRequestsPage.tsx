import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Calendar,
  CalendarDays,
  PieChart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  User,
  ShieldCheck,
  ChevronRight,
  Layers,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Drawer } from '@/components/Drawer';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import type { TimeOffRequest, TimeOffAllocation, TimeOffType, View, UserSession } from '@/types';
import { cn } from '@/lib/utils';

interface TimeOffRequestsPageProps {
  onNavigate: (view: View, id?: string) => void;
  employeeId?: string;
  initialTab?: 'requests' | 'allocations' | 'types';
  userSession?: UserSession | null;
}

type SubTab = 'requests' | 'allocations' | 'types';

export function TimeOffRequestsPage({
  onNavigate,
  employeeId,
  initialTab = 'requests',
  userSession,
}: TimeOffRequestsPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [allocations, setAllocations] = useState<TimeOffAllocation[]>([]);
  const [types, setTypes] = useState<TimeOffType[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Selection & modal states
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<TimeOffAllocation | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TimeOffType | null>(null);
  const [isRefuseModalOpen, setIsRefuseModalOpen] = useState(false);
  const [refuseDecisionNote, setRefuseDecisionNote] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form states for New Request
  const [reqForm, setReqForm] = useState({
    employeeId: employeeId || '',
    timeOffTypeId: '',
    startDate: '',
    endDate: '',
    duration: 1,
    reason: '',
  });

  // Form states for New Allocation
  const [allocForm, setAllocForm] = useState({
    employeeId: employeeId || '',
    timeOffTypeId: '',
    allocated: 10,
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: '',
  });

  // Form states for New Leave Type
  const [typeForm, setTypeForm] = useState({
    name: '',
    unit: 'DAYS' as 'DAYS' | 'HOURS',
    requiresAllocation: true,
    requiresApproval: true,
    affectsPayroll: true,
  });

  // Form states for Edit Leave Type
  const [editTypeForm, setEditTypeForm] = useState({
    name: '',
    unit: 'DAYS' as 'DAYS' | 'HOURS',
    requiresAllocation: true,
    requiresApproval: true,
    affectsPayroll: true,
  });

  // Role permissions - robust normalization handles both "Admin" and "ADMIN", etc.
  const roleStr = (userSession?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const isEmployee = roleStr === 'EMPLOYEE';
  const isAdmin = roleStr === 'ADMIN' || !userSession?.role;
  const isHRManager = roleStr === 'HR_MANAGER' || roleStr === 'HR';
  const isPayrollManager = roleStr === 'HR_PAYROLL_MANAGER' || roleStr === 'PAYROLL_MANAGER';

  const canApprove = isAdmin || isHRManager;
  const canManageAllocations = isAdmin || isHRManager || isPayrollManager;
  const canManageTypes = isAdmin || isHRManager || isPayrollManager;

  // Sync initial tab when changed from props
  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  // Load all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqsRes, allocsRes, typesRes, empsRes] = await Promise.all([
        api.timeOff.getRequests(employeeId ? { employeeId } : {}),
        api.timeOff.getAllocations(employeeId ? { employeeId } : {}),
        api.timeOff.getTypes(),
        api.employees.getAll({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      setRequests(reqsRes || []);
      setAllocations(allocsRes || []);
      setTypes(typesRes || []);
      const empList = Array.isArray(empsRes)
        ? empsRes
        : Array.isArray((empsRes as any)?.items)
        ? (empsRes as any).items
        : Array.isArray((empsRes as any)?.data)
        ? (empsRes as any).data
        : [];
      setEmployees(empList);
    } catch (err: any) {
      console.error('Failed to load time off data:', err);
      setError(err?.message || 'Failed to load time-off records');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Automatically compute duration when start and end date change
  useEffect(() => {
    if (reqForm.startDate && reqForm.endDate) {
      const start = new Date(reqForm.startDate);
      const end = new Date(reqForm.endDate);
      if (end >= start) {
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        setReqForm((prev) => ({ ...prev, duration: diffDays }));
      }
    }
  }, [reqForm.startDate, reqForm.endDate]);

  // Derive target employee's available balance for selected leave type in New Request modal
  const targetEmployeeIdForReq = isEmployee ? userSession?.employeeId : reqForm.employeeId;
  const selectedTypeObj = types.find((t) => t.id === reqForm.timeOffTypeId);
  const relevantAllocation = useMemo(() => {
    if (!targetEmployeeIdForReq || !reqForm.timeOffTypeId) return null;
    return (
      allocations.find(
        (a) =>
          a.employeeId === targetEmployeeIdForReq &&
          a.timeOffTypeId === reqForm.timeOffTypeId &&
          a.status === 'APPROVED'
      ) || null
    );
  }, [allocations, targetEmployeeIdForReq, reqForm.timeOffTypeId]);

  // -------------------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------------------

  const handleApproveRequest = async (id: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.approveRequest(id);
      setSuccessMsg('Time off request approved and balance updated successfully.');
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuseRequest = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.refuseRequest(selectedRequest.id, {
        decisionNote: refuseDecisionNote || undefined,
      });
      setSuccessMsg('Time off request refused.');
      setIsRefuseModalOpen(false);
      setRefuseDecisionNote('');
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to refuse request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.deleteRequest(id);
      setSuccessMsg('Time off request cancelled.');
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAllocation = async (id: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.approveAllocation(id);
      setSuccessMsg('Time off allocation approved successfully.');
      setSelectedAllocation(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuseAllocation = async (id: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.refuseAllocation(id);
      setSuccessMsg('Time off allocation refused.');
      setSelectedAllocation(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to refuse allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        timeOffTypeId: reqForm.timeOffTypeId,
        startDate: reqForm.startDate,
        endDate: reqForm.endDate,
        duration: Number(reqForm.duration),
        reason: reqForm.reason || undefined,
      };
      if (!isEmployee && reqForm.employeeId) {
        payload.employeeId = reqForm.employeeId;
      }
      await api.timeOff.createRequest(payload);
      setSuccessMsg('Time off request submitted successfully.');
      setIsRequestModalOpen(false);
      setReqForm({
        employeeId: employeeId || '',
        timeOffTypeId: '',
        startDate: '',
        endDate: '',
        duration: 1,
        reason: '',
      });
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.createAllocation({
        employeeId: allocForm.employeeId,
        timeOffTypeId: allocForm.timeOffTypeId,
        allocated: Number(allocForm.allocated),
        validFrom: allocForm.validFrom,
        validTo: allocForm.validTo || null,
      });
      setSuccessMsg('Time off allocation created (status: Pending approval).');
      setIsAllocationModalOpen(false);
      setAllocForm({
        employeeId: employeeId || '',
        timeOffTypeId: '',
        allocated: 10,
        validFrom: new Date().toISOString().slice(0, 10),
        validTo: '',
      });
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.createType(typeForm);
      setSuccessMsg(`Leave policy "${typeForm.name}" created successfully.`);
      setIsTypeModalOpen(false);
      setTypeForm({
        name: '',
        unit: 'DAYS',
        requiresAllocation: true,
        requiresApproval: true,
        affectsPayroll: true,
      });
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create leave policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditType = (type: TimeOffType) => {
    setEditingType(type);
    setEditTypeForm({
      name: type.name,
      unit: (type.unit as 'DAYS' | 'HOURS') || 'DAYS',
      requiresAllocation: type.requiresAllocation ?? true,
      requiresApproval: type.requiresApproval ?? true,
      affectsPayroll: type.affectsPayroll ?? true,
    });
    setIsEditTypeModalOpen(true);
  };

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.updateType(editingType.id, {
        name: editTypeForm.name,
        unit: editTypeForm.unit,
        requiresAllocation: editTypeForm.requiresAllocation,
        requiresApproval: editTypeForm.requiresApproval,
        affectsPayroll: editTypeForm.affectsPayroll,
      });
      setSuccessMsg(`Leave policy "${editTypeForm.name}" updated successfully.`);
      setIsEditTypeModalOpen(false);
      setEditingType(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update leave policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveType = async (type: TimeOffType) => {
    if (!confirm(`Are you sure you want to archive leave policy "${type.name}"? This will deactivate it for future requests.`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.timeOff.archiveType(type.id);
      setSuccessMsg(`Leave policy "${type.name}" archived successfully.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to archive leave policy');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // FILTERED DATA
  // -------------------------------------------------------------------------

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const statusMatch =
        statusFilter === 'ALL' || req.status.toUpperCase() === statusFilter.toUpperCase();
      const empName = req.employee
        ? `${req.employee.firstName} ${req.employee.lastName}`.toLowerCase()
        : '';
      const typeName = (req.timeOffType?.name || req.type || '').toLowerCase();
      const searchMatch = !search || empName.includes(search.toLowerCase()) || typeName.includes(search.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [requests, statusFilter, search]);

  const filteredAllocations = useMemo(() => {
    return allocations.filter((alloc) => {
      const statusMatch =
        statusFilter === 'ALL' || (alloc.status || '').toUpperCase() === statusFilter.toUpperCase();
      const empName = alloc.employee
        ? `${alloc.employee.firstName} ${alloc.employee.lastName}`.toLowerCase()
        : '';
      const typeName = (alloc.timeOffType?.name || alloc.type || '').toLowerCase();
      const searchMatch = !search || empName.includes(search.toLowerCase()) || typeName.includes(search.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [allocations, statusFilter, search]);

  const filteredTypes = useMemo(() => {
    return types.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  }, [types, search]);

  return (
    <div className="space-y-5">
      {/* Header with Title and Action Button */}
      <PageHeader
        title="Time Off"
        subtitle="Manage employee leave requests, balance allocations, and policy rules"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              Refresh
            </Button>

            {canManageTypes && (
              <Button
                variant={activeSubTab === 'types' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setIsTypeModalOpen(true)}
                className="gap-1.5 font-medium"
              >
                <Plus size={15} />
                New Leave Type
              </Button>
            )}

            {canManageAllocations && (
              <Button
                variant={activeSubTab === 'allocations' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setIsAllocationModalOpen(true)}
                className="gap-1.5 font-medium"
              >
                <Plus size={15} />
                New Allocation
              </Button>
            )}

            <Button
              variant={activeSubTab === 'requests' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setIsRequestModalOpen(true)}
              className="gap-1.5 font-medium"
            >
              <Plus size={15} />
              New Request
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-3">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sub-tab pills */}
      <div className="flex items-center justify-between border-b border-border-soft pb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveSubTab('requests');
              onNavigate('time-off-requests');
            }}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-semibold rounded-md border transition-all flex items-center gap-2',
              activeSubTab === 'requests'
                ? 'border-ink-900 bg-ink-900 text-white shadow-xs'
                : 'border-border bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900'
            )}
          >
            <CalendarDays size={14} />
            Requests
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[11px] font-bold',
                activeSubTab === 'requests' ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-600'
              )}
            >
              {requests.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('allocations');
              onNavigate('time-off-allocations');
            }}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-semibold rounded-md border transition-all flex items-center gap-2',
              activeSubTab === 'allocations'
                ? 'border-ink-900 bg-ink-900 text-white shadow-xs'
                : 'border-border bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900'
            )}
          >
            <PieChart size={14} />
            Allocations
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[11px] font-bold',
                activeSubTab === 'allocations' ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-600'
              )}
            >
              {allocations.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('types');
              onNavigate('time-off-types');
            }}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-semibold rounded-md border transition-all flex items-center gap-2',
              activeSubTab === 'types'
                ? 'border-ink-900 bg-ink-900 text-white shadow-xs'
                : 'border-border bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900'
            )}
          >
            <Layers size={14} />
            Types
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[11px] font-bold',
                activeSubTab === 'types' ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-600'
              )}
            >
              {types.length}
            </span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-surface text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-ink-900 w-40 sm:w-56 transition-all"
            />
          </div>

          {activeSubTab !== 'types' && (
            <div className="flex items-center gap-1">
              {['ALL', 'SUBMITTED', 'APPROVED', 'REFUSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2 py-1 text-[11px] font-medium rounded border transition-colors',
                    statusFilter === st
                      ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                      : 'bg-surface text-ink-600 border-border hover:bg-paper'
                  )}
                >
                  {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: REQUESTS VIEW                                                */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'requests' && (
        <div className="bg-surface border border-border rounded-lg shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-ink-400 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-ink-500" />
              Loading leave requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-400 space-y-2">
              <p>No time off requests found.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRequestModalOpen(true)}
                className="gap-1"
              >
                <Plus size={14} /> Submit New Request
              </Button>
            </div>
          ) : (
            <Table>
              <THead>
                <TH>Employee</TH>
                <TH>Type</TH>
                <TH>Start Date</TH>
                <TH>End Date</TH>
                <TH align="right">Duration</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </THead>
              <TBody>
                {filteredRequests.map((req) => {
                  const empName = req.employee
                    ? `${req.employee.firstName} ${req.employee.lastName}`
                    : 'Unassigned';
                  const typeLabel = req.timeOffType?.name || req.type || 'Standard';
                  const statusKey = req.status.toLowerCase() as any;

                  return (
                    <TR
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="cursor-pointer hover:bg-paper/70 transition-colors"
                    >
                      <TD>
                        <div className="flex items-center gap-3">
                          {req.employee ? (
                            <Avatar
                              firstName={req.employee.firstName}
                              lastName={req.employee.lastName}
                              size="sm"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-ink-600">
                              ?
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-ink-900 text-xs md:text-sm">
                              {empName}
                            </div>
                            {req.employee?.department && (
                              <div className="text-[11px] text-ink-400">
                                {req.employee.department.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-ink-700">
                            {typeLabel}
                          </span>
                          {(req.reason || req.decisionNote) && (
                            <div
                              className="text-[11px] text-ink-500 mt-1 max-w-[200px] truncate"
                              title={req.reason || req.decisionNote || undefined}
                            >
                              {req.reason || req.decisionNote}
                            </div>
                          )}
                        </div>
                      </TD>
                      <TD className="tnum text-xs md:text-sm text-ink-700">{req.startDate}</TD>
                      <TD className="tnum text-xs md:text-sm text-ink-700">{req.endDate}</TD>
                      <TD align="right" className="tnum text-xs md:text-sm font-semibold text-ink-900">
                        {req.duration} {req.duration === 1 ? 'day' : 'days'}
                      </TD>
                      <TD>
                        <StatusDot type={statusKey} />
                      </TD>
                      <TD align="right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canApprove && req.status.toUpperCase() === 'SUBMITTED' && (
                            <>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleApproveRequest(req.id)}
                                disabled={submitting}
                                className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1 font-semibold py-1 px-2"
                                title="Approve Leave Request"
                              >
                                <Check size={13} />
                                Approve
                              </Button>
                              <Button
                                variant="dangerOutline"
                                size="xs"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setIsRefuseModalOpen(true);
                                }}
                                disabled={submitting}
                                className="gap-1 font-semibold py-1 px-2"
                                title="Refuse Leave Request"
                              >
                                <X size={13} />
                                Refuse
                              </Button>
                            </>
                          )}
                          {req.status.toUpperCase() === 'SUBMITTED' &&
                            req.employeeId === userSession?.employeeId &&
                            !canApprove && (
                              <Button
                                variant="dangerOutline"
                                size="xs"
                                onClick={() => handleDeleteRequest(req.id)}
                                disabled={submitting}
                                className="py-1 px-2"
                              >
                                Cancel
                              </Button>
                            )}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedRequest(req)}
                            className="text-xs font-medium text-ink-600 hover:text-ink-900 flex items-center gap-0.5 py-1 px-2"
                          >
                            Details <ChevronRight size={13} />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: ALLOCATIONS VIEW                                             */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'allocations' && (
        <div className="bg-surface border border-border rounded-lg shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-ink-400 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-ink-500" />
              Loading leave allocations...
            </div>
          ) : filteredAllocations.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-400 space-y-2">
              <p>No leave allocations recorded.</p>
              {canManageAllocations && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAllocationModalOpen(true)}
                  className="gap-1"
                >
                  <Plus size={14} /> Create Allocation
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <THead>
                <TH>Employee</TH>
                <TH>Leave Policy</TH>
                <TH align="right">Allocated</TH>
                <TH align="right">Taken</TH>
                <TH align="right">Remaining</TH>
                <TH>Validity</TH>
                <TH>Status</TH>
                {canApprove && <TH align="right">Actions</TH>}
              </THead>
              <TBody>
                {filteredAllocations.map((alloc) => {
                  const empName = alloc.employee
                    ? `${alloc.employee.firstName} ${alloc.employee.lastName}`
                    : 'All Staff';
                  const policyName = alloc.timeOffType?.name || alloc.type || 'Standard';
                  const allocatedDays = alloc.allocated ?? alloc.totalDays ?? 0;
                  const takenDays = alloc.taken ?? alloc.usedDays ?? 0;
                  const remainingDays = alloc.remaining ?? alloc.remainingDays ?? Math.max(0, allocatedDays - takenDays);
                  const isPending = alloc.status === 'PENDING';

                  return (
                    <TR key={alloc.id} className="hover:bg-paper/70 transition-colors">
                      <TD>
                        <div className="flex items-center gap-3">
                          {alloc.employee ? (
                            <Avatar
                              firstName={alloc.employee.firstName}
                              lastName={alloc.employee.lastName}
                              size="sm"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-ink-600">
                              ?
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-ink-900 text-xs md:text-sm">
                              {empName}
                            </div>
                            {alloc.employee?.department && (
                              <div className="text-[11px] text-ink-400">
                                {alloc.employee.department.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <span className="font-medium text-xs md:text-sm text-ink-800">
                          {policyName}
                        </span>
                      </TD>
                      <TD align="right" className="tnum text-xs md:text-sm text-ink-700">
                        {allocatedDays}d
                      </TD>
                      <TD align="right" className="tnum text-xs md:text-sm text-ink-700">
                        {takenDays}d
                      </TD>
                      <TD align="right" className="tnum text-xs md:text-sm font-bold text-emerald-700">
                        {remainingDays}d
                      </TD>
                      <TD className="text-xs text-ink-500">
                        {alloc.validFrom ? `${alloc.validFrom} → ${alloc.validTo || 'Permanent'}` : alloc.period || 'Annual'}
                      </TD>
                      <TD>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-semibold',
                            alloc.status === 'APPROVED' && 'bg-emerald-50 text-emerald-800 border border-emerald-200',
                            alloc.status === 'PENDING' && 'bg-amber-50 text-amber-800 border border-amber-200',
                            alloc.status === 'REFUSED' && 'bg-rose-50 text-rose-800 border border-rose-200'
                          )}
                        >
                          {alloc.status || 'APPROVED'}
                        </span>
                      </TD>
                      {canApprove && (
                        <TD align="right">
                          {isPending ? (
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleApproveAllocation(alloc.id)}
                                disabled={submitting}
                                className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 font-semibold gap-1"
                                title="Approve Allocation"
                              >
                                <Check size={13} />
                                Approve
                              </Button>
                              <Button
                                variant="dangerOutline"
                                size="xs"
                                onClick={() => handleRefuseAllocation(alloc.id)}
                                disabled={submitting}
                                className="font-semibold gap-1"
                                title="Refuse Allocation"
                              >
                                <X size={13} />
                                Refuse
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-400 font-medium mr-1">
                              Locked
                            </span>
                          )}
                        </TD>
                      )}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 3: TYPES VIEW                                                   */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'types' && (
        <div className="bg-surface border border-border rounded-lg shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-ink-400 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-ink-500" />
              Loading leave policies...
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-400 space-y-2">
              <p>No leave types configured.</p>
              {canManageTypes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTypeModalOpen(true)}
                  className="gap-1"
                >
                  <Plus size={14} /> Create Leave Policy
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <THead>
                <TH>Policy Name</TH>
                <TH>Unit</TH>
                <TH>Requires Allocation</TH>
                <TH>Requires Approval</TH>
                <TH>Affects Payroll</TH>
                <TH align="right">Allocations Granted</TH>
                <TH align="right">Active Requests</TH>
                <TH align="right">Actions</TH>
              </THead>
              <TBody>
                {filteredTypes.map((t) => (
                  <TR key={t.id} className="hover:bg-paper/70 transition-colors">
                    <TD>
                      <div className="font-semibold text-xs md:text-sm text-ink-900">
                        {t.name}
                      </div>
                    </TD>
                    <TD>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-ink-700">
                        {t.unit || 'DAYS'}
                      </span>
                    </TD>
                    <TD>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold',
                          t.requiresAllocation
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-ink-500'
                        )}
                      >
                        {t.requiresAllocation ? 'Yes' : 'No'}
                      </span>
                    </TD>
                    <TD>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold',
                          t.requiresApproval
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-ink-500'
                        )}
                      >
                        {t.requiresApproval ? 'Yes' : 'No'}
                      </span>
                    </TD>
                    <TD>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold',
                          t.affectsPayroll
                            ? 'bg-violet-50 text-violet-800'
                            : 'bg-slate-100 text-ink-500'
                        )}
                      >
                        {t.affectsPayroll ? 'Yes' : 'No'}
                      </span>
                    </TD>
                    <TD align="right" className="tnum text-xs md:text-sm text-ink-700">
                      {t.allocationCount ?? 0}
                    </TD>
                    <TD align="right" className="tnum text-xs md:text-sm text-ink-700">
                      {t.requestCount ?? 0}
                    </TD>
                    <TD align="right">
                      {canManageTypes ? (
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenEditType(t)}
                            disabled={submitting}
                            className="gap-1 text-ink-700 hover:text-ink-900 border-border py-1 px-2"
                            title="Edit Policy"
                          >
                            <Edit2 size={13} />
                            Edit
                          </Button>
                          <Button
                            variant="dangerOutline"
                            size="xs"
                            onClick={() => handleArchiveType(t)}
                            disabled={submitting}
                            className="gap-1 py-1 px-2"
                            title="Archive Policy"
                          >
                            <Trash2 size={13} />
                            Archive
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">Read only</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* DRAWER: REQUEST DETAIL                                              */}
      {/* ------------------------------------------------------------------- */}
      <Drawer
        open={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        title="Time Off Request Details"
        subtitle={selectedRequest ? `Submitted on ${selectedRequest.startDate}` : ''}
        footer={
          selectedRequest && (
            <div className="w-full flex items-center justify-between gap-3">
              {/* Refuse button (HR Manager / Admin on submitted requests) */}
              {canApprove && selectedRequest.status.toUpperCase() === 'SUBMITTED' ? (
                <>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    onClick={() => setIsRefuseModalOpen(true)}
                    disabled={submitting}
                  >
                    Refuse Request
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApproveRequest(selectedRequest.id)}
                    disabled={submitting}
                  >
                    Approve Request
                  </Button>
                </>
              ) : selectedRequest.employeeId === userSession?.employeeId &&
                selectedRequest.status.toUpperCase() === 'SUBMITTED' ? (
                <Button
                  variant="dangerOutline"
                  size="sm"
                  onClick={() => handleDeleteRequest(selectedRequest.id)}
                  disabled={submitting}
                >
                  Cancel Request
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setSelectedRequest(null)}
                >
                  Close
                </Button>
              )}
            </div>
          )
        }
      >
        {selectedRequest && (
          <div className="space-y-5">
            {/* Employee Information */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-border-soft">
              {selectedRequest.employee ? (
                <Avatar
                  firstName={selectedRequest.employee.firstName}
                  lastName={selectedRequest.employee.lastName}
                  size="md"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-ink-600">
                  ?
                </div>
              )}
              <div>
                <div className="text-base font-bold text-ink-900">
                  {selectedRequest.employee
                    ? `${selectedRequest.employee.firstName} ${selectedRequest.employee.lastName}`
                    : 'Unknown Employee'}
                </div>
                <div className="text-xs text-ink-500">
                  {selectedRequest.employee?.department?.name || 'General Staff'}
                  {selectedRequest.employee?.jobPosition?.title && ` • ${selectedRequest.employee.jobPosition.title}`}
                </div>
              </div>
            </div>

            {/* Request Summary Fields */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-500">Leave Policy</span>
                <span className="font-semibold text-ink-900">
                  {selectedRequest.timeOffType?.name || selectedRequest.type || 'Standard Leave'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-500">Start Date</span>
                <span className="font-medium text-ink-800 tnum">{selectedRequest.startDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-500">End Date</span>
                <span className="font-medium text-ink-800 tnum">{selectedRequest.endDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-500">Requested Duration</span>
                <span className="font-bold text-ink-900 tnum">
                  {selectedRequest.duration} {selectedRequest.duration === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-ink-500 shrink-0">Reason / Purpose</span>
                <span className="font-medium text-ink-800 text-right text-xs max-w-[240px]">
                  {selectedRequest.reason || selectedRequest.decisionNote || 'Personal leave & time off'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-500">Current Status</span>
                <StatusDot type={selectedRequest.status.toLowerCase() as any} />
              </div>
            </div>

            {/* Allocation Balance Gauge (if linked) */}
            {selectedRequest.allocation && (
              <div className="p-3.5 bg-paper/60 rounded-lg border border-border-soft space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink-700">Allocation Balance</span>
                  <span className="font-bold text-emerald-700 tnum">
                    {selectedRequest.allocation.remaining ??
                      Math.max(
                        0,
                        (selectedRequest.allocation.allocated || 0) - (selectedRequest.allocation.taken || 0)
                      )}
                    d / {selectedRequest.allocation.allocated || 0}d available
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (((selectedRequest.allocation.remaining ??
                          (selectedRequest.allocation.allocated || 0) - (selectedRequest.allocation.taken || 0)) /
                          (selectedRequest.allocation.allocated || 1)) *
                          100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-ink-400">
                  <span>Taken: {selectedRequest.allocation.taken || 0} days</span>
                  <span>Total: {selectedRequest.allocation.allocated || 0} days</span>
                </div>
              </div>
            )}

            {/* Leave Reason / Purpose Card */}
            <div className="p-3.5 bg-paper/70 rounded-lg border border-border-soft space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 uppercase tracking-wider">
                <FileText size={13} className="text-ink-500" />
                <span>Leave Reason / Purpose</span>
              </div>
              <p className="text-xs md:text-sm text-ink-800 leading-relaxed font-medium">
                {selectedRequest.reason || selectedRequest.decisionNote || 'Personal leave & time off'}
              </p>
            </div>

            {/* Refusal Decision Note if status is REFUSED and note exists */}
            {selectedRequest.status.toUpperCase() === 'REFUSED' && selectedRequest.decisionNote && (
              <div className="p-3.5 bg-rose-50/70 rounded-lg border border-rose-200 space-y-1">
                <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                  Refusal Decision Note
                </div>
                <p className="text-xs md:text-sm text-rose-900 leading-relaxed">
                  {selectedRequest.decisionNote}
                </p>
              </div>
            )}

            {/* Approver info */}
            {selectedRequest.approver && (
              <div className="pt-3 border-t border-border-soft text-xs text-ink-500 flex items-center justify-between">
                <span>Processed by</span>
                <span className="font-medium text-ink-800">{selectedRequest.approver.email}</span>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: NEW TIME OFF REQUEST                                         */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Time Off Request"
        subtitle="Request leave dates and deduct from approved allocations"
        width="md"
        footer={
          <div className="flex justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateRequest}
              disabled={
                submitting ||
                !reqForm.timeOffTypeId ||
                !reqForm.startDate ||
                !reqForm.endDate ||
                (!isEmployee && !reqForm.employeeId) ||
                (selectedTypeObj?.requiresAllocation && (!relevantAllocation || (relevantAllocation.remaining ?? 0) < reqForm.duration))
              }
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs md:text-sm">
          {/* Employee Selector (if Manager/Admin) */}
          {!isEmployee && (
            <div>
              <label className="block font-semibold text-ink-800 mb-1">
                Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={reqForm.employeeId}
                onChange={(e) => setReqForm({ ...reqForm, employeeId: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
              >
                <option value="">Select Employee...</option>
                {Array.isArray(employees) &&
                  employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department?.name || 'General'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Leave Type Selector */}
          <div>
            <label className="block font-semibold text-ink-800 mb-1">
              Leave Policy <span className="text-rose-500">*</span>
            </label>
            <select
              value={reqForm.timeOffTypeId}
              onChange={(e) => setReqForm({ ...reqForm, timeOffTypeId: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            >
              <option value="">Select Leave Policy...</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.unit || 'DAYS'})
                </option>
              ))}
            </select>
          </div>

          {/* Live Balance Preview */}
          {selectedTypeObj?.requiresAllocation && (
            <div className="p-3 bg-paper rounded border border-border-soft">
              {relevantAllocation ? (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-600">Available Allocation Balance:</span>
                  <span className="font-bold text-emerald-700 tnum">
                    {relevantAllocation.remaining ??
                      Math.max(0, (relevantAllocation.allocated || 0) - (relevantAllocation.taken || 0))} days
                  </span>
                </div>
              ) : (
                <div className="text-xs text-rose-600 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>No approved allocation balance found for this policy.</span>
                </div>
              )}
            </div>
          )}

          {/* Date Range Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-800 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={reqForm.startDate}
                onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-800 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={reqForm.endDate}
                min={reqForm.startDate}
                onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
              />
            </div>
          </div>

          {/* Calculated Duration */}
          <div className="flex items-center justify-between p-2.5 bg-paper rounded border border-border-soft text-xs">
            <span className="text-ink-600">Calculated Duration:</span>
            <span className="font-bold text-ink-900 tnum">
              {reqForm.duration} {reqForm.duration === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="block font-semibold text-ink-800 mb-1">Reason / Notes</label>
            <textarea
              rows={2}
              value={reqForm.reason}
              onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
              placeholder="e.g. Annual family vacation, medical appointment..."
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            />
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: NEW ALLOCATION                                               */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        title="Create Leave Allocation"
        subtitle="Grant leave balance to an employee (creates PENDING record awaiting approval)"
        width="md"
        footer={
          <div className="flex justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAllocationModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateAllocation}
              disabled={submitting || !allocForm.employeeId || !allocForm.timeOffTypeId || !allocForm.allocated}
            >
              {submitting ? 'Creating...' : 'Grant Allocation'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateAllocation} className="space-y-4 text-xs md:text-sm">
          <div>
            <label className="block font-semibold text-ink-800 mb-1">
              Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={allocForm.employeeId}
              onChange={(e) => setAllocForm({ ...allocForm, employeeId: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            >
              <option value="">Select Employee...</option>
              {Array.isArray(employees) &&
                employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.department?.name || 'General'})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-800 mb-1">
              Leave Policy <span className="text-rose-500">*</span>
            </label>
            <select
              value={allocForm.timeOffTypeId}
              onChange={(e) => setAllocForm({ ...allocForm, timeOffTypeId: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            >
              <option value="">Select Leave Policy...</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.unit || 'DAYS'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-800 mb-1">
              Allocated Days <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={allocForm.allocated}
              onChange={(e) => setAllocForm({ ...allocForm, allocated: parseFloat(e.target.value) || 0 })}
              required
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-800 mb-1">
                Valid From <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={allocForm.validFrom}
                onChange={(e) => setAllocForm({ ...allocForm, validFrom: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink-800 mb-1">Valid To (Optional)</label>
              <input
                type="date"
                value={allocForm.validTo}
                min={allocForm.validFrom}
                onChange={(e) => setAllocForm({ ...allocForm, validTo: e.target.value })}
                className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: NEW LEAVE POLICY TYPE                                        */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title="Configure Leave Policy Type"
        subtitle="Define policy rules, unit measures, and payroll impact"
        width="md"
        footer={
          <div className="flex justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTypeModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateType}
              disabled={submitting || !typeForm.name.trim()}
            >
              {submitting ? 'Creating...' : 'Save Leave Policy'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateType} className="space-y-4 text-xs md:text-sm">
          <div>
            <label className="block font-semibold text-ink-800 mb-1">
              Policy Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Annual Leave, Casual Leave, Paternity Leave"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-800 mb-1">Unit of Measure</label>
            <select
              value={typeForm.unit}
              onChange={(e) => setTypeForm({ ...typeForm, unit: e.target.value as 'DAYS' | 'HOURS' })}
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            >
              <option value="DAYS">Days</option>
              <option value="HOURS">Hours</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={typeForm.requiresAllocation}
                onChange={(e) => setTypeForm({ ...typeForm, requiresAllocation: e.target.checked })}
                className="w-4 h-4 rounded text-ink-900 border-border focus:ring-ink-900"
              />
              <div>
                <div className="font-semibold text-ink-900">Requires Allocation Balance</div>
                <div className="text-[11px] text-ink-500">
                  Employees must have an approved balance before requesting this leave.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={typeForm.requiresApproval}
                onChange={(e) => setTypeForm({ ...typeForm, requiresApproval: e.target.checked })}
                className="w-4 h-4 rounded text-ink-900 border-border focus:ring-ink-900"
              />
              <div>
                <div className="font-semibold text-ink-900">Requires Manager Approval</div>
                <div className="text-[11px] text-ink-500">
                  Requests must be formally approved by an HR Manager or Admin.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={typeForm.affectsPayroll}
                onChange={(e) => setTypeForm({ ...typeForm, affectsPayroll: e.target.checked })}
                className="w-4 h-4 rounded text-ink-900 border-border focus:ring-ink-900"
              />
              <div>
                <div className="font-semibold text-ink-900">Affects Payroll Calculations</div>
                <div className="text-[11px] text-ink-500">
                  Unpaid or unapproved absences will impact sequential salary computation rules.
                </div>
              </div>
            </label>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: EDIT LEAVE POLICY TYPE                                       */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={isEditTypeModalOpen}
        onClose={() => {
          setIsEditTypeModalOpen(false);
          setEditingType(null);
        }}
        title="Edit Leave Policy Type"
        subtitle={editingType ? `Update configuration for "${editingType.name}"` : 'Update leave policy rules'}
        width="md"
        footer={
          <div className="flex justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditTypeModalOpen(false);
                setEditingType(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdateType}
              disabled={submitting || !editTypeForm.name.trim()}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUpdateType} className="space-y-4 text-xs md:text-sm">
          <div>
            <label className="block font-semibold text-ink-800 mb-1">
              Policy Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editTypeForm.name}
              onChange={(e) => setEditTypeForm({ ...editTypeForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-800 mb-1">Unit of Measure</label>
            <select
              value={editTypeForm.unit}
              onChange={(e) => setEditTypeForm({ ...editTypeForm, unit: e.target.value as 'DAYS' | 'HOURS' })}
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            >
              <option value="DAYS">Days</option>
              <option value="HOURS">Hours</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editTypeForm.requiresAllocation}
                onChange={(e) => setEditTypeForm({ ...editTypeForm, requiresAllocation: e.target.checked })}
                className="w-4 h-4 rounded text-ink-900 border-border focus:ring-ink-900"
              />
              <div>
                <div className="font-semibold text-ink-900">Requires Allocation Balance</div>
                <div className="text-[11px] text-ink-500">
                  Employees must have an approved balance before requesting this leave.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editTypeForm.requiresApproval}
                onChange={(e) => setEditTypeForm({ ...editTypeForm, requiresApproval: e.target.checked })}
                className="w-4 h-4 rounded text-ink-900 border-border focus:ring-ink-900"
              />
              <div>
                <div className="font-semibold text-ink-900">Requires Manager Approval</div>
                <div className="text-[11px] text-ink-500">
                  Requests must be formally approved by an HR Manager or Admin.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editTypeForm.affectsPayroll}
                onChange={(e) => setEditTypeForm({ ...editTypeForm, affectsPayroll: e.target.checked })}
                className="w-4 h-4 rounded text-ink-900 border-border focus:ring-ink-900"
              />
              <div>
                <div className="font-semibold text-ink-900">Affects Payroll Calculations</div>
                <div className="text-[11px] text-ink-500">
                  Unpaid or unapproved absences will impact sequential salary computation rules.
                </div>
              </div>
            </label>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: REFUSAL DECISION NOTE                                        */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        open={isRefuseModalOpen}
        onClose={() => setIsRefuseModalOpen(false)}
        title="Refuse Leave Request"
        subtitle="Please provide an optional reason for refusing this request"
        width="sm"
        footer={
          <div className="flex justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRefuseModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRefuseRequest}
              disabled={submitting}
            >
              {submitting ? 'Refusing...' : 'Confirm Refusal'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs md:text-sm">
          <p className="text-ink-600">
            Are you sure you want to refuse this request? Note that refusal is terminal and the allocation balance will be preserved.
          </p>
          <div>
            <label className="block font-semibold text-ink-800 mb-1">Decision Note / Reason</label>
            <textarea
              rows={3}
              value={refuseDecisionNote}
              onChange={(e) => setRefuseDecisionNote(e.target.value)}
              placeholder="e.g. Critical project deadline, overlapping requests in department..."
              className="w-full px-3 py-2 text-xs md:text-sm rounded border border-border bg-surface text-ink-900 focus:outline-none focus:border-ink-900"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
