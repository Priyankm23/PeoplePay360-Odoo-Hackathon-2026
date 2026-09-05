import { useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { payruns, payslipsForPayrun, getEmployee, formatCurrency } from '@/data';
import type { View, PayrunStatus } from '@/types';
import { cn } from '@/lib/utils';

interface PayrunDetailPageProps {
  payrunId: string;
  onNavigate: (view: View, id?: string) => void;
}

const statusOrder: PayrunStatus[] = ['draft', 'computed', 'validated', 'paid'];

export function PayrunDetailPage({ payrunId, onNavigate }: PayrunDetailPageProps) {
  const [status, setStatus] = useState<PayrunStatus>(
    payruns.find((p) => p.id === payrunId)?.status ?? 'draft'
  );
  const payrun = payruns.find((p) => p.id === payrunId);
  const payslips = payslipsForPayrun(payrunId);

  if (!payrun) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-500">Payrun not found.</p>
        <button onClick={() => onNavigate('payruns')} className="text-chartreuse-600 text-sm mt-2">
          Back to Payruns
        </button>
      </div>
    );
  }

  const currentStep = statusOrder.indexOf(status);
  const actions = [
    { label: 'Compute', step: 0 },
    { label: 'Validate', step: 1 },
    { label: 'Mark Paid', step: 2 },
    { label: 'Send Payslips', step: 3 },
  ];

  const handleAction = (step: number) => {
    setStatus(statusOrder[step + 1] ?? 'paid');
  };

  return (
    <div>
      <button
        onClick={() => onNavigate('payruns')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-5"
      >
        <ArrowLeft size={15} />
        Payruns
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink-900 tracking-tight">{payrun.name}</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm-md text-xs font-medium border',
                status === 'draft' && 'border-border bg-paper text-ink-500',
                status === 'computed' && 'border-status-info/30 bg-status-infoSoft text-status-info',
                status === 'validated' && 'border-status-warning/30 bg-status-warningSoft text-status-warning',
                status === 'paid' && 'border-status-success/30 bg-status-successSoft text-status-success',
              )}
            >
              {status === 'paid' && <span className="w-1.5 h-1.5 rounded-full bg-status-success" />}
              {status === 'validated' && <span className="w-1.5 h-1.5 rounded-full bg-status-warning" />}
              {status === 'computed' && <span className="w-1.5 h-1.5 rounded-full bg-status-info" />}
              {status === 'draft' && <span className="w-1.5 h-1.5 rounded-full bg-ink-300" />}
              <span className="capitalize">{status}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-ink-500">
            <span>{payrun.salaryStructure}</span>
            <span className="tnum">{payrun.periodStart} → {payrun.periodEnd}</span>
            <span className="tnum">{payslips.length} payslips</span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-6 p-3 border border-border bg-surface rounded-sm-md">
        {actions.map((action, i) => {
          const isCurrent = currentStep === action.step;
          const isDone = currentStep > action.step;
          const isFuture = currentStep < action.step;
          const isLast = i === actions.length - 1;
          const nextStatus = statusOrder[action.step + 1];

          return (
            <div key={action.label} className="flex items-center">
              <Button
                variant={isCurrent ? 'primary' : 'outline'}
                size="sm"
                disabled={isDone || isFuture || (isLast && status === 'paid')}
                onClick={() => handleAction(action.step)}
                className={cn(isDone && 'opacity-50')}
              >
                {isDone && <span className="text-chartreuse-400">✓</span>}
                {action.label}
              </Button>
              {!isLast && (
                <div className={cn('w-6 h-px mx-1', isDone ? 'bg-ink-300' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Payslips table */}
      <Table>
        <THead>
          <TH>Employee</TH>
          <TH align="right">Net Salary</TH>
          <TH>Status</TH>
          <TH>Warnings</TH>
        </THead>
        <TBody>
          {payslips.map((payslip) => {
            const emp = getEmployee(payslip.employeeId);
            if (!emp) return null;
            return (
              <TR
                key={payslip.id}
                onClick={() => onNavigate('payslip-detail', payslip.id)}
              >
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={emp.firstName}
                      lastName={emp.lastName}
                      color={emp.avatarColor}
                      size="sm"
                    />
                    <span className="font-medium">
                      {emp.firstName} {emp.lastName}
                    </span>
                  </div>
                </TD>
                <TD align="right" className="font-medium">
                  {formatCurrency(payslip.net)}
                </TD>
                <TD>
                  <StatusDot type={payslip.status} />
                </TD>
                <TD>
                  {payslip.warnings > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm-md bg-status-warningSoft text-status-warning text-xs tnum">
                      <AlertTriangle size={12} />
                      {payslip.warnings}
                    </span>
                  ) : (
                    <span className="text-ink-300 text-xs">—</span>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
