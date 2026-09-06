import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Layers,
  Users,
  Building2,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Lock,
  ChevronRight,
  BarChart3,
  Briefcase,
  FileText,
  CalendarCheck,
  CalendarOff,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { formatCurrency } from '@/data';
import type { View, UserSession } from '@/types';
import { cn } from '@/lib/utils';

interface PayrollDashboardProps {
  onNavigate?: (view: View, id?: string) => void;
  userSession?: UserSession | null;
}

export function PayrollDashboard({ onNavigate, userSession }: PayrollDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [period, setPeriod] = useState('2026-09');
  const [departmentId, setDepartmentId] = useState('ALL');
  const [employeeType, setEmployeeType] = useState('ALL');
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);

  // Fetch departments list for filter
  useEffect(() => {
    api.departments
      .getAll()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setDepartmentsList(list);
      })
      .catch(() => {});
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboard.get({
        period,
        departmentId: departmentId !== 'ALL' ? departmentId : undefined,
        employeeType: employeeType !== 'ALL' ? employeeType : undefined,
      });
      const result = res.data || res;
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load payroll dashboard');
    } finally {
      setLoading(false);
    }
  }, [period, departmentId, employeeType]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const isHRManager = userSession?.role === 'HR Manager' || data?.isSalaryRestricted;

  // Periods list
  const periods = [
    { value: '2026-09', label: 'Sep 2026' },
    { value: '2026-08', label: 'Aug 2026' },
    { value: '2026-07', label: 'Jul 2026' },
    { value: '2026-06', label: 'Jun 2026' },
    { value: '2026-05', label: 'May 2026' },
    { value: '2026-04', label: 'Apr 2026' },
  ];

  // Formatting helpers
  const formatIndianLakhs = (amount: number) => {
    if (!amount) return '₹ 0';
    if (amount >= 100000) {
      const lakhs = (amount / 100000).toFixed(1).replace('.0', '');
      return `₹ ${lakhs}L`;
    }
    if (amount >= 1000) {
      return `₹ ${Math.round(amount / 1000)}k`;
    }
    return formatCurrency(amount);
  };

  const formatAxisLabel = (amount: number) => {
    if (amount === 0) return '₹0';
    if (amount >= 100000) {
      const lakhs = (amount / 100000).toFixed(1).replace('.0', '');
      return `₹${lakhs}L`;
    }
    if (amount >= 1000) {
      return `₹${Math.round(amount / 1000)}k`;
    }
    return `₹${amount}`;
  };

  const kpis = data?.kpis || {};
  const salaryByDept = data?.salaryCostByDepartment || [];
  const monthlyTrend = data?.monthlyNetSalaryTrend || [];
  const statusSplit = data?.payslipStatusSplit || { paid: 0, validated: 0, computed: 0, draft: 0, total: 0 };
  const alerts = data?.alerts || [];
  const attendance = data?.attendanceOverview || { distribution: {}, missingCheckouts: 0, manualEdits: 0, coveragePct: 94 };
  const timeOffOverview = data?.timeOffOverview || [];
  const deptOverview = data?.departmentOverview || [];
  const headcountByDept = data?.headcountByDepartment || [];
  const attendanceTrend = data?.monthlyAttendanceTrend || [];

  // Salary by dept calculations
  const maxDeptAmount = Math.max(...salaryByDept.map((d: any) => d.amount), 1000);
  const totalSalaryCost = salaryByDept.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  // Monthly trend calculations with calibrated dynamic Y-axis scale (always 4-5 clean, nicely spaced ticks)
  const trendVals = monthlyTrend.map((m: any) => Number(m.value || 0)).filter((v: number) => v > 0);
  const rawTrendMax = trendVals.length > 0 ? Math.max(...trendVals) : 100000;

  // Target 4 intervals (5 ticks)
  const targetIntervals = 4;
  const roughStep = (rawTrendMax * 1.15) / targetIntervals;

  // Round step to clean intervals (1, 2, 2.5, 5, 10 x 10^k)
  const exponent = Math.floor(Math.log10(Math.max(1, roughStep)));
  const base = Math.pow(10, exponent);
  const fraction = roughStep / base;

  let niceMultiplier = 1;
  if (fraction > 5) niceMultiplier = 10;
  else if (fraction > 2.5) niceMultiplier = 5;
  else if (fraction > 1.5) niceMultiplier = 2.5;
  else if (fraction > 1) niceMultiplier = 2;

  const step = Math.max(1000, niceMultiplier * base);
  const yMin = 0;
  const yMax = Math.ceil((rawTrendMax * 1.15) / step) * step;
  const ySpan = Math.max(step, yMax - yMin);

  const yTicks: number[] = [];
  for (let t = yMax; t >= 0; t -= step) {
    yTicks.push(t);
  }

  // Proportional SVG dimensions
  const svgWidth = 540;
  const svgHeight = 175;
  const plotLeft = 56;
  const plotRight = 515;
  const plotTop = 26;
  const plotBottom = 135;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const innerPad = 18;

  const trendPoints = monthlyTrend.map((m: any, i: number) => {
    const n = monthlyTrend.length;
    const x = n > 1 ? (plotLeft + innerPad) + (i / (n - 1)) * (plotWidth - 2 * innerPad) : (plotLeft + plotRight) / 2;
    const clampedVal = Math.max(yMin, Math.min(yMax, m.value || 0));
    const y = plotBottom - ((clampedVal - yMin) / ySpan) * plotHeight;
    return { x, y, ...m };
  });

  // HR Attendance Trend SVG calculations
  const attRates = attendanceTrend.map((a: any) => Number(a.attendanceRate ?? 95));
  const minRate = attRates.length > 0 ? Math.min(...attRates) : 85;
  const attYMin = Math.max(0, Math.min(80, Math.floor((minRate - 2) / 5) * 5));
  const attYMax = 100;
  const attRange = Math.max(10, attYMax - attYMin);

  const attStep = attRange <= 20 ? 5 : 10;
  const attYTicks: number[] = [];
  for (let t = attYMax; t >= attYMin; t -= attStep) {
    attYTicks.push(t);
  }

  const attPoints = attendanceTrend.map((m: any, i: number) => {
    const n = attendanceTrend.length;
    const x = n > 1 ? (plotLeft + innerPad) + (i / (n - 1)) * (plotWidth - 2 * innerPad) : (plotLeft + plotRight) / 2;
    const rate = Number(m.attendanceRate ?? 95);
    const clampedRate = Math.max(attYMin, Math.min(attYMax, rate));
    const y = plotBottom - ((clampedRate - attYMin) / attRange) * plotHeight;
    return { x, y, rate, ...m };
  });

  // Status split percentages (Payroll)
  const splitTotal = statusSplit.total || (statusSplit.paid + statusSplit.validated + statusSplit.computed + statusSplit.draft) || 1;
  const pctPaid = (statusSplit.paid / splitTotal) * 100;
  const pctValidated = (statusSplit.validated / splitTotal) * 100;
  const pctComputed = (statusSplit.computed / splitTotal) * 100;
  const pctDraft = (statusSplit.draft / splitTotal) * 100;

  // Status split percentages (HR Attendance)
  const attDist = attendance.distribution || {};
  const totalAttLogs = (attDist.present || 0) + (attDist.late || 0) + (attDist.absent || 0) + (attDist.overtime || 0) || 1;
  const attPctPresent = ((attDist.present || 0) / totalAttLogs) * 100;
  const attPctLate = ((attDist.late || 0) / totalAttLogs) * 100;
  const attPctAbsent = ((attDist.absent || 0) / totalAttLogs) * 100;
  const attPctOvertime = ((attDist.overtime || 0) / totalAttLogs) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            {isHRManager ? 'HR Operations Dashboard' : 'Payroll Dashboard'}
          </h1>
          <p className="text-xs text-ink-500 mt-1">
            {isHRManager
              ? 'Workforce headcount, attendance health, leave tracking, and department staffing distribution.'
              : 'Dashboard should help payroll/HR users understand payments, staffing impact, leave patterns, and attendance quality for the selected period.'}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading} className="shrink-0">
          <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
          Refresh Data
        </Button>
      </div>

      {/* Filter Bar matching Wireframe */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-surface border border-border rounded-lg shadow-2xs">
        <div>
          <label className="block text-[11px] font-semibold text-ink-500 mb-1">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-border bg-paper rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-ink-500 mb-1">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-border bg-paper rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500"
          >
            <option value="ALL">All Departments</option>
            {departmentsList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-ink-500 mb-1">Employee Type</label>
          <select
            value={employeeType}
            onChange={(e) => setEmployeeType(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-border bg-paper rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-500"
          >
            <option value="ALL">All Types</option>
            <option value="FULL_TIME">Full-Time</option>
            <option value="PART_TIME">Part-Time</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-ink-500 mb-1">Company</label>
          <div className="text-xs px-2.5 py-1.5 border border-border-soft bg-paper/60 rounded-sm-md text-ink-700 font-medium truncate">
            {data?.company || 'Odoo Hackathon Pvt Ltd'}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm-md flex items-center gap-2 text-xs text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Row 1: Top 5 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isHRManager ? (
          <>
            {/* HR KPI 1: Active Employees */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-ink-600 font-semibold">Active Employees</span>
                <Users size={14} className="text-ink-400" />
              </div>
              <div className="text-2xl font-bold text-ink-900 tnum tracking-tight">
                {kpis.activeEmployees ?? 0}
              </div>
              <div className="text-xs text-ink-500">Across active departments</div>
            </div>

            {/* HR KPI 2: Attendance Health */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-ink-600 font-semibold">Attendance Health</span>
                <CalendarCheck size={14} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700 tnum tracking-tight">
                {kpis.attendanceHealthPct ?? 94}%
              </div>
              <div className="text-xs text-ink-500">Present / reviewed records</div>
            </div>

            {/* HR KPI 3: Pending Leave Requests */}
            <div
              onClick={() => onNavigate?.('time-off-requests')}
              className="p-4 bg-surface border border-border hover:border-amber-400 rounded-lg shadow-2xs space-y-1.5 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-ink-600 font-semibold">Pending Leaves</span>
                {(kpis.pendingLeaveRequests ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                    Action
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-amber-700 tnum tracking-tight">
                {kpis.pendingLeaveRequests ?? 0}
              </div>
              <div className="text-xs text-ink-500 group-hover:text-amber-700 flex items-center gap-1">
                <span>Awaiting decision</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* HR KPI 4: Approved Time Off */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-ink-600 font-semibold">Approved Leaves</span>
                <CalendarOff size={14} className="text-ink-400" />
              </div>
              <div className="text-2xl font-bold text-ink-900 tnum tracking-tight">
                {kpis.approvedTimeOff?.label ?? '0 Days'}
              </div>
              <div className="text-xs text-ink-500">Across selected period</div>
            </div>

            {/* HR KPI 5: Expiring Contracts */}
            <div
              onClick={() => onNavigate?.('contracts')}
              className="p-4 bg-surface border border-border hover:border-blue-400 rounded-lg shadow-2xs space-y-1.5 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-ink-600 font-semibold">Expiring Contracts</span>
                <FileText size={14} className="text-ink-400" />
              </div>
              <div className="text-2xl font-bold text-ink-900 tnum tracking-tight">
                {kpis.expiringContracts ?? 0}
              </div>
              <div className="text-xs text-ink-500 group-hover:text-blue-700 flex items-center gap-1">
                <span>Next 30 days</span>
                <ChevronRight size={12} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Payroll KPI 1: Total Net Salary Paid */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="text-xs md:text-sm text-ink-600 font-semibold">Total Net Salary Paid</div>
              <div className="text-2xl font-bold text-ink-900 tnum tracking-tight">
                {formatIndianLakhs(kpis.totalNetSalaryPaid || 0)}
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <TrendingUp size={13} />
                <span>+{kpis.netTrendPct ?? 8.8}% vs previous month</span>
              </div>
            </div>

            {/* Payroll KPI 2: Payslips Generated */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="text-xs md:text-sm text-ink-600 font-semibold">Payslips Generated</div>
              <div className="text-2xl font-bold text-ink-900 tnum tracking-tight">
                {kpis.payslipsGenerated?.total ?? 0}
              </div>
              <div className="text-xs text-ink-600 tnum">
                <span className="text-emerald-700 font-semibold">{kpis.payslipsGenerated?.paid ?? 0} paid</span>
                {', '}
                <span className="text-amber-700 font-semibold">{kpis.payslipsGenerated?.pending ?? 0} pending</span>
              </div>
            </div>

            {/* Payroll KPI 3: Avg Salary / Employee */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="text-xs md:text-sm text-ink-600 font-semibold">Avg Salary / Employee</div>
              <div className="text-2xl font-bold text-ink-900 tnum tracking-tight">
                {formatCurrency(kpis.averageSalary || 0)}
              </div>
              <div className="text-xs text-ink-500">Based on current payrun</div>
            </div>

            {/* Payroll KPI 4: Approved Time Off Days */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="text-xs md:text-sm text-ink-600 font-semibold">Approved Time Off Days</div>
              <div className="text-2xl font-bold text-ink-900 tnum tracking-tight">
                {kpis.approvedTimeOff?.label ?? '0 Days'}
              </div>
              <div className="text-xs text-ink-500">across selected period</div>
            </div>

            {/* Payroll KPI 5: Attendance Health */}
            <div className="p-4 bg-surface border border-border rounded-lg shadow-2xs space-y-1.5">
              <div className="text-xs md:text-sm text-ink-600 font-semibold">Attendance Health</div>
              <div className="text-2xl font-bold text-emerald-700 tnum tracking-tight">
                {kpis.attendanceHealthPct ?? 94}%
              </div>
              <div className="text-xs text-ink-500">Present / reviewed records</div>
            </div>
          </>
        )}
      </div>

      {/* Row 2: Monthly Trend (Salary for Payroll / Attendance for HR) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink-900 tracking-tight">
                {isHRManager ? 'Monthly Workforce Attendance Trend' : 'Monthly Net Salary Trend'}
              </h3>
              <TrendingUp size={18} className="text-emerald-700" />
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              {isHRManager
                ? 'Source: Historical attendance logs & approved time off across past 6 months'
                : 'Source: Historical Payslips / Payruns across past 6 months'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-paper border border-border-soft text-ink-600 font-medium">
              {isHRManager ? (
                <>
                  Latest Attendance:{' '}
                  <strong className="text-emerald-700">
                    {attendanceTrend[attendanceTrend.length - 1]?.attendanceRate ?? 94}%
                  </strong>
                </>
              ) : (
                <>
                  Latest:{' '}
                  <strong className="text-ink-900">
                    {formatIndianLakhs(monthlyTrend[monthlyTrend.length - 1]?.value || 0)}
                  </strong>
                </>
              )}
            </span>
          </div>
        </div>

        {isHRManager ? (
          attendanceTrend.length === 0 ? (
            <div className="py-14 text-center text-xs text-ink-400">No attendance trend history available.</div>
          ) : (
            <div className="max-w-3xl mx-auto w-full relative pt-1">
              <svg className="w-full h-auto overflow-visible" viewBox="0 0 540 185">
                <defs>
                  <linearGradient id="hrTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Y-axis gridlines and scale labels */}
                {attYTicks.map((t, idx) => {
                  const y = plotBottom - ((t - attYMin) / (attRange || 1)) * plotHeight;
                  return (
                    <g key={idx}>
                      <line
                        x1={plotLeft}
                        y1={y}
                        x2={plotRight}
                        y2={y}
                        stroke="#E5E7EB"
                        strokeWidth={idx === attYTicks.length - 1 ? 1.5 : 1}
                        strokeDasharray={idx === attYTicks.length - 1 ? undefined : '2 3'}
                      />
                      <text
                        x={plotLeft - 6}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="9.5"
                        fill="#6B7280"
                        fontWeight="500"
                      >
                        {t}%
                      </text>
                    </g>
                  );
                })}

                {/* Area polygon */}
                {attPoints.length > 0 && (
                  <polygon
                    points={`${attPoints.map((p: any) => `${p.x},${p.y}`).join(' ')} ${plotRight - innerPad},${plotBottom} ${plotLeft + innerPad},${plotBottom}`}
                    fill="url(#hrTrendGradient)"
                  />
                )}

                {/* Trend Polyline */}
                {attPoints.length > 0 && (
                  <polyline
                    points={attPoints.map((p: any) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points, exact values & X-axis month ticks */}
                {attPoints.map((p: any, i: number) => (
                  <g key={i}>
                    {/* Exact Value above point */}
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#047857"
                    >
                      {p.rate}%
                    </text>

                    {/* Circle Point */}
                    <circle cx={p.x} cy={p.y} r="3.5" fill="#064E3B" stroke="#34D399" strokeWidth="2" />

                    {/* X-axis Tick mark */}
                    <line x1={p.x} y1={plotBottom} x2={p.x} y2={plotBottom + 4} stroke="#9CA3AF" strokeWidth="1" />

                    {/* X-axis Month Label */}
                    <text
                      x={p.x}
                      y={plotBottom + 16}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="600"
                      fill="#374151"
                    >
                      {p.month}
                    </text>

                    {/* Leave days badge below month */}
                    <text
                      x={p.x}
                      y={plotBottom + 28}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="500"
                      fill="#6B7280"
                    >
                      {p.leaveDays}d off
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )
        ) : monthlyTrend.length === 0 ? (
          <div className="py-14 text-center text-xs text-ink-400">No trend history available.</div>
        ) : (
          <div className="max-w-3xl mx-auto w-full relative pt-1">
            <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#84CC16" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#84CC16" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Y-axis gridlines and scale labels */}
              {yTicks.map((t, idx) => {
                const y = plotBottom - ((t - yMin) / ySpan) * plotHeight;
                const isBaseline = idx === yTicks.length - 1;
                return (
                  <g key={idx}>
                    <line
                      x1={plotLeft}
                      y1={y}
                      x2={plotRight}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeWidth={isBaseline ? 1.5 : 1}
                      strokeDasharray={isBaseline ? undefined : '2 3'}
                    />
                    <text
                      x={plotLeft - 6}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="9.5"
                      fill="#6B7280"
                      fontWeight="500"
                    >
                      {formatAxisLabel(t)}
                    </text>
                  </g>
                );
              })}

              {/* Area polygon */}
              {trendPoints.length > 0 && (
                <polygon
                  points={`${trendPoints.map((p: any) => `${p.x},${p.y}`).join(' ')} ${plotRight - innerPad},${plotBottom} ${plotLeft + innerPad},${plotBottom}`}
                  fill="url(#trendGradient)"
                />
              )}

              {/* Trend Polyline */}
              {trendPoints.length > 0 && (
                <polyline
                  points={trendPoints.map((p: any) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#84CC16"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points, exact values & X-axis month ticks */}
              {trendPoints.map((p: any, i: number) => (
                <g key={i}>
                  {/* Exact Value above point */}
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="#1C1F1E"
                  >
                    {formatIndianLakhs(p.value)}
                  </text>

                  {/* Circle Point */}
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#1F2937" stroke="#84CC16" strokeWidth="2" />

                  {/* X-axis Tick mark */}
                  <line x1={p.x} y1={plotBottom} x2={p.x} y2={plotBottom + 4} stroke="#9CA3AF" strokeWidth="1" />

                  {/* X-axis Month Label */}
                  <text
                    x={p.x}
                    y={plotBottom + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#4B5563"
                  >
                    {p.month}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Row 3: Two Visual Graphs Below (50/50 2-column layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Headcount by Department for HR Manager / Salary Cost by Department for Payroll */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base font-bold text-ink-900 tracking-tight">
                  {isHRManager ? 'Headcount by Department' : 'Salary Cost by Department'}
                </h3>
                <p className="text-xs text-ink-500">
                  {isHRManager ? 'Source: Active employee distribution' : 'Source: Payslips + Employee Department'}
                </p>
              </div>
              <BarChart3 size={18} className="text-ink-400" />
            </div>

            {isHRManager ? (
              headcountByDept.length === 0 ? (
                <div className="py-14 text-center text-xs text-ink-400">No departmental headcount data.</div>
              ) : (
                <div className="space-y-3 pt-3">
                  {headcountByDept.map((d: any) => (
                    <div key={d.id || d.department} className="space-y-1.5 p-2 rounded-md hover:bg-paper/50 transition-colors">
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="font-semibold text-ink-900">{d.department}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium tnum bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {d.percentage}%
                          </span>
                          <span className="font-bold text-ink-900 tnum">
                            {d.count} {d.count === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-paper rounded-full overflow-hidden border border-border-soft/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-chartreuse-500 transition-all duration-500"
                          style={{ width: `${Math.max(6, d.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : salaryByDept.length === 0 ? (
              <div className="py-14 text-center text-xs text-ink-400">No departmental salary data.</div>
            ) : (
              <div className="space-y-3 pt-3">
                {salaryByDept.slice(0, 5).map((d: any) => {
                  const pctOfMax = d.amount > 0 ? Math.round((d.amount / maxDeptAmount) * 100) : 0;
                  const pctOfTotal = totalSalaryCost > 0 && d.amount > 0 ? Math.round((d.amount / totalSalaryCost) * 100) : 0;
                  return (
                    <div key={d.department} className="space-y-1.5 p-2 rounded-md hover:bg-paper/50 transition-colors">
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-900">{d.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium tnum',
                            d.amount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-paper text-ink-400 border border-border-soft'
                          )}>
                            {pctOfTotal}%
                          </span>
                          <span className={cn('font-bold tnum', d.amount > 0 ? 'text-ink-900' : 'text-ink-400 font-normal')}>
                            {formatCurrency(d.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-paper rounded-full overflow-hidden border border-border-soft/60">
                        {d.amount > 0 ? (
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-chartreuse-500 transition-all duration-500"
                            style={{ width: `${Math.max(6, pctOfMax)}%` }}
                          />
                        ) : (
                          <div className="h-full w-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Status Split & Alerts */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base font-bold text-ink-900 tracking-tight">
                  {isHRManager ? 'Attendance Status & HR Action Alerts' : 'Payslip Status & Payroll Alerts'}
                </h3>
                <p className="text-xs text-ink-500">
                  {isHRManager ? 'Source: Attendance system & HR pending queues' : 'Source: Payrun + Payslip validation'}
                </p>
              </div>
              {alerts.some((a: any) => (a.count || 0) > 0) ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                  <span>{alerts.filter((a: any) => (a.count || 0) > 0).length} Warning{alerts.filter((a: any) => (a.count || 0) > 0).length > 1 ? 's' : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>All Clear</span>
                </div>
              )}
            </div>

            {/* Status Split Horizontal Bar */}
            <div className="space-y-1.5 mt-3 mb-4">
              <div className="text-xs font-semibold text-ink-700">
                {isHRManager ? 'Attendance status split' : 'Payslip status split'}
              </div>
              {isHRManager ? (
                <>
                  <div className="h-3.5 w-full bg-paper rounded-full flex overflow-hidden border border-border-soft">
                    {attPctPresent > 0 && (
                      <div style={{ width: `${attPctPresent}%` }} className="bg-emerald-500 h-full" title={`Present: ${attDist.present || 0}`} />
                    )}
                    {attPctLate > 0 && (
                      <div style={{ width: `${attPctLate}%` }} className="bg-amber-400 h-full" title={`Late: ${attDist.late || 0}`} />
                    )}
                    {attPctAbsent > 0 && (
                      <div style={{ width: `${attPctAbsent}%` }} className="bg-rose-500 h-full" title={`Absent: ${attDist.absent || 0}`} />
                    )}
                    {attPctOvertime > 0 && (
                      <div style={{ width: `${attPctOvertime}%` }} className="bg-sky-500 h-full" title={`Overtime: ${attDist.overtime || 0}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-600 font-medium pt-0.5 flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present ({attDist.present || 0})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Late ({attDist.late || 0})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent ({attDist.absent || 0})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Overtime ({attDist.overtime || 0})</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-3.5 w-full bg-paper rounded-full flex overflow-hidden border border-border-soft">
                    {pctPaid > 0 && (
                      <div style={{ width: `${pctPaid}%` }} className="bg-emerald-500 h-full" title={`Paid: ${statusSplit.paid}`} />
                    )}
                    {pctValidated > 0 && (
                      <div style={{ width: `${pctValidated}%` }} className="bg-sky-500 h-full" title={`Validated: ${statusSplit.validated}`} />
                    )}
                    {pctComputed > 0 && (
                      <div style={{ width: `${pctComputed}%` }} className="bg-amber-400 h-full" title={`Computed: ${statusSplit.computed}`} />
                    )}
                    {pctDraft > 0 && (
                      <div style={{ width: `${pctDraft}%` }} className="bg-slate-400 h-full" title={`Draft: ${statusSplit.draft}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-3.5 text-xs text-ink-600 font-medium pt-0.5">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid ({statusSplit.paid})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Validated ({statusSplit.validated})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Computed ({statusSplit.computed})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Draft ({statusSplit.draft})</span>
                  </div>
                </>
              )}
            </div>

            {/* Current Alerts List with contextual colors */}
            <div className="space-y-2 pt-2 border-t border-border-soft">
              <div className="text-xs font-semibold text-ink-700 mb-1">
                {isHRManager ? 'Actionable HR alerts' : 'Current alerts & warnings'}
              </div>
              {alerts.map((a: any) => {
                const isTriggered = (a.count || 0) > 0;
                return isTriggered ? (
                  <div
                    key={a.id}
                    onClick={() => a.actionView && onNavigate?.(a.actionView as any)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-md bg-amber-50/90 border border-amber-200 text-xs transition-colors",
                      a.actionView && "cursor-pointer hover:bg-amber-100/90 group"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-amber-950 font-semibold">{a.title}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 shrink-0 flex items-center gap-0.5 group-hover:bg-amber-300">
                      {a.actionView ? 'Action' : 'Required'}
                      {a.actionView && <ChevronRight size={10} />}
                    </span>
                  </div>
                ) : (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-paper/40 text-xs text-ink-500 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      <span className="text-ink-600">{a.title}</span>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      All clear
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Detail Breakdowns (Clean & Cohesive 3-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Attendance Overview */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-ink-900 tracking-tight">Attendance Overview</h4>
                <p className="text-xs text-ink-500">Today's presence & compliance</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-ink-700">
                {attendance.coveragePct ?? 50}% Coverage
              </span>
            </div>

            {/* Clean 4-stat metric row */}
            <div className="grid grid-cols-4 py-3 border-y border-border-soft text-center my-2">
              <div>
                <div className="text-xl font-bold text-ink-900 tnum">
                  {attendance.distribution?.present ?? 0}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">Present</div>
              </div>
              <div className="border-l border-border-soft">
                <div className="text-xl font-bold text-ink-900 tnum">
                  {attendance.distribution?.late ?? 0}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">Late</div>
              </div>
              <div className="border-l border-border-soft">
                <div className="text-xl font-bold text-ink-900 tnum">
                  {attendance.distribution?.absent ?? 0}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">Absent</div>
              </div>
              <div className="border-l border-border-soft">
                <div className="text-xl font-bold text-ink-900 tnum">
                  {attendance.distribution?.overtime ?? 0}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">Overtime</div>
              </div>
            </div>

            {/* Attendance Coverage Progress Bar */}
            <div className="space-y-1.5 py-1">
              <div className="flex justify-between text-xs text-ink-600">
                <span>Attendance Coverage</span>
                <span className="font-semibold text-ink-900 tnum">{attendance.coveragePct ?? 50}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${attendance.coveragePct ?? 50}%` }}
                />
              </div>
            </div>

            {/* Compliance Audit Signals */}
            <div className="divide-y divide-border-soft text-xs pt-1">
              <div className="flex items-center justify-between py-2">
                <span className="text-ink-600">Missing Checkouts</span>
                <span className={cn(
                  'font-semibold tnum',
                  (attendance.missingCheckouts ?? 0) > 0 ? 'text-amber-700' : 'text-ink-900'
                )}>
                  {attendance.missingCheckouts ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-ink-600">Manual Edits Recorded</span>
                <span className="font-semibold text-ink-900 tnum">
                  {attendance.manualEdits ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Time Off Overview */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-ink-900 tracking-tight">Time Off Overview</h4>
                <p className="text-xs text-ink-500">Leave balances & active requests</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-ink-700">
                {timeOffOverview.length} Policy Types
              </span>
            </div>

            {timeOffOverview.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-400">No leave records.</div>
            ) : (
              <div className="divide-y divide-border-soft">
                {timeOffOverview.map((row: any) => {
                  const hasRemaining = row.remainingBalance && row.remainingBalance !== 'N/A';
                  return (
                    <div
                      key={row.id}
                      className="py-3 first:pt-1 last:pb-1 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-ink-900 text-xs md:text-sm truncate">
                          {row.type}
                        </div>
                        <div className="text-xs text-ink-500 flex items-center gap-3 mt-1">
                          <span>Approved: <strong className="text-ink-800 font-semibold tnum">{row.approvedDays}d</strong></span>
                          <span>Pending: <strong className={cn('tnum', row.pending > 0 ? 'text-amber-700 font-bold' : 'text-ink-800 font-medium')}>{row.pending}</strong></span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded font-medium',
                          hasRemaining
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-ink-500'
                        )}>
                          {row.remainingBalance}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Department Overview */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-ink-900 tracking-tight">
                  {isHRManager ? 'Department Staffing' : 'Department Overview'}
                </h4>
                <p className="text-xs text-ink-500">
                  {isHRManager ? 'Headcount, active contracts & time off' : 'Staffing distribution & payroll cost'}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-ink-700">
                {deptOverview.reduce((s: number, d: any) => s + (d.headcount || 0), 0)} Total Staff
              </span>
            </div>

            {deptOverview.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-400">No department data.</div>
            ) : (
              <div className="divide-y divide-border-soft max-h-[310px] overflow-y-auto pr-0.5">
                {deptOverview.map((d: any) => (
                  <div
                    key={d.id}
                    className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-ink-900 text-xs md:text-sm truncate">
                        {d.department}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">
                        {d.headcount} {d.headcount === 1 ? 'member' : 'members'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isHRManager ? (
                        <>
                          <div className="text-xs md:text-sm font-semibold text-ink-900 tnum">
                            {d.activeContracts ?? 0} {d.activeContracts === 1 ? 'Contract' : 'Contracts'}
                          </div>
                          <div className="text-[10px] text-ink-500">
                            {d.leaveDays ?? 0} {d.leaveDays === 1 ? 'day off' : 'days off'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs md:text-sm font-semibold text-ink-900 tnum">
                            {formatIndianLakhs(d.monthlySalary)}
                          </div>
                          <div className="text-[10px] text-ink-400">Monthly</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
