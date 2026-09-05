import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AuthLandingPage } from '@/pages/AuthLandingPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { EmployeeDetailPage } from '@/pages/EmployeeDetailPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { WorkingSchedulesPage } from '@/pages/WorkingSchedulesPage';
import { ContractsPage } from '@/pages/ContractsPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { TimeOffRequestsPage } from '@/pages/TimeOffRequestsPage';
import { PayrollDashboard } from '@/pages/PayrollDashboard';
import { PayrunsPage } from '@/pages/PayrunsPage';
import { PayrunDetailPage } from '@/pages/PayrunDetailPage';
import { PayslipsPage } from '@/pages/PayslipsPage';
import { PayslipDetailPage } from '@/pages/PayslipDetailPage';
import { SalaryStructuresPage } from '@/pages/SalaryStructuresPage';
import type { View, UserSession } from '@/types';
import { LogOut, ShieldCheck } from 'lucide-react';

export function App() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [currentView, setCurrentView] = useState<View>('payroll-dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('emp-1');
  const [selectedPayrunId, setSelectedPayrunId] = useState<string>('p1');
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>('ps1');

  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    setCurrentView('payroll-dashboard');
  };

  const handleLogout = () => {
    setUserSession(null);
  };

  const handleNavigate = (view: View, id?: string) => {
    setCurrentView(view);
    if (id) {
      if (view === 'employee-detail') setSelectedEmployeeId(id);
      if (view === 'payrun-detail') setSelectedPayrunId(id);
      if (view === 'payslip-detail') setSelectedPayslipId(id);
    }
  };

  if (!userSession) {
    return <AuthLandingPage onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'employees':
        return <EmployeesPage onNavigate={handleNavigate} />;
      case 'employee-detail':
        return (
          <EmployeeDetailPage
            employeeId={selectedEmployeeId}
            onNavigate={handleNavigate}
          />
        );
      case 'departments':
        return <DepartmentsPage onNavigate={handleNavigate} />;
      case 'working-schedules':
        return <WorkingSchedulesPage />;
      case 'contracts':
        return <ContractsPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'time-off-requests':
      case 'time-off-allocations':
      case 'time-off-types':
        return <TimeOffRequestsPage onNavigate={handleNavigate} />;
      case 'payroll-dashboard':
        return <PayrollDashboard />;
      case 'payruns':
        return <PayrunsPage onNavigate={handleNavigate} />;
      case 'payrun-detail':
        return (
          <PayrunDetailPage
            payrunId={selectedPayrunId}
            onNavigate={handleNavigate}
          />
        );
      case 'payslips':
        return <PayslipsPage onNavigate={handleNavigate} />;
      case 'payslip-detail':
        return (
          <PayslipDetailPage
            payslipId={selectedPayslipId}
            onNavigate={handleNavigate}
          />
        );
      case 'salary-structures':
      case 'salary-rules':
        return <SalaryStructuresPage />;
      default:
        return <PayrollDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-app overflow-hidden font-sans text-ink-900 antialiased">
      {/* Sidebar */}
      <Sidebar
        current={currentView}
        onNavigate={(v) => handleNavigate(v)}
        userSession={userSession}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-app">
        {/* Top Operational Bar */}
        <header className="h-12 bg-white border-b border-border px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
              Portal Mode:
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-chartreuse-50 border border-chartreuse-200 text-ink-900 text-xs font-medium">
              <ShieldCheck size={14} className="text-chartreuse-600" />
              <span>{userSession.role}</span>
            </div>
            {userSession.department && (
              <span className="text-xs text-ink-500">
                Department: <strong>{userSession.department}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-ink-900 text-chartreuse-300 font-semibold text-xs flex items-center justify-center">
                {userSession.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-ink-900">
                {userSession.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-status-danger transition-colors font-medium pl-2 border-l border-border"
            >
              <LogOut size={13} />
              <span>Sign Out / Switch Role</span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-7xl w-full mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
