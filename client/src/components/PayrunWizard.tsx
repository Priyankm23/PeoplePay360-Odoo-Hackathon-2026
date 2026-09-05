import { useState, useEffect } from 'react';
import { Check, AlertTriangle, ChevronRight, Loader2, Users, Calendar, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { api } from '@/lib/api';
import { formatCurrency } from '@/data';
import type { PayrunPreview, EligibleEmployee, SalaryStructure } from '@/types';
import { cn } from '@/lib/utils';

interface PayrunWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (payrunId: string) => void;
}

export function PayrunWizard({ open, onClose, onSuccess }: PayrunWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [structureId, setStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PayrunPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Initial defaults for dates (current month)
  useEffect(() => {
    if (open) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const toDateInput = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const startStr = toDateInput(firstDay);
      const endStr = toDateInput(lastDay);

      setPeriodStart(startStr);
      setPeriodEnd(endStr);
      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      setName(`${monthName} Regular Payrun`);
      setStep(1);
      setPreviewData(null);
      setPreviewError(null);
      setSubmitError(null);
      setSelectedEmpIds(new Set());
      setEmployeeSearch('');

      // Load structures
      setLoadingStructures(true);
      api.salaryStructures
        .getAll()
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setStructures(list.filter((s: any) => s.isActive !== false && !s.isArchived));
          if (list.length > 0 && !structureId) {
            setStructureId(list[0].id);
          }
        })
        .catch((err) => {
          console.error('Failed to load salary structures', err);
        })
        .finally(() => setLoadingStructures(false));
    }
  }, [open]);

  const step1Valid = name.trim() && structureId && periodStart && periodEnd && periodStart <= periodEnd;

  // Step 1: Preview Eligible Employees
  const handlePreview = async () => {
    if (!step1Valid) return;
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const res = await api.payruns.previewEligible({
        salaryStructureId: structureId,
        periodStart,
        periodEnd,
      });

      const data: PayrunPreview = res.data || res;
      setPreviewData(data);

      // Auto-select all eligible employees
      const eligibleIds = new Set(
        data.eligibleEmployees.filter((e) => e.hasRunningContract).map((e) => e.employeeId)
      );
      setSelectedEmpIds(eligibleIds);
      setStep(2);
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to preview eligible employees');
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleEmployee = (id: string, isEligible: boolean) => {
    if (!isEligible) return;
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllEligible = () => {
    if (!previewData) return;
    const eligibleIds = new Set(
      previewData.eligibleEmployees.filter((e) => e.hasRunningContract).map((e) => e.employeeId)
    );
    setSelectedEmpIds(eligibleIds);
  };

  const deselectAll = () => {
    setSelectedEmpIds(new Set());
  };

  // Step 2: Final Creation
  const handleCreatePayrun = async () => {
    if (selectedEmpIds.size === 0) {
      setSubmitError('Please select at least one eligible employee to include in this payrun.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: name.trim(),
        salaryStructureId: structureId,
        periodStart,
        periodEnd,
        employeeIds: Array.from(selectedEmpIds),
      };

      const res = await api.payruns.create(payload);
      const created = res.data || res;
      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create payrun');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = (previewData?.eligibleEmployees || []).filter((emp) => {
    if (!employeeSearch.trim()) return true;
    const query = employeeSearch.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query)
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Payrun"
      width="lg"
      footer={
        step === 1 ? (
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" onClick={onClose} disabled={previewLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!step1Valid || previewLoading}
              onClick={handlePreview}
            >
              {previewLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Calculating Preview...
                </>
              ) : (
                <>
                  Continue to Preview
                  <ChevronRight size={14} />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={submitting}>
              Back to Configuration
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={selectedEmpIds.size === 0 || submitting}
              onClick={handleCreatePayrun}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating Payrun...
                </>
              ) : (
                <>Create Payrun ({selectedEmpIds.size} Employees)</>
              )}
            </Button>
          </div>
        )
      }
    >
      {/* Wizard Step Progress Tracker */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { num: 1, label: '1. Period & Structure' },
          { num: 2, label: '2. Employee Review' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-sm-md text-xs font-medium',
                step === s.num
                  ? 'bg-ink-900 text-white'
                  : step > s.num
                  ? 'bg-chartreuse-100 text-chartreuse-800'
                  : 'bg-paper text-ink-400'
              )}
            >
              {step > s.num ? <Check size={13} className="text-chartreuse-600" /> : <span className="tnum">{s.num}</span>}
              {s.label}
            </div>
            {i === 0 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
        <span className="text-xs text-ink-400 ml-auto font-medium">Step {step} of 2</span>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          {previewError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm-md flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Payrun Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., September 2026 Regular Payrun"
              className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Salary Structure</label>
            {loadingStructures ? (
              <div className="text-xs text-ink-400 py-2 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" /> Loading salary structures...
              </div>
            ) : (
              <select
                value={structureId}
                onChange={(e) => setStructureId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500 transition-colors"
              >
                <option value="">Select a salary structure...</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rulesCount || s.rules?.length || 0} rules)
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-ink-400 mt-1">
              Employees will be filtered based on having an active contract matching this structure during the period.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Period Start Date</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500 transition-colors tnum"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Period End Date</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500 transition-colors tnum"
              />
            </div>
          </div>

          <div className="bg-paper p-3 rounded-sm-md border border-border text-xs text-ink-600 flex items-start gap-2">
            <Calendar size={15} className="shrink-0 text-ink-400 mt-0.5" />
            <span>
              Preview will scan active contracts and attendance records across the selected date range. No draft records are persisted until final confirmation in Step 2.
            </span>
          </div>
        </div>
      ) : (
        <div>
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm-md flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Preview Metrics Card */}
          <div className="grid grid-cols-3 gap-3 mb-4 p-3.5 bg-paper rounded-sm-md border border-border">
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Target Structure</div>
              <div className="text-xs font-semibold text-ink-900 truncate">
                {previewData?.salaryStructure.name}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Eligible Employees</div>
              <div className="text-xs font-semibold text-ink-900 tnum">
                {previewData?.eligibleCount} of {previewData?.totalEmployees} total
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-500 font-medium">Selected for Payrun</div>
              <div className="text-xs font-bold text-chartreuse-700 tnum">
                {selectedEmpIds.size} employees
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <input
              type="text"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Filter employees by name or dept..."
              className="text-xs px-2.5 py-1.5 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500 w-64"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllEligible}
                className="text-xs text-chartreuse-700 hover:text-chartreuse-900 font-medium transition-colors"
              >
                Select All Eligible
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs text-ink-500 hover:text-ink-800 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Employees List */}
          <div className="border border-border rounded-sm-md overflow-hidden max-h-[320px] overflow-y-auto divide-y divide-border-soft">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-400">
                No employees match the filter criteria.
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmpIds.has(emp.employeeId);
                const isEligible = emp.hasRunningContract;

                return (
                  <div
                    key={emp.employeeId}
                    onClick={() => toggleEmployee(emp.employeeId, isEligible)}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2.5 transition-colors select-none',
                      isEligible
                        ? 'cursor-pointer hover:bg-paper/80'
                        : 'opacity-55 bg-paper/40 cursor-not-allowed'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isEligible}
                      onChange={() => {}} // Handled by container click
                      className="w-4 h-4 accent-ink-900 rounded cursor-pointer"
                    />

                    <Avatar
                      firstName={emp.name.split(' ')[0] || ''}
                      lastName={emp.name.split(' ')[1] || ''}
                      size="sm"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink-900 truncate">
                        {emp.name}
                      </div>
                      <div className="text-[11px] text-ink-500 truncate">
                        {emp.jobTitle} • {emp.department}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isEligible ? (
                        <div className="text-xs font-medium text-ink-900 tnum">
                          {formatCurrency(emp.wage)}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[11px] text-status-warning font-medium">
                          <AlertTriangle size={12} />
                          {emp.warnings[0] || 'Ineligible'}
                        </div>
                      )}
                      {emp.warnings.length > 0 && isEligible && (
                        <div className="text-[10px] text-amber-600 truncate max-w-[140px]">
                          {emp.warnings[0]}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            Selected: <span className="font-semibold text-ink-900">{selectedEmpIds.size}</span> eligible employees will be created as Draft payslips.
          </div>
        </div>
      )}
    </Modal>
  );
}
