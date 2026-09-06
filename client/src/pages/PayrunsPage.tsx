import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, AlertCircle, FileText, CheckCircle2, Clock, Check } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { PayrunWizard } from '@/components/PayrunWizard';
import { api } from '@/lib/api';
import { formatCurrency } from '@/data';
import type { View, Payrun, UserSession } from '@/types';
import { cn } from '@/lib/utils';

interface PayrunsPageProps {
  onNavigate: (view: View, id?: string) => void;
  userSession?: UserSession | null;
}

type StatusFilter = 'ALL' | 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID';

export function PayrunsPage({ onNavigate, userSession }: PayrunsPageProps) {
  const [payrunsList, setPayrunsList] = useState<Payrun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  // RBAC permission check: Admin, HR Payroll Manager, HR Payroll User can create payruns
  const userRole = userSession?.role;
  const canCreatePayrun =
    userRole === 'Admin' ||
    userRole === 'HR Payroll Manager' ||
    userRole === 'HR Payroll User';

  const fetchPayruns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.payruns.getAll({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      const data = Array.isArray(res) ? res : [];
      setPayrunsList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payruns');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchPayruns();
  }, [fetchPayruns]);

  // Statistics
  const totalPayruns = payrunsList.length;
  const draftCount = payrunsList.filter((p) => p.status.toUpperCase() === 'DRAFT').length;
  const computedCount = payrunsList.filter((p) => p.status.toUpperCase() === 'COMPUTED').length;
  const validatedCount = payrunsList.filter((p) => p.status.toUpperCase() === 'VALIDATED').length;
  const paidCount = payrunsList.filter((p) => p.status.toUpperCase() === 'PAID').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payrun Batches"
        subtitle="Manage and execute batch payroll computation cycles"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPayruns} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              Refresh
            </Button>
            {canCreatePayrun && (
              <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
                <Plus size={15} />
                New Payrun
              </Button>
            )}
          </div>
        }
      />

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-surface border border-[#E7EAE7] rounded-lg shadow-2xs">
          <div className="text-xs text-ink-500 font-medium">Total Batches</div>
          <div className="text-xl font-bold text-ink-900 mt-1 tnum">{totalPayruns}</div>
        </div>
        <div className="p-3.5 bg-surface border border-[#E7EAE7] rounded-lg shadow-2xs">
          <div className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ink-400" />
            Draft
          </div>
          <div className="text-xl font-bold text-ink-900 mt-1 tnum">{draftCount}</div>
        </div>
        <div className="p-3.5 bg-surface border border-[#E7EAE7] rounded-lg shadow-2xs">
          <div className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-info" />
            Computed
          </div>
          <div className="text-xl font-bold text-ink-900 mt-1 tnum">{computedCount}</div>
        </div>
        <div className="p-3.5 bg-surface border border-[#E7EAE7] rounded-lg shadow-2xs">
          <div className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-warning" />
            Validated
          </div>
          <div className="text-xl font-bold text-ink-900 mt-1 tnum">{validatedCount}</div>
        </div>
        <div className="p-3.5 bg-surface border border-[#E7EAE7] rounded-lg shadow-2xs">
          <div className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-success" />
            Paid / Closed
          </div>
          <div className="text-xl font-bold text-ink-900 mt-1 tnum">{paidCount}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface border border-[#E7EAE7] rounded-lg shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 w-fit">
          {(['ALL', 'DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                statusFilter === tab
                  ? 'bg-sidebar-bg text-white'
                  : 'text-ink-600 hover:text-ink-900 hover:bg-paper'
              )}
            >
              {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search payrun batches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-sm-md text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-ink-400 transition-colors"
          />
        </div>
      </div>

      {/* Content Table */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm-md flex items-center gap-2 text-xs text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && payrunsList.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-sm-md">
          <div className="w-6 h-6 border-2 border-ink-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-ink-500">Loading payruns...</p>
        </div>
      ) : payrunsList.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-sm-md space-y-3">
          <div className="w-12 h-12 rounded-full bg-paper flex items-center justify-center mx-auto text-ink-400">
            <FileText size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-ink-900">No Payruns Found</h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No payrun batches match your current filter criteria.'
                : 'Get started by creating your first payrun cycle with the two-step wizard.'}
            </p>
          </div>
          {canCreatePayrun && (
            <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
              <Plus size={14} />
              Create Payrun
            </Button>
          )}
        </div>
      ) : (
        <div>
          <Table>
            <THead>
              <TH>Payrun Name</TH>
              <TH>Salary Structure</TH>
              <TH>Period</TH>
              <TH align="right">Employees</TH>
              <TH align="right">Total Gross</TH>
              <TH align="right">Total Net</TH>
              <TH>Status</TH>
            </THead>
            <TBody>
              {payrunsList.map((p) => (
                <TR key={p.id} onClick={() => onNavigate('payrun-detail', p.id)}>
                  <TD className="font-semibold text-ink-900 hover:text-chartreuse-700 transition-colors">
                    {p.name}
                  </TD>
                  <TD className="text-ink-700 text-xs">{p.salaryStructure || '—'}</TD>
                  <TD className="tnum text-ink-500 text-xs">
                    {p.periodStart} → {p.periodEnd}
                  </TD>
                  <TD align="right" className="tnum font-medium text-ink-700">
                    {p.employeeCount}
                  </TD>
                  <TD align="right" className="tnum text-ink-600">
                    {formatCurrency(p.totalGross || 0)}
                  </TD>
                  <TD align="right" className="tnum font-semibold text-ink-900">
                    {formatCurrency(p.totalNet || 0)}
                  </TD>
                  <TD>
                    <StatusDot type={p.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {/* Payrun Wizard Modal */}
      <PayrunWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={(payrunId) => {
          setWizardOpen(false);
          onNavigate('payrun-detail', payrunId);
        }}
      />
    </div>
  );
}
