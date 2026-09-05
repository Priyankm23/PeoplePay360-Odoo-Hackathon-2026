import { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Pencil,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import type { UserSession, View } from '@/types';

interface AttendancePageProps {
  employeeId?: string;
  userSession?: UserSession | null;
  onNavigate?: (view: View, id?: string) => void;
  refreshKey?: number;
}

export function AttendancePage({
  employeeId,
  userSession,
  onNavigate,
  refreshKey,
}: AttendancePageProps) {
  const isEmployee = userSession?.role === 'Employee';
  const canManageAttendance =
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Manager' ||
    userSession?.role === 'HR Payroll User' ||
    userSession?.role === 'HR Payroll Manager';

  // Records state
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [todayFilter, setTodayFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>(employeeId || '');

  // Employee lookup list (for managers filter)
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Detailed Record Form View ("Big Hawk" / "Joyful Parrot")
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Correction Modal State
  const [correctingRecord, setCorrectingRecord] = useState<any | null>(null);
  const [corrCheckIn, setCorrCheckIn] = useState('');
  const [corrCheckOut, setCorrCheckOut] = useState('');
  const [corrWorkedHours, setCorrWorkedHours] = useState('');
  const [corrStatus, setCorrStatus] = useState<string>('MANUALLY_CORRECTED');
  const [corrNote, setCorrNote] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Fetch employees list for filtering (if manager)
  useEffect(() => {
    if (!isEmployee) {
      api.employees
        .getAll({ limit: 200 })
        .then((res: any) => {
          if (Array.isArray(res)) setEmployeesList(res);
          else if (Array.isArray(res?.data)) setEmployeesList(res.data);
          else if (Array.isArray(res?.employees)) setEmployeesList(res.employees);
        })
        .catch(() => {});
    }
  }, [isEmployee]);

  // Fetch live attendance records
  const fetchAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.attendance.getAll({
        employeeId: selectedEmpFilter || (isEmployee ? userSession?.employeeId : undefined),
        today: todayFilter ? true : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setRecords(data || []);

      // If a record was currently being viewed in detail, refresh its data
      if (selectedRecord) {
        const updated = (data || []).find((r: any) => r.id === selectedRecord.id);
        if (updated) setSelectedRecord(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedEmpFilter, todayFilter, statusFilter, refreshKey]);

  // Open correction modal
  const openCorrection = (record: any) => {
    setCorrectingRecord(record);
    setCorrectionError(null);

    // Format ISO to datetime-local string (YYYY-MM-DDTHH:mm)
    const toLocalInput = (iso?: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };

    setCorrCheckIn(toLocalInput(record.checkIn));
    setCorrCheckOut(toLocalInput(record.checkOut));
    setCorrWorkedHours(record.workedHours !== null ? String(record.workedHours) : '');
    setCorrStatus(record.status || 'MANUALLY_CORRECTED');
    setCorrNote(record.correctionNote || '');
  };

  // Submit manual correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrNote.trim()) {
      setCorrectionError('A correction note is required to explain this change.');
      return;
    }

    try {
      setIsSubmittingCorrection(true);
      setCorrectionError(null);

      const payload: any = {
        checkIn: corrCheckIn ? new Date(corrCheckIn).toISOString() : null,
        checkOut: corrCheckOut ? new Date(corrCheckOut).toISOString() : null,
        status: corrStatus,
        correctionNote: corrNote.trim(),
      };

      if (corrWorkedHours) {
        payload.workedHours = parseFloat(corrWorkedHours);
      }

      const updated = await api.attendance.correct(correctingRecord.id, payload);

      // Update state
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedRecord?.id === updated.id) {
        setSelectedRecord(updated);
      }
      setCorrectingRecord(null);
    } catch (err: any) {
      setCorrectionError(err.message || 'Failed to save correction');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Client-side search filtering by employee name or email
  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    const email = (r.employee?.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time helper (e.g. 09:05 AM)
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '—';
    const d = new Date(timeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format datetime helper (e.g. 02-Sep-2026 09:01)
  const formatDateTime = (timeStr?: string | null) => {
    if (!timeStr) return '—';
    const d = new Date(timeStr);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Present
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Late
          </span>
        );
      case 'OVERTIME':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Overtime
          </span>
        );
      case 'MISSING_CHECKOUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Missing Checkout
          </span>
        );
      case 'MANUALLY_CORRECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Corrected
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-paper text-ink-700">
            {status}
          </span>
        );
    }
  };

  // ==========================================
  // VIEW 2: FORM / DETAIL VIEW ("Big Hawk" / "Joyful Parrot")
  // ==========================================
  if (selectedRecord) {
    const emp = selectedRecord.employee;
    const overtimeHours =
      selectedRecord.status === 'OVERTIME' && selectedRecord.workedHours
        ? Math.max(0, Number(selectedRecord.workedHours) - 8).toFixed(2)
        : '0.00';

    return (
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <button
              onClick={() => setSelectedRecord(null)}
              className="inline-flex items-center gap-1 text-ink-600 hover:text-ink-900 font-medium transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Attendance</span>
            </button>
            <span>/</span>
            <span className="text-ink-700 font-medium">
              {emp?.firstName} {emp?.lastName}
            </span>
            <span>/</span>
            <span className="text-ink-900 font-semibold">{formatDate(selectedRecord.date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRecord(null)}
            >
              Back to List
            </Button>
            {canManageAttendance && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openCorrection(selectedRecord)}
              >
                <Pencil size={13} />
                <span>Edit / Correct</span>
              </Button>
            )}
          </div>
        </div>

        <PageHeader
          title={`Attendance / ${emp?.firstName} ${emp?.lastName} / ${formatDate(selectedRecord.date)}`}
          subtitle="Form view of employee attendance record"
        />

        {/* Detailed Form Card */}
        <div className="bg-surface border border-border rounded-xl shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Employee
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm font-medium text-ink-900 flex items-center gap-2.5">
                  <User size={16} className="text-ink-400" />
                  <span>
                    {emp?.firstName} {emp?.lastName}
                  </span>
                  <span className="text-xs text-ink-400 font-normal">({emp?.email})</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Check In
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm text-ink-900 tnum flex items-center gap-2.5">
                  <Clock size={16} className="text-emerald-600" />
                  <span>{formatDateTime(selectedRecord.checkIn)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Check Out
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm text-ink-900 tnum flex items-center gap-2.5">
                  <Clock size={16} className="text-red-500" />
                  <span>
                    {selectedRecord.checkOut ? (
                      formatDateTime(selectedRecord.checkOut)
                    ) : (
                      <span className="text-amber-600 font-medium">Session in progress (Not checked out)</span>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Worked Hours
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm font-semibold text-ink-900 tnum">
                  {selectedRecord.workedHours !== null ? `${selectedRecord.workedHours} hrs` : '—'}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Department
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm text-ink-900 flex items-center gap-2.5">
                  <Building2 size={16} className="text-ink-400" />
                  <span>{emp?.department?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Manager
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm text-ink-900 flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-ink-400" />
                  <span>
                    {emp?.manager
                      ? `${emp.manager.firstName} ${emp.manager.lastName}`
                      : 'None'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Status
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm">
                  {renderStatusBadge(selectedRecord.status)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                  Overtime
                </label>
                <div className="px-3.5 py-2.5 bg-paper/50 border border-border rounded-lg text-sm font-semibold text-ink-900 tnum">
                  {overtimeHours} hrs
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="pt-4 border-t border-border">
            <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <p className="text-xs text-ink-500">
              System-generated from check-in/out or manually corrected by an authorized user.
            </p>

            {selectedRecord.correctionNote && (
              <div className="mt-3 p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-xs space-y-1">
                <div className="font-semibold text-sky-900 flex items-center gap-1.5">
                  <Pencil size={13} />
                  <span>Manual Correction Audit Note</span>
                </div>
                <p className="text-sky-800 italic">"{selectedRecord.correctionNote}"</p>
                {selectedRecord.correctedBy && (
                  <p className="text-sky-600 text-[11px] pt-1">
                    Applied by: <strong>{selectedRecord.correctedBy.email}</strong> ({selectedRecord.correctedBy.role})
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Useful note footnote */}
        <p className="text-xs text-ink-400 italic">
          Useful note: worked hours and overtime should be easy to read because they may later influence payroll or reporting.
        </p>

        {/* Correction Modal */}
        {renderCorrectionModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW 1: LIST VIEW ("Substantial Fox")
  // ==========================================
  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        subtitle={
          isLoading
            ? 'Fetching live attendance records...'
            : `${filteredRecords.length} attendance records found`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={fetchAttendance}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 border border-border rounded-xl">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search attendance by employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:border-ink-400"
            />
          </div>

          {/* Today Filter Toggle */}
          <button
            type="button"
            onClick={() => setTodayFilter(!todayFilter)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              todayFilter
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                : 'bg-paper text-ink-600 border-border hover:bg-paper/80'
            }`}
          >
            <Calendar size={13} />
            <span>Today</span>
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-700 focus:outline-none focus:border-ink-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="OVERTIME">Overtime</option>
            <option value="MISSING_CHECKOUT">Missing Checkout</option>
            <option value="MANUALLY_CORRECTED">Manually Corrected</option>
          </select>

          {/* Employee Filter (Managers only) */}
          {!isEmployee && employeesList.length > 0 && (
            <select
              value={selectedEmpFilter}
              onChange={(e) => setSelectedEmpFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-700 focus:outline-none focus:border-ink-400 max-w-[180px]"
            >
              <option value="">All Employees</option>
              {employeesList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="text-xs text-ink-400">
          Showing {filteredRecords.length} record(s)
        </div>
      </div>

      {/* Attendance Table */}
      <Table>
        <THead>
          <TH className="w-1/4">Employee</TH>
          <TH className="w-1/6">Date</TH>
          <TH className="w-1/6">Check In</TH>
          <TH className="w-1/6">Check Out</TH>
          <TH className="w-1/8">Worked Hours</TH>
          <TH className="w-1/8">Status</TH>
          {canManageAttendance && <TH align="right" className="w-20">Actions</TH>}
        </THead>
        <TBody>
          {isLoading ? (
            <TR>
              <TD colSpan={canManageAttendance ? 7 : 6} className="text-center py-12 text-ink-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading attendance records...</span>
                </div>
              </TD>
            </TR>
          ) : filteredRecords.length === 0 ? (
            <TR>
              <TD colSpan={canManageAttendance ? 7 : 6} className="text-center py-12 text-ink-400">
                No attendance records match the selected criteria.
              </TD>
            </TR>
          ) : (
            filteredRecords.map((record) => {
              const emp = record.employee;
              return (
                <TR
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="cursor-pointer hover:bg-paper/60 transition-colors"
                >
                  <TD className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        firstName={emp?.firstName || 'E'}
                        lastName={emp?.lastName || ''}
                        color="bg-emerald-600"
                        size="sm"
                      />
                      <div>
                        <div className="text-ink-900 font-semibold text-xs">
                          {emp?.firstName} {emp?.lastName}
                        </div>
                        <div className="text-[11px] text-ink-400">{emp?.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-xs text-ink-700 tnum">{formatDate(record.date)}</TD>
                  <TD className="text-xs text-ink-800 font-medium tnum">
                    {formatTime(record.checkIn)}
                  </TD>
                  <TD className="text-xs text-ink-800 font-medium tnum">
                    {record.status === 'MISSING_CHECKOUT' ? (
                      <span className="inline-flex items-center gap-1 text-status-danger font-medium" title="Missing checkout punch">
                        <AlertCircle size={13} />
                        <span>Missing</span>
                      </span>
                    ) : record.checkOut ? (
                      formatTime(record.checkOut)
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </TD>
                  <TD className="text-xs font-semibold text-ink-900 tnum">
                    {record.workedHours !== null ? `${record.workedHours}h` : '—'}
                  </TD>
                  <TD>{renderStatusBadge(record.status)}</TD>
                  {canManageAttendance && (
                    <TD align="right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openCorrection(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-paper border border-border transition-colors"
                          title="Correct Attendance Record"
                        >
                          <Pencil size={12} />
                          <span>Correct</span>
                        </button>
                      </div>
                    </TD>
                  )}
                </TR>
              );
            })
          )}
        </TBody>
      </Table>

      <p className="text-xs text-ink-400 italic">
        Useful note: list view should help users review raw check-in / check-out data and identify missing punches quickly.
      </p>

      {/* Correction Modal */}
      {renderCorrectionModal()}
    </div>
  );

  // ==========================================
  // CORRECTION MODAL COMPONENT
  // ==========================================
  function renderCorrectionModal() {
    if (!correctingRecord) return null;

    const emp = correctingRecord.employee;

    return (
      <Modal
        open={Boolean(correctingRecord)}
        onClose={() => setCorrectingRecord(null)}
        title="Correct Attendance Record"
      >
        <form onSubmit={handleSaveCorrection} className="space-y-4">
          {correctionError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {correctionError}
            </div>
          )}

          <div className="p-3 bg-paper/60 rounded-lg border border-border/80 text-xs space-y-1">
            <div className="font-semibold text-ink-900">
              {emp?.firstName} {emp?.lastName}
            </div>
            <div className="text-ink-500">
              Date: {formatDate(correctingRecord.date)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Check In Time
              </label>
              <input
                type="datetime-local"
                value={corrCheckIn}
                onChange={(e) => setCorrCheckIn(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:border-ink-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Check Out Time
              </label>
              <input
                type="datetime-local"
                value={corrCheckOut}
                onChange={(e) => setCorrCheckOut(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:border-ink-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Worked Hours (Override)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="24"
                placeholder="Auto-calculated if blank"
                value={corrWorkedHours}
                onChange={(e) => setCorrWorkedHours(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:border-ink-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Status
              </label>
              <select
                value={corrStatus}
                onChange={(e) => setCorrStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:border-ink-400"
              >
                <option value="MANUALLY_CORRECTED">Manually Corrected</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="OVERTIME">Overtime</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Correction Note * <span className="text-ink-400 font-normal">(audit reason)</span>
            </label>
            <textarea
              rows={3}
              value={corrNote}
              onChange={(e) => setCorrNote(e.target.value)}
              placeholder="e.g. Employee forgot to punch out at end of shift; confirmed with manager."
              className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:border-ink-400 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCorrectingRecord(null)}
              disabled={isSubmittingCorrection}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmittingCorrection}
            >
              {isSubmittingCorrection ? 'Saving...' : 'Save Correction'}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }
}
