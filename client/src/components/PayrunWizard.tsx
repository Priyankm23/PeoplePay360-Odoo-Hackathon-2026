import { useState } from 'react';
import { Check, AlertTriangle, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { employees, contracts, salaryStructures } from '@/data';
import type { View } from '@/types';
import { cn } from '@/lib/utils';

interface PayrunWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onNavigate: (view: View, id?: string) => void;
}

export function PayrunWizard({ open, onClose, onCreate }: PayrunWizardProps) {
  const [step, setStep] = useState(1);
  const [structure, setStructure] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligible = employees.map((e) => {
    const hasContract = contracts.some(
      (c) => c.employeeId === e.id && c.status === 'running'
    );
    return { employee: e, eligible: hasContract };
  });

  const step1Valid = structure && periodStart && periodEnd;

  const toggleEmployee = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setStep(1);
    setStructure('');
    setPeriodStart('');
    setPeriodEnd('');
    setSelected(new Set());
    onClose();
  };

  const handleCreate = () => {
    onCreate();
    handleClose();
  };

  const eligibleCount = eligible.filter((e) => e.eligible).length;
  const selectedCount = selected.size;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Payrun"
      width="lg"
      footer={
        step === 1 ? (
          <Button
            variant="primary"
            size="sm"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
          >
            Continue
            <ChevronRight size={14} />
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Create Payrun
            </Button>
          </>
        )
      }
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { num: 1, label: 'Scope' },
          { num: 2, label: 'Employees' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-sm-md text-xs font-medium',
                step === s.num
                  ? 'bg-ink-900 text-white'
                  : step > s.num
                    ? 'bg-chartreuse-50 text-chartreuse-700'
                    : 'bg-paper text-ink-300'
              )}
            >
              {step > s.num ? <Check size={13} /> : <span className="tnum">{s.num}</span>}
              {s.label}
            </div>
            {i === 0 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
        <span className="text-xs text-ink-300 ml-auto">
          Step {step} of 2
        </span>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-ink-500 mb-1.5">Salary Structure</label>
            <select
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300 transition-colors"
            >
              <option value="">Select a salary structure...</option>
              {salaryStructures
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.type})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300 transition-colors tnum"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300 transition-colors tnum"
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-xs text-ink-500 mb-3">
            {eligibleCount} eligible employees. Select those to include in this payrun.
          </div>
          <div className="border border-border rounded-sm-md overflow-hidden max-h-[340px] overflow-y-auto">
            {eligible.map(({ employee: e, eligible: isEligible }) => (
              <label
                key={e.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 border-b border-border-soft last:border-b-0 cursor-pointer transition-colors',
                  isEligible ? 'hover:bg-paper/50' : 'opacity-50 cursor-not-allowed bg-paper/30'
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  disabled={!isEligible}
                  onChange={() => toggleEmployee(e.id)}
                  className="w-4 h-4 accent-ink-900 rounded"
                />
                <Avatar
                  firstName={e.firstName}
                  lastName={e.lastName}
                  color={e.avatarColor}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {e.firstName} {e.lastName}
                  </div>
                  <div className="text-xs text-ink-500">{e.department}</div>
                </div>
                {!isEligible && (
                  <div className="flex items-center gap-1 text-xs text-status-warning">
                    <AlertTriangle size={13} />
                    No active contract
                  </div>
                )}
              </label>
            ))}
          </div>
          <div className="mt-3 text-sm text-ink-700 tnum">
            <span className="font-semibold text-ink-900">{selectedCount}</span> of {eligibleCount} employees selected.
          </div>
        </div>
      )}
    </Modal>
  );
}
