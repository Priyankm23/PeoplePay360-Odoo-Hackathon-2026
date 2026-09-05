import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  Users,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { formatCurrency } from '@/data';
import type { View, Payrun, UserSession } from '@/types';
import { cn } from '@/lib/utils';

interface PayrunDetailPageProps {
  payrunId?: string;
  onNavigate: (view: View, id?: string) => void;
  userSession?: UserSession | null;
}

const statusOrder = ['draft', 'computed', 'validated', 'paid'] as const;

export function PayrunDetailPage({ payrunId, onNavigate, userSession }: PayrunDetailPageProps) {
  const [payrun, setPayrun] = useState<Payrun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const userRole = userSession?.role;
  const isManagerOrAdmin = userRole === 'Admin' || userRole === 'HR Payroll Manager';
  const isPayrollUser = userRole === 'HR Payroll User';

  const fetchPayrun = useCallback(async () => {
    if (!payrunId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.payruns.getById(payrunId);
      const data = res.data || res;
      setPayrun(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payrun details');
    } finally {
      setLoading(false);
    }
  }, [payrunId]);

  useEffect(() => {
    fetchPayrun();
  }, [fetchPayrun]);

  if (!payrunId) {
    return (
      <div className="p-8 text-center text-ink-500">
        No payrun ID provided.
        <Button variant="outline" size="sm" className="mt-4" onClick={() => onNavigate('payruns')}>
          Back to Payruns
        </Button>
      </div>
    );
  }

  // Action Handlers
  const handleCompute = async () => {
    setActionLoading('compute');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.payruns.compute(payrunId);
      const data = res.data || res;
      setPayrun(data);
      setActionSuccess('All salary rules computed deterministically and attendance days synced.');
    } catch (err: any) {
      setActionError(err.message || 'Computation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleValidate = async () => {
    setActionLoading('validate');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.payruns.validate(payrunId);
      const data = res.data || res;
      setPayrun(data);
      setActionSuccess('Payrun successfully validated and locked for changes.');
    } catch (err: any) {
      setActionError(err.message || 'Validation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!isManagerOrAdmin) {
      setActionError('Only HR Payroll Managers and Admins can mark payruns as paid.');
      return;
    }
    if (!window.confirm('Are you sure you want to finalize and mark this payrun as PAID? This action is permanent and irreversible.')) {
      return;
    }

    setActionLoading('mark-paid');
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.payruns.markPaid(payrunId);
      const data = res.data || res;
      setPayrun(data);
      setActionSuccess('Payrun batch has been marked as PAID. Records are permanently archived.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark as paid');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!isManagerOrAdmin) {
      setActionError('Only HR Payroll Managers and Admins can delete payruns.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this payrun batch and all draft payslips?')) {
      return;
    }

    setActionLoading('delete');
    setActionError(null);
    try {
      await api.payruns.delete(payrunId);
      onNavigate('payruns');
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete payrun');
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="w-8 h-8 border-2 border-ink-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-ink-500 font-medium">Loading payrun details...</p>
      </div>
    );
  }

  if (error || !payrun) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm-md text-xs text-red-700">
          {error || 'Payrun not found.'}
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('payruns')}>
          <ArrowLeft size={14} /> Back to Payruns
        </Button>
      </div>
    );
  }

  const currentStatus = (payrun.status || 'draft').toLowerCase() as (typeof statusOrder)[number];
  const currentStep = statusOrder.indexOf(currentStatus);

  const payslipsList = payrun.payslips || [];
  const hasBlockingWarnings = payslipsList.some((ps) => ps.hasBlockingWarnings);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Navigation */}
      <button
        onClick={() => onNavigate('payruns')}
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors font-medium"
      >
        <ArrowLeft size={14} />
        Back to Payruns
      </button>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{payrun.name}</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm-md text-xs font-semibold border uppercase tracking-wider',
                currentStatus === 'draft' && 'border-border bg-paper text-ink-500',
                currentStatus === 'computed' && 'border-status-info/30 bg-status-infoSoft text-status-info',
                currentStatus === 'validated' && 'border-status-warning/30 bg-status-warningSoft text-status-warning',
                currentStatus === 'paid' && 'border-status-success/30 bg-status-successSoft text-status-success'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  currentStatus === 'draft' && 'bg-ink-400',
                  currentStatus === 'computed' && 'bg-status-info',
                  currentStatus === 'validated' && 'bg-status-warning',
                  currentStatus === 'paid' && 'bg-status-success'
                )}
              />
              {currentStatus}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-ink-600">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-ink-400" />
              <span>Structure: <strong>{payrun.salaryStructure || '—'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-ink-400" />
              <span className="tnum font-medium">{payrun.periodStart} → {payrun.periodEnd}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-ink-400" />
              <span className="tnum font-medium">{payrun.employeeCount} payslips</span>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayrun} disabled={!!actionLoading}>
            <RefreshCw size={13} className={cn(actionLoading && 'animate-spin')} />
            Refresh
          </Button>

          {(currentStatus === 'draft' || currentStatus === 'computed') && isManagerOrAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="text-status-danger border-red-200 hover:bg-red-50"
            >
              <Trash2 size={13} />
              Delete Batch
            </Button>
          )}
        </div>
      </div>

      {/* Alerts / Feedback */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm-md flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm-md flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* State Machine Action Bar & Stepper */}
      <div className="bg-surface border border-border rounded-sm-md p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Stepper indicators */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Draft', step: 0 },
              { label: 'Computed', step: 1 },
              { label: 'Validated', step: 2 },
              { label: 'Paid', step: 3 },
            ].map((s, idx) => {
              const isPast = currentStep > s.step;
              const isCurrent = currentStep === s.step;

              return (
                <div key={s.label} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors',
                      isPast && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                      isCurrent && 'bg-sidebar-bg text-white shadow-xs',
                      !isPast && !isCurrent && 'bg-paper text-ink-400'
                    )}
                  >
                    {isPast ? <CheckCircle2 size={12} /> : <span>{s.step + 1}.</span>}
                    {s.label}
                  </div>
                  {idx < 3 && <div className="w-4 h-px bg-border" />}
                </div>
              );
            })}
          </div>

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStatus === 'draft' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleCompute}
                disabled={!!actionLoading}
              >
                {actionLoading === 'compute' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Computing Rules...
                  </>
                ) : (
                  <>
                    <Calculator size={14} />
                    Compute Payrun
                  </>
                )}
              </Button>
            )}

            {currentStatus === 'computed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompute}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'compute' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  Recompute Batch
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleValidate}
                  disabled={!!actionLoading || hasBlockingWarnings}
                >
                  {actionLoading === 'validate' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Validate Payrun
                    </>
                  )}
                </Button>
              </>
            )}

            {currentStatus === 'validated' && (
              <div className="flex items-center gap-3">
                {!isManagerOrAdmin && (
                  <span className="text-xs text-ink-500 italic">
                    Requires HR Payroll Manager / Admin to disburse
                  </span>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMarkPaid}
                  disabled={!!actionLoading || !isManagerOrAdmin}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {actionLoading === 'mark-paid' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Finalizing Disbursement...
                    </>
                  ) : (
                    <>
                      <DollarSign size={14} />
                      Mark as Paid & Disburse
                    </>
                  )}
                </Button>
              </div>
            )}

            {currentStatus === 'paid' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs font-semibold text-emerald-800">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Disbursed & Finalized
              </div>
            )}
          </div>
        </div>

        {hasBlockingWarnings && currentStatus === 'computed' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
            <ShieldAlert size={15} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Blocking Warnings Detected:</strong> One or more payslips have critical issues preventing validation. Please resolve the issues before validating.
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface border border-border rounded-sm-md">
          <div className="text-xs text-ink-500 font-medium">Total Net Payout</div>
          <div className="text-2xl font-bold text-ink-900 mt-1 tnum">
            {formatCurrency(payrun.totalNet || 0)}
          </div>
        </div>
        <div className="p-4 bg-surface border border-border rounded-sm-md">
          <div className="text-xs text-ink-500 font-medium">Total Gross Salary</div>
          <div className="text-2xl font-bold text-ink-900 mt-1 tnum">
            {formatCurrency(payrun.totalGross || 0)}
          </div>
        </div>
        <div className="p-4 bg-surface border border-border rounded-sm-md">
          <div className="text-xs text-ink-500 font-medium">Employees Included</div>
          <div className="text-2xl font-bold text-ink-900 mt-1 tnum">
            {payrun.employeeCount}
          </div>
        </div>
        <div className="p-4 bg-surface border border-border rounded-sm-md">
          <div className="text-xs text-ink-500 font-medium">Total Warnings</div>
          <div
            className={cn(
              'text-2xl font-bold mt-1 tnum',
              (payrun.totalWarnings || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
            )}
          >
            {payrun.totalWarnings || 0}
          </div>
        </div>
      </div>

      {/* Child Payslips Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-900 tracking-tight">
            Employee Payslips ({payslipsList.length})
          </h2>
          <span className="text-xs text-ink-500">
            Click any row to view full calculation breakdown & print document
          </span>
        </div>

        <div className="bg-surface border border-border rounded-sm-md overflow-hidden">
          <Table>
            <THead>
              <TH>Employee</TH>
              <TH>Contract Ref</TH>
              <TH align="right">Base Wage</TH>
              <TH align="right">Worked Days</TH>
              <TH align="right">Gross</TH>
              <TH align="right">Net Salary</TH>
              <TH>Warnings</TH>
              <TH>Status</TH>
              <TH align="right">Action</TH>
            </THead>
            <TBody>
              {payslipsList.map((payslip) => {
                const warningsCount = payslip.warnings ? payslip.warnings.length : 0;
                const isBlocking = payslip.hasBlockingWarnings;

                return (
                  <TR
                    key={payslip.id}
                    onClick={() => onNavigate('payslip-detail', payslip.id)}
                    className="cursor-pointer hover:bg-paper/70 transition-colors"
                  >
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          firstName={payslip.employeeName?.split(' ')[0] || ''}
                          lastName={payslip.employeeName?.split(' ')[1] || ''}
                          size="sm"
                        />
                        <div>
                          <div className="font-semibold text-xs text-ink-900">
                            {payslip.employeeName}
                          </div>
                          <div className="text-[11px] text-ink-500">
                            {payslip.jobTitle} • {payslip.department}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-xs text-ink-600 font-mono">
                      {payslip.contractRef || '—'}
                    </TD>
                    <TD align="right" className="tnum text-xs text-ink-700">
                      {formatCurrency(payslip.wage || 0)}
                    </TD>
                    <TD align="right" className="tnum text-xs font-medium text-ink-900">
                      {payslip.workedDays ?? 0} days
                    </TD>
                    <TD align="right" className="tnum text-xs text-ink-700">
                      {formatCurrency(payslip.grossSalary || 0)}
                    </TD>
                    <TD align="right" className="tnum text-xs font-bold text-ink-900">
                      {formatCurrency(payslip.netSalary || 0)}
                    </TD>
                    <TD>
                      {warningsCount > 0 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tnum',
                            isBlocking
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}
                          title={
                            Array.isArray(payslip.warnings)
                              ? payslip.warnings.map((w: any) => w.message || w).join('\n')
                              : ''
                          }
                        >
                          <AlertTriangle size={11} />
                          {warningsCount} {isBlocking ? 'Blocking' : 'Advisory'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">Clean</span>
                      )}
                    </TD>
                    <TD>
                      <StatusDot type={payslip.status} />
                    </TD>
                    <TD align="right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('payslip-detail', payslip.id);
                        }}
                        className="p-1 rounded text-ink-400 hover:text-ink-900 hover:bg-paper transition-colors"
                        title="View detailed payslip"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
