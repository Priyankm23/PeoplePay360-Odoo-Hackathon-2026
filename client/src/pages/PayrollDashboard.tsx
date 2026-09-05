import { AlertTriangle, Info, AlertCircle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatTile } from '@/components/StatTile';
import { payrollAlerts, employees, payslips, formatCurrency } from '@/data';
import { cn } from '@/lib/utils';

export function PayrollDashboard() {
  const totalNet = payslips.reduce((sum, p) => sum + p.net, 0);
  const avgSalary = Math.round(totalNet / payslips.length);

  // Salary cost by department
  const deptCosts = ['Engineering', 'Finance', 'Human Resources', 'Sales', 'Operations'].map(
    (dept) => {
      const deptEmployees = employees.filter((e) => e.department === dept);
      const deptPayslips = payslips.filter((p) =>
        deptEmployees.some((e) => e.id === p.employeeId)
      );
      return {
        dept,
        cost: deptPayslips.reduce((sum, p) => sum + p.net, 0),
      };
    }
  );
  const maxCost = Math.max(...deptCosts.map((d) => d.cost), 1);

  // Monthly trend (mock data)
  const monthlyTrend = [
    { month: 'May', value: 87100 },
    { month: 'Jun', value: 87620 },
    { month: 'Jul', value: 93850 },
    { month: 'Aug', value: 94180 },
    { month: 'Sep', value: totalNet },
  ];
  const maxTrend = Math.max(...monthlyTrend.map((m) => m.value));
  const minTrend = Math.min(...monthlyTrend.map((m) => m.value));
  const trendRange = maxTrend - minTrend || 1;

  const alertIcons = {
    warning: AlertTriangle,
    info: Info,
    danger: AlertCircle,
  };

  const alertColors = {
    warning: 'text-status-warning',
    info: 'text-status-info',
    danger: 'text-status-danger',
  };

  return (
    <div>
      <PageHeader
        title="Payroll Dashboard"
        subtitle="Financial overview and operational alerts"
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <select className="text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300">
          <option>September 2025</option>
          <option>August 2025</option>
          <option>July 2025</option>
        </select>
        <select className="text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300">
          <option>All Departments</option>
          <option>Engineering</option>
          <option>Finance</option>
          <option>Human Resources</option>
          <option>Sales</option>
          <option>Operations</option>
        </select>
        <select className="text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300">
          <option>All Employee Types</option>
          <option>Full-time</option>
          <option>Part-time</option>
          <option>Contractor</option>
        </select>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatTile label="Total Net Paid" value={formatCurrency(totalNet)} highlight />
        <StatTile label="Payslips Generated" value={payslips.length} highlight />
        <StatTile label="Average Salary" value={formatCurrency(avgSalary)} highlight />
        <StatTile label="Approved Time Off" value="14 days" highlight />
        <StatTile label="Attendance Health" value="94.2%" highlight />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Bar chart */}
        <div className="border border-border bg-surface rounded-sm-md p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Salary Cost by Department</h3>
          <div className="space-y-3">
            {deptCosts.map((d) => (
              <div key={d.dept} className="flex items-center gap-3">
                <div className="w-24 text-xs text-ink-500 shrink-0 text-right">{d.dept}</div>
                <div className="flex-1 h-6 bg-paper rounded-sm relative overflow-hidden">
                  <div
                    className="h-full bg-chartreuse-400 rounded-sm transition-all flex items-center justify-end pr-2"
                    style={{ width: `${(d.cost / maxCost) * 100}%` }}
                  >
                    <span className="text-[10px] font-medium text-ink-900 tnum">
                      {formatCurrency(d.cost)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Line chart */}
        <div className="border border-border bg-surface rounded-sm-md p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Monthly Net Salary Trend</h3>
          <div className="relative h-[180px]">
            <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y * 160 + 10}
                  x2="400"
                  y2={y * 160 + 10}
                  stroke="#E5E7E4"
                  strokeWidth="1"
                />
              ))}

              {/* Line */}
              <polyline
                points={monthlyTrend
                  .map((m, i) => {
                    const x = (i / (monthlyTrend.length - 1)) * 380 + 10;
                    const y = 170 - ((m.value - minTrend) / trendRange) * 150;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#A3C238"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Area fill */}
              <polygon
                points={`${monthlyTrend
                  .map((m, i) => {
                    const x = (i / (monthlyTrend.length - 1)) * 380 + 10;
                    const y = 170 - ((m.value - minTrend) / trendRange) * 150;
                    return `${x},${y}`;
                  })
                  .join(' ')} 390,170 10,170`}
                fill="#A3C238"
                opacity="0.08"
              />

              {/* Dots */}
              {monthlyTrend.map((m, i) => {
                const x = (i / (monthlyTrend.length - 1)) * 380 + 10;
                const y = 170 - ((m.value - minTrend) / trendRange) * 150;
                return (
                  <circle key={i} cx={x} cy={y} r="3" fill="#1C1F1E" />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between mt-2 px-2">
            {monthlyTrend.map((m) => (
              <div key={m.month} className="text-center">
                <div className="text-xs text-ink-500">{m.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="border border-border bg-surface rounded-sm-md">
        <div className="px-5 py-3.5 border-b border-border-soft">
          <h3 className="text-sm font-semibold text-ink-900">Alerts</h3>
        </div>
        <div className="divide-y divide-border-soft">
          {payrollAlerts.map((alert) => {
            const Icon = alertIcons[alert.severity];
            return (
              <div
                key={alert.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-paper/50 transition-colors"
              >
                <Icon size={16} className={cn('shrink-0', alertColors[alert.severity])} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900">{alert.type}</div>
                  <div className="text-xs text-ink-500">{alert.message}</div>
                </div>
                <span className="text-xs tnum text-ink-500 shrink-0">
                  {alert.affectedCount} {alert.affectedCount === 1 ? 'employee' : 'employees'}
                </span>
                <button className="text-xs text-ink-500 hover:text-ink-900 transition-colors flex items-center gap-0.5 shrink-0">
                  View
                  <ChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
