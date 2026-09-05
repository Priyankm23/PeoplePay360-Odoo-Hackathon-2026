import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Pencil,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Building2,
  IndianRupee,
  Briefcase,
  Clock,
  Ban,
  Archive,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import type { UserSession, View } from '@/types';

interface ContractsPageProps {
  employeeId?: string;
  userSession?: UserSession | null;
  onNavigate?: (view: View, id?: string) => void;
}

export function ContractsPage({
  employeeId: initialEmployeeId,
  userSession,
  onNavigate,
}: ContractsPageProps) {
  const roleStr = (userSession?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canEdit =
    roleStr === 'ADMIN' ||
    roleStr === 'HR_MANAGER' ||
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Manager';

  // State
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterEmployeeId, setFilterEmployeeId] = useState<string | undefined>(initialEmployeeId);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Lookup options
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  const [workingSchedules, setWorkingSchedules] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobPositions, setJobPositions] = useState<any[]>([]);

  // Modals & Active Selection
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formStructureId, setFormStructureId] = useState('');
  const [formScheduleId, setFormScheduleId] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formJobPositionId, setFormJobPositionId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formWage, setFormWage] = useState<string>('50000');

  // Load contracts
  const fetchContracts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.contracts.getAll({
        employeeId: filterEmployeeId,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
      });
      setContracts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setIsLoading(false);
    }
  };

  // Load lookups
  const loadLookups = async () => {
    try {
      const [lookupMeta, empRes, deptRes, posRes] = await Promise.all([
        api.contracts.getLookupOptions(),
        api.employees.getAll({ limit: 100 }),
        api.departments.getAll(),
        api.jobPositions.getAll(),
      ]);
      setSalaryStructures(lookupMeta.salaryStructures || []);
      setWorkingSchedules(lookupMeta.workingSchedules || []);
      setEmployees(empRes.items || []);
      setDepartments(deptRes || []);
      setJobPositions(posRes || []);
    } catch (err) {
      console.error('Failed to load lookup metadata', err);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [filterEmployeeId, selectedStatus, searchQuery]);

  // Handle employee selection in creation form (auto-fill defaults)
  const handleFormEmployeeChange = (empId: string) => {
    setFormEmployeeId(empId);
    const chosenEmp = employees.find((e) => e.id === empId);
    if (chosenEmp) {
      if (chosenEmp.department?.id) setFormDepartmentId(chosenEmp.department.id);
      if (chosenEmp.jobPosition?.id) setFormJobPositionId(chosenEmp.jobPosition.id);
      if (chosenEmp.workingScheduleId) setFormScheduleId(chosenEmp.workingScheduleId);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setFormError(null);
    const defaultEmpId = filterEmployeeId || employees[0]?.id || '';
    handleFormEmployeeChange(defaultEmpId);
    setFormStructureId(salaryStructures[0]?.id || '');
    setFormScheduleId(workingSchedules[0]?.id || '');
    const today = new Date().toISOString().slice(0, 10);
    setFormStartDate(today);
    setFormEndDate('');
    setFormWage('50000');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (contract: any) => {
    setIsEditing(true);
    setFormError(null);
    setFormEmployeeId(contract.employeeId);
    setFormStructureId(contract.salaryStructureId || contract.salaryStructure?.id || '');
    setFormScheduleId(contract.workingScheduleId || contract.workingSchedule?.id || '');
    setFormDepartmentId(contract.departmentId || contract.department?.id || '');
    setFormJobPositionId(contract.jobPositionId || contract.jobPosition?.id || '');
    setFormStartDate(contract.startDate ? contract.startDate.slice(0, 10) : '');
    setFormEndDate(contract.endDate ? contract.endDate.slice(0, 10) : '');
    setFormWage(String(contract.wage || '50000'));
    setIsFormOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formEmployeeId) {
      setFormError('Please select an employee.');
      return;
    }
    if (!formStructureId) {
      setFormError('Please select a salary structure.');
      return;
    }
    if (!formStartDate) {
      setFormError('Start date is required.');
      return;
    }
    if (formEndDate && formEndDate < formStartDate) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    const wageNum = parseFloat(formWage);
    if (isNaN(wageNum) || wageNum <= 0) {
      setFormError('Wage must be a valid positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && selectedContract) {
        await api.contracts.update(selectedContract.id, {
          salaryStructureId: formStructureId,
          workingScheduleId: formScheduleId || null,
          departmentId: formDepartmentId || null,
          jobPositionId: formJobPositionId || null,
          startDate: formStartDate,
          endDate: formEndDate || null,
          wage: wageNum,
        });
      } else {
        await api.contracts.create({
          employeeId: formEmployeeId,
          salaryStructureId: formStructureId,
          workingScheduleId: formScheduleId || null,
          departmentId: formDepartmentId || null,
          jobPositionId: formJobPositionId || null,
          startDate: formStartDate,
          endDate: formEndDate || null,
          wage: wageNum,
        });
      }
      setIsFormOpen(false);
      await fetchContracts();
      if (selectedContract) {
        const refreshed = await api.contracts.getById(selectedContract.id);
        setSelectedContract(refreshed);
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lifecycle: Activate Contract
  const handleActivate = async (contractId: string) => {
    setError(null);
    setFormError(null);
    try {
      const updated = await api.contracts.activate(contractId);
      await fetchContracts();
      if (selectedContract?.id === contractId) {
        setSelectedContract(updated);
      }
    } catch (err: any) {
      if (err.code === 'CONTRACT_OVERLAP') {
        const msg = `Contract Overlap: ${err.message || 'This employee already has an active contract covering part of this period.'}`;
        setError(msg);
        setFormError(msg);
      } else {
        setError(err.message || 'Failed to activate contract.');
      }
    }
  };

  // Lifecycle: Cancel Contract
  const handleCancel = async (contractId: string) => {
    if (!confirm('Are you sure you want to cancel this contract?')) return;
    try {
      const updated = await api.contracts.cancel(contractId);
      await fetchContracts();
      if (selectedContract?.id === contractId) {
        setSelectedContract(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel contract.');
    }
  };

  // Lifecycle: Archive / Delete Contract
  const handleArchive = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete / archive this contract?')) return;
    try {
      await api.contracts.archive(contractId);
      setIsDetailOpen(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (err: any) {
      setError(err.message || 'Failed to archive contract.');
    }
  };

  const getStatusBadge = (status: string, isActive?: boolean) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isActive ? 'Running Active' : 'Running'}
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Expired
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-ink-500">{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const activeEmployeeObj = filterEmployeeId
    ? employees.find((e) => e.id === filterEmployeeId)
    : null;

  const minEndDate = formStartDate
    ? (() => {
        const d = new Date(formStartDate);
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })()
    : undefined;

  const conflictingRunningContract = contracts.find((c) => {
    if (c.id === editingContractId) return false;
    if (c.employeeId !== formEmployeeId || c.status !== 'RUNNING') return false;
    const cStart = c.startDate;
    const cEnd = c.endDate || '9999-12-31';
    const myStart = formStartDate;
    const myEnd = formEndDate || '9999-12-31';
    return myStart && myStart <= cEnd && myEnd >= cStart;
  });


  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Error */}
      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Action Prevented</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Employment Contracts"
        subtitle={
          activeEmployeeObj
            ? `Contracts for ${activeEmployeeObj.firstName} ${activeEmployeeObj.lastName}`
            : `${contracts.length} contract record${contracts.length === 1 ? '' : 's'} managed`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchContracts}
              disabled={isLoading}
              title="Refresh contract list"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            {canEdit && (
              <Button variant="primary" size="md" onClick={openCreateModal}>
                <Plus size={15} />
                New Contract
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Pill if scoped to single employee */}
      {activeEmployeeObj && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
          <span>Filtered by employee:</span>
          <strong>
            {activeEmployeeObj.firstName} {activeEmployeeObj.lastName}
          </strong>
          <button
            onClick={() => setFilterEmployeeId(undefined)}
            className="ml-1 text-emerald-600 hover:text-emerald-900 font-bold"
            title="Clear employee filter"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="p-4 bg-white border border-border rounded-sm-md shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            placeholder="Search by employee, email, or contract code (CON/2026/...)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-paper p-1 rounded border border-border text-xs">
          {['ALL', 'RUNNING', 'DRAFT', 'EXPIRED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded transition-colors font-medium capitalize ${
                selectedStatus === st
                  ? 'bg-white text-ink-900 shadow-2xs font-semibold'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-ink-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            Loading contracts...
          </div>
        ) : contracts.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="mx-auto text-ink-300 mb-2" />
            <p className="text-sm font-semibold text-ink-700">No contracts found</p>
            <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto">
              {searchQuery || selectedStatus !== 'ALL' || filterEmployeeId
                ? 'Try adjusting your search or status filters.'
                : 'Get started by creating a new contract for an employee.'}
            </p>
          </div>
        ) : (
          <Table className="[&>table]:table-fixed border border-[#E7EAE7] rounded-sm-md shadow-none">
            <THead>
              <TH className="w-[8%]">Contract</TH>
              <TH className="w-[15%]">Employee</TH>
              <TH className="w-[14%]">Role &amp; Dept</TH>
              <TH className="w-[15%]">Validity Period</TH>
              <TH className="w-[12%]">Wage</TH>
              <TH className="w-[17%]">Salary Structure</TH>
              <TH align="center" className="w-[9%]">Status</TH>
              <TH align="right" className="w-[8%]">Actions</TH>
            </THead>
            <TBody>
              {contracts.map((c) => {
                const emp = c.employee;
                return (
                  <TR
                    key={c.id}
                    className="cursor-pointer hover:bg-emerald-50/20 transition-colors"
                    onClick={() => {
                      setSelectedContract(c);
                      setIsDetailOpen(true);
                    }}
                  >
                    {/* Contract Reference */}
                    <TD>
                      <span className="font-mono text-xs font-bold text-ink-900 bg-paper px-2.5 py-1 rounded border border-border inline-flex items-center gap-1.5 shadow-3xs">
                        <FileText size={13} className="text-emerald-600 shrink-0" />
                        {c.reference || 'CON/----/---'}
                      </span>
                    </TD>

                    {/* Employee info */}
                    <TD className="pl-14">
                      <div>
                          <div className="font-semibold text-ink-900">
                            {emp?.firstName} {emp?.lastName}
                          </div>
                          <div className="text-[11px] text-ink-400">{emp?.email}</div>
                      </div>
                    </TD>

                    {/* Department & Role */}
                    <TD>
                      <div className="text-xs font-medium text-ink-900">
                        {c.jobPosition?.title || '—'}
                      </div>
                      <div className="text-[11px] text-ink-400">
                        {c.department?.name || 'No department'}
                      </div>
                    </TD>

                    {/* Validity Period */}
                    <TD className="tnum">
                      <div className="text-xs text-ink-900 flex items-center gap-1.5">
                        <span>{c.startDate}</span>
                        <span className="text-ink-300">→</span>
                        <span>{c.endDate || 'Indefinite'}</span>
                      </div>
                      {c.isActive && (
                        <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                          Current Active Contract
                        </span>
                      )}
                    </TD>

                    {/* Wage */}
                    <TD className="tnum">
                      <span className="font-semibold text-ink-900">{formatCurrency(c.wage)}</span>
                      <span className="text-[11px] text-ink-400 block">/ month</span>
                    </TD>

                    {/* Salary Structure */}
                    <TD>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-paper border border-border text-ink-700 font-medium">
                        <Building2 size={12} className="text-ink-400" />
                        {c.salaryStructure?.name || 'Standard'}
                      </span>
                    </TD>

                    {/* Status */}
                    <TD align="center">{getStatusBadge(c.status, c.isActive)}</TD>

                    {/* Quick Actions */}
                    <TD align="right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && c.status === 'DRAFT' && (
                          <button
                            onClick={() => handleActivate(c.id)}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 border border-emerald-200"
                            title="Activate Contract"
                          >
                            <Check size={12} />
                            Activate
                          </button>
                        )}
                        {canEdit && c.status === 'RUNNING' && (
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1 rounded text-ink-400 hover:text-ink-700 hover:bg-paper"
                            title="Edit terms"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedContract(c);
                            setIsDetailOpen(true);
                          }}
                        >
                          View
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

      {/* ======================================================== */}
      {/* CONTRACT DETAILS MODAL / DRAWER                          */}
      {/* ======================================================== */}
      {selectedContract && (
        <Modal
          open={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedContract?.reference ? `Contract Details — ${selectedContract.reference}` : 'Contract Details'}
          width="lg"
        >
          <div className="space-y-6">
            {/* Header card with status */}
            <div className="p-4 bg-paper rounded-sm-md border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  firstName={selectedContract.employee?.firstName || ''}
                  lastName={selectedContract.employee?.lastName || ''}
                  color="bg-emerald-600"
                  size="md"
                />
                <div>
                  <h3 className="font-bold text-ink-900 text-base">
                    {selectedContract.employee?.firstName} {selectedContract.employee?.lastName}
                  </h3>
                  <p className="text-xs text-ink-500">{selectedContract.employee?.email}</p>
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(selectedContract.status, selectedContract.isActive)}
                <div className="font-mono text-xs font-bold text-ink-700 mt-1">{selectedContract.reference || `ID: ${selectedContract.id.slice(0, 8)}`}</div>
              </div>
            </div>

            {/* Error inside modal if activation conflict occurred */}
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <span className="font-bold">Error:</span> {formError}
                </div>
              </div>
            )}

            {/* Contract Specifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-surface rounded border border-border">
                <span className="text-xs text-ink-400 block mb-1 flex items-center gap-1">
                  <IndianRupee size={13} className="text-emerald-600" />
                  Monthly Compensation
                </span>
                <span className="text-lg font-bold text-ink-900">
                  {formatCurrency(selectedContract.wage)}
                </span>
                <span className="text-xs text-ink-400 ml-1">/ month</span>
              </div>

              <div className="p-3 bg-surface rounded border border-border">
                <span className="text-xs text-ink-400 block mb-1 flex items-center gap-1">
                  <Building2 size={13} className="text-blue-600" />
                  Salary Structure (Rules Engine)
                </span>
                <span className="text-sm font-semibold text-ink-900">
                  {selectedContract.salaryStructure?.name || 'Standard'}
                </span>
              </div>

              <div className="p-3 bg-surface rounded border border-border">
                <span className="text-xs text-ink-400 block mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-amber-600" />
                  Validity Window
                </span>
                <span className="text-xs font-semibold text-ink-900">
                  {selectedContract.startDate} — {selectedContract.endDate || 'Open-Ended (Present)'}
                </span>
              </div>

              <div className="p-3 bg-surface rounded border border-border">
                <span className="text-xs text-ink-400 block mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-purple-600" />
                  Assigned Working Schedule
                </span>
                <span className="text-xs font-semibold text-ink-900">
                  {selectedContract.workingSchedule?.name || 'Standard Full-Time'}
                </span>
              </div>
            </div>

            {/* Department and Job Position */}
            <div className="p-4 bg-paper rounded border border-border text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-500">Department:</span>
                <span className="font-medium text-ink-900">
                  {selectedContract.department?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Job Title:</span>
                <span className="font-medium text-ink-900">
                  {selectedContract.jobPosition?.title || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Payslips Generated:</span>
                <span className="font-medium text-ink-900 tnum">
                  {selectedContract._count?.payslips ?? 0} payslips
                </span>
              </div>
            </div>

            {/* Action Buttons for Authorized Roles */}
            {canEdit && (
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedContract.status === 'DRAFT' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleActivate(selectedContract.id)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={14} />
                      Activate Contract
                    </Button>
                  )}
                  {selectedContract.status === 'RUNNING' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(selectedContract.id)}
                      className="text-rose-600 hover:border-rose-300"
                    >
                      <Ban size={14} />
                      Cancel Contract
                    </Button>
                  )}
                  {(selectedContract.status === 'DRAFT' || selectedContract.status === 'RUNNING') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsDetailOpen(false);
                        openEditModal(selectedContract);
                      }}
                    >
                      <Pencil size={14} />
                      Edit Terms
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(selectedContract.id)}
                  className="text-ink-400 hover:text-rose-600 hover:border-rose-300"
                  title="Archive contract"
                >
                  <Archive size={14} />
                  Archive
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT CONTRACT MODAL                             */}
      {/* ======================================================== */}
      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? 'Edit Employment Contract' : 'Create New Contract'}
        width="lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Employee Selector (Disabled in edit mode) */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Employee *</label>
            <select
              value={formEmployeeId}
              onChange={(e) => handleFormEmployeeChange(e.target.value)}
              disabled={isEditing}
              className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600 disabled:opacity-60"
            >
              <option value="">Select Employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Salary Structure */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Salary Structure *
              </label>
              <select
                value={formStructureId}
                onChange={(e) => setFormStructureId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              >
                <option value="">Select Salary Structure...</option>
                {salaryStructures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-400 mt-1">
                Dictates rule calculations (Basic, HRA, PF) during Payruns.
              </p>
            </div>

            {/* Working Schedule */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Working Schedule
              </label>
              <select
                value={formScheduleId}
                onChange={(e) => setFormScheduleId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              >
                <option value="">Select Schedule...</option>
                {workingSchedules.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Department</label>
              <select
                value={formDepartmentId}
                onChange={(e) => setFormDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Position */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Job Position</label>
              <select
                value={formJobPositionId}
                onChange={(e) => setFormJobPositionId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              >
                <option value="">Select Job Position...</option>
                {jobPositions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Monthly Wage */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Monthly Wage (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formWage}
                onChange={(e) => setFormWage(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                min={minEndDate}
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              />
              <p className="text-[10px] text-ink-400 mt-1">Leave blank for indefinite contract.</p>
            </div>
          </div>

          {/* Overlap Notice Banner while drafting */}
          {conflictingRunningContract && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Notice: Overlapping Contract Period</p>
                <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                  This employee already has an active contract ({conflictingRunningContract.reference || conflictingRunningContract.id.slice(0, 8)}) from{' '}
                  <span className="font-semibold">{conflictingRunningContract.startDate}</span> to{' '}
                  <span className="font-semibold">{conflictingRunningContract.endDate || 'indefinite'}</span>.
                  You can save this contract as <span className="font-semibold">DRAFT</span>, but you will not be able to activate it until the running contract expires, is updated, or cancelled.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Contract'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
