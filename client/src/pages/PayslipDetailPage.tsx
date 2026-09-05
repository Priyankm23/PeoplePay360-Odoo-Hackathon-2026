import { ArrowLeft, Printer } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/Button';
import { payslips, getEmployee, formatCurrencyDetailed } from '@/data';
import type { View, PayslipLine } from '@/types';
import { cn } from '@/lib/utils';

interface PayslipDetailPageProps {
  payslipId: string;
  onNavigate: (view: View, id?: string) => void;
}

export function PayslipDetailPage({ payslipId, onNavigate }: PayslipDetailPageProps) {
  const payslip = payslips.find((p) => p.id === payslipId);

  if (!payslip) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-500">Payslip not found.</p>
        <button onClick={() => onNavigate('payslips')} className="text-chartreuse-600 text-sm mt-2">
          Back to Payslips
        </button>
      </div>
    );
  }

  const employee = getEmployee(payslip.employeeId);
  if (!employee) return null;

  const groupOrder: PayslipLine['category'][] = ['Basic', 'Allowance', 'Deduction'];
  const grouped = groupOrder.map((cat) => ({
    category: cat,
    lines: payslip.lines.filter((l) => l.category === cat && l.ruleName !== 'Net Salary'),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => onNavigate('payrun-detail', payslip.payrunId)}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Payrun
        </button>
        <Button variant="outline" size="sm">
          <Printer size={14} />
          Print Payslip
        </Button>
      </div>

      {/* Document */}
      <div className="max-w-2xl mx-auto border border-border bg-surface rounded-lg p-8 shadow-card">
        {/* Header block */}
        <div className="flex items-start justify-between pb-6 border-b border-border-soft">
          <div className="flex items-center gap-4">
            <Avatar
              firstName={employee.firstName}
              lastName={employee.lastName}
              color={employee.avatarColor}
              size="lg"
            />
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-sm text-ink-500">{employee.jobTitle}</p>
              <p className="text-xs text-ink-300 mt-1">{employee.department}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-500 mb-1">Pay Period</div>
            <div className="text-sm font-medium text-ink-900">{payslip.payPeriod}</div>
            <div className="text-xs text-ink-300 mt-2">Reference</div>
            <div className="text-xs text-ink-700 tnum">{payslip.payrunRef}</div>
            <div className="mt-2">
              <StatusDot type={payslip.status} />
            </div>
          </div>
        </div>

        {/* Computation table */}
        <div className="mt-6 space-y-6">
          {grouped.map((group) => {
            if (group.lines.length === 0) return null;
            const subtotal = group.lines.reduce((sum, l) => sum + l.amount, 0);
            return (
              <div key={group.category}>
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                  {group.category === 'Deduction' ? 'Deductions' : group.category}
                </div>
                <div className="space-y-1">
                  {group.lines.map((line) => (
                    <div
                      key={line.ruleName}
                      className="flex justify-between text-sm py-1.5 border-b border-border-soft/60"
                    >
                      <span className="text-ink-700">{line.ruleName}</span>
                      <span
                        className={cn(
                          'tnum font-medium',
                          line.amount < 0 ? 'text-status-danger' : 'text-ink-900'
                        )}
                      >
                        {line.amount < 0 ? '-' : ''}
                        {formatCurrencyDetailed(Math.abs(line.amount))}
                      </span>
                    </div>
                  ))}
                  {group.category !== 'Basic' && (
                    <div className="flex justify-between text-sm py-2 font-medium">
                      <span className="text-ink-500">
                        {group.category === 'Deduction' ? 'Total Deductions' : 'Total Allowances'}
                      </span>
                      <span className="tnum text-ink-900">
                        {formatCurrencyDetailed(Math.abs(subtotal))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Gross subtotal */}
          <div className="flex justify-between text-sm py-3 border-t border-border font-semibold">
            <span className="text-ink-700">Gross Salary</span>
            <span className="tnum text-ink-900">{formatCurrencyDetailed(payslip.gross)}</span>
          </div>

          {/* Net salary */}
          <div className="pt-4 border-t-2 border-chartreuse-400">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-ink-900">Net Salary</span>
              <span className="text-xl font-bold tnum text-ink-900">
                {formatCurrencyDetailed(payslip.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-border-soft text-xs text-ink-300 text-center">
          This is a system-generated payslip from PeoplePay360. Generated on {new Date().toISOString().split('T')[0]}.
        </div>
      </div>
    </div>
  );
}
