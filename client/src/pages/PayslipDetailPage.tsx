import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { formatCurrencyDetailed } from '@/data';
import type { View, Payslip, PayslipLine, UserSession } from '@/types';
import { cn } from '@/lib/utils';

interface PayslipDetailPageProps {
  payslipId?: string;
  onNavigate: (view: View, id?: string) => void;
  userSession?: UserSession | null;
}

export function PayslipDetailPage({ payslipId, onNavigate }: PayslipDetailPageProps) {
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchPayslip = useCallback(async () => {
    if (!payslipId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.payslips.getById(payslipId);
      const data = res.data || res;
      setPayslip(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payslip details');
    } finally {
      setLoading(false);
    }
  }, [payslipId]);

  useEffect(() => {
    fetchPayslip();
  }, [fetchPayslip]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const documentElement = document.querySelector('.payslip-document') as HTMLElement | null;
    if (!documentElement) return;

    setIsDownloading(true);
    try {
      await html2pdf()
        .set({
          margin: [0.4, 0.4, 0.4, 0.4],
          filename: `payslip-${payslip?.payrunRef || payslipId}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            foreignObjectRendering: false,
            onclone: (clonedDocument: Document) => {
              const clonedElement = clonedDocument.querySelector('.payslip-document') as HTMLElement | null;
              if (clonedElement) {
                clonedElement.style.width = '794px';
                clonedElement.style.maxWidth = '794px';
                clonedElement.style.position = 'static';
                clonedElement.style.transform = 'none';
                clonedElement.style.margin = '0 auto';
                clonedElement.style.boxShadow = 'none';
                clonedElement.style.border = '1px solid #E2E8E2';
              }
            },
          },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        })
        .from(documentElement)
        .save();
    } finally {
      setIsDownloading(false);
    }
  };

  if (!payslipId) {
    return (
      <div className="p-12 text-center text-ink-500">
        No payslip ID provided.
        <Button variant="outline" size="sm" className="mt-4" onClick={() => onNavigate('payslips')}>
          Back to Payslips
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="w-8 h-8 border-2 border-ink-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-ink-500 font-medium">Loading payslip document...</p>
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm-md text-xs text-red-700">
          {error || 'Payslip not found.'}
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('payslips')}>
          <ArrowLeft size={14} /> Back to Payslips
        </Button>
      </div>
    );
  }

  const emp = payslip.employee || {
    id: payslip.employeeId,
    name: payslip.employeeName || 'Employee',
    firstName: payslip.employeeName?.split(' ')[0] || 'Employee',
    lastName: payslip.employeeName?.split(' ')[1] || '',
    email: payslip.email || '',
    department: payslip.department || 'General',
    jobTitle: payslip.jobTitle || 'Team Member',
    bankAccount: undefined,
  };

  const lines: PayslipLine[] = payslip.lines || [];

  // Categorize lines into Basic, Allowances, Deductions
  const basicLines = lines.filter(
    (l) => (l.category || '').toUpperCase() === 'BASIC' || (l.name || l.ruleName) === 'Basic Salary'
  );
  const allowanceLines = lines.filter(
    (l) =>
      (l.category || '').toUpperCase() === 'ALLOWANCE' &&
      (l.name || l.ruleName) !== 'Basic Salary' &&
      (l.name || l.ruleName) !== 'Gross Salary' &&
      (l.name || l.ruleName) !== 'Net Salary'
  );
  const deductionLines = lines.filter(
    (l) => (l.category || '').toUpperCase() === 'DEDUCTION'
  );

  const totalBasic = basicLines.reduce((sum, l) => sum + Math.abs(l.amount), 0);
  const totalAllowances = allowanceLines.reduce((sum, l) => sum + Math.abs(l.amount), 0);
  const totalDeductions = deductionLines.reduce((sum, l) => sum + Math.abs(l.amount), 0);

  const grossSalary = payslip.grossSalary || payslip.gross || (totalBasic + totalAllowances);
  const netSalary = payslip.netSalary || payslip.net || (grossSalary - totalDeductions);

  const warnings = Array.isArray(payslip.warnings) ? payslip.warnings : [];

  const bankAccountDisplay = emp.bankAccount
    ? `••••${emp.bankAccount.slice(-4)}`
    : 'Verified on File';

  return (
    <div className="payslip-page p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Bar (hidden during print) */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => {
            if (payslip.payrunId) {
              onNavigate('payrun-detail', payslip.payrunId);
            } else {
              onNavigate('payslips');
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors font-medium"
        >
          <ArrowLeft size={14} />
          {payslip.payrunId ? 'Back to Payrun' : 'Back to Payslips'}
        </button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer size={14} />
            Print
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-1.5 bg-emerald-700 hover:bg-emerald-800"
          >
            <Download size={14} />
            {isDownloading ? 'Preparing...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Payslip Document Container */}
      <div className="payslip-document bg-surface border border-border rounded-lg p-8 shadow-card space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Company & Document Header */}
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PeoplePay360" className="h-12 w-auto object-contain" />
              <span className="px-2.5 py-0.5 rounded bg-chartreuse-100 text-chartreuse-800 text-[11px] font-bold uppercase tracking-wider">
                Official Payslip
              </span>
            </div>
            <p className="text-xs text-ink-500">Enterprise Payroll & HR Automation System</p>
          </div>

          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs font-semibold text-ink-700">Status:</span>
              <StatusDot type={payslip.status} />
            </div>
            <div className="text-xs text-ink-500 tnum">
              Reference: <strong className="text-ink-900 font-mono">{payslip.payrunRef}</strong>
            </div>
            <div className="text-xs text-ink-500 tnum">
              Pay Period: <strong className="text-ink-900">{payslip.payPeriod}</strong>
            </div>
          </div>
        </div>

        {/* Robust Structured Employee & Contract Information Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAF8] p-5 rounded-lg border border-[#E2E8E2]">
          {/* Column 1: Employee Information */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 pb-1.5 border-b border-[#E2E8E2]">
              Employee Details
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-[#EFEFEF]">
                  <td className="py-1.5 text-ink-500 w-28">Full Name:</td>
                  <td className="py-1.5 font-bold text-ink-900">
                    {emp.name || `${emp.firstName} ${emp.lastName}`}
                  </td>
                </tr>
                <tr className="border-b border-[#EFEFEF]">
                  <td className="py-1.5 text-ink-500">Designation:</td>
                  <td className="py-1.5 font-medium text-ink-800">{emp.jobTitle}</td>
                </tr>
                <tr className="border-b border-[#EFEFEF]">
                  <td className="py-1.5 text-ink-500">Department:</td>
                  <td className="py-1.5 font-medium text-ink-800">{emp.department}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-ink-500">Work Email:</td>
                  <td className="py-1.5 text-ink-700 truncate max-w-[180px]">{emp.email || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Column 2: Contract & Payroll Details */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 pb-1.5 border-b border-[#E2E8E2]">
              Contract & Payroll
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-[#EFEFEF]">
                  <td className="py-1.5 text-ink-500 w-36">Salary Structure:</td>
                  <td className="py-1.5 font-bold text-ink-900 text-right">
                    {payslip.contract?.structure || payslip.payrunName || 'Standard Structure'}
                  </td>
                </tr>
                <tr className="border-b border-[#EFEFEF]">
                  <td className="py-1.5 text-ink-500">Worked Days:</td>
                  <td className="py-1.5 font-semibold text-ink-900 text-right tnum">
                    {payslip.workedDays ?? 0} days
                  </td>
                </tr>
                <tr className="border-b border-[#EFEFEF]">
                  <td className="py-1.5 text-ink-500">Bank Account:</td>
                  <td className="py-1.5 font-mono text-ink-800 text-right">{bankAccountDisplay}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-ink-500">Contract Base Wage:</td>
                  <td className="py-1.5 font-bold text-ink-900 text-right tnum">
                    {formatCurrencyDetailed(payslip.contract?.wage || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Warnings / Advisory Box */}
        {warnings.length > 0 && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-sm-md text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              Payroll Computation Advisory Notes
            </div>
            <ul className="list-disc list-inside text-amber-800 space-y-0.5 pl-1">
              {warnings.map((w: any, idx: number) => (
                <li key={idx}>{typeof w === 'string' ? w : w.message || JSON.stringify(w)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Rule Lines Breakdown Table */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-ink-900 uppercase tracking-wider border-b border-border pb-2">
            Earnings & Allowances Breakdown
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-soft text-ink-500 text-[11px] font-semibold text-left">
                <th className="py-2">Component</th>
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {/* Basic Salary */}
              {basicLines.map((line, idx) => (
                <tr key={`basic-${idx}`}>
                  <td className="py-2 font-medium text-ink-900">{line.name || line.ruleName}</td>
                  <td className="py-2 text-ink-500 uppercase text-[10px] font-semibold tracking-wide">
                    {line.category}
                  </td>
                  <td className="py-2 text-right font-medium text-ink-900 tnum">
                    {formatCurrencyDetailed(line.amount)}
                  </td>
                </tr>
              ))}

              {/* Allowances */}
              {allowanceLines.map((line, idx) => (
                <tr key={`allowance-${idx}`}>
                  <td className="py-2 font-medium text-ink-900">{line.name || line.ruleName}</td>
                  <td className="py-2 text-ink-500 uppercase text-[10px] font-semibold tracking-wide">
                    {line.category}
                  </td>
                  <td className="py-2 text-right font-medium text-ink-900 tnum">
                    {formatCurrencyDetailed(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {allowanceLines.length > 0 && (
            <div className="flex justify-between py-1.5 px-2 bg-paper/50 rounded text-xs text-ink-600 font-semibold">
              <span>Total Allowances:</span>
              <span className="tnum">{formatCurrencyDetailed(totalAllowances)}</span>
            </div>
          )}

          {/* Gross Salary Subtotal */}
          <div className="flex justify-between py-2.5 px-3 bg-[#F4F6F4] rounded-sm-md border border-border font-bold text-ink-900 text-xs">
            <span>Gross Earnings</span>
            <span className="tnum">{formatCurrencyDetailed(grossSalary)}</span>
          </div>

          {/* Deductions Section */}
          <div className="pt-4 space-y-2">
            <div className="text-xs font-bold text-ink-900 uppercase tracking-wider border-b border-border pb-2">
              Statutory & Voluntary Deductions
            </div>

            {deductionLines.length === 0 ? (
              <div className="text-xs text-ink-400 italic py-1">No deductions applicable.</div>
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-soft text-ink-500 text-[11px] font-semibold text-left">
                      <th className="py-2">Deduction Rule</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Deducted Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft/60">
                    {deductionLines.map((line, idx) => (
                      <tr key={`deduction-${idx}`}>
                        <td className="py-2 font-medium text-ink-900">{line.name || line.ruleName}</td>
                        <td className="py-2 text-ink-500 uppercase text-[10px] font-semibold tracking-wide">
                          {line.category}
                        </td>
                        <td className="py-2 text-right font-medium text-status-danger tnum">
                          - {formatCurrencyDetailed(Math.abs(line.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between py-1.5 px-2 bg-red-50/50 rounded text-xs text-status-danger font-semibold">
                  <span>Total Deductions:</span>
                  <span className="tnum">- {formatCurrencyDetailed(totalDeductions)}</span>
                </div>
              </>
            )}
          </div>

          {/* Net Salary Highlight Banner */}
          <div className="mt-6 p-4 rounded-lg bg-chartreuse-50 border-2 border-chartreuse-400 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-chartreuse-900">
                Net Disbursable Salary
              </div>
              <div className="text-[11px] text-chartreuse-700">
                Calculated sequentially: (Gross Earnings - Deductions)
              </div>
            </div>
            <div className="text-2xl font-black text-ink-900 tnum tracking-tight">
              {formatCurrencyDetailed(netSalary)}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-border-soft text-center text-[11px] text-ink-400 space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <FileCheck2 size={13} className="text-emerald-600" />
            <span>Electronically verified & signed through PeoplePay360 Deterministic Payroll Engine</span>
          </div>
          <div>
            Generated on{' '}
            {new Date().toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
