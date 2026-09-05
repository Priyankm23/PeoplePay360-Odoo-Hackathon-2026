import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AuthLandingPage } from './pages/AuthLandingPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { JobPositionsPage } from './pages/JobPositionsPage';
import { WorkingSchedulesPage } from './pages/WorkingSchedulesPage';
import { ContractsPage } from './pages/ContractsPage';
import { AttendancePage } from './pages/AttendancePage';
import { TimeOffRequestsPage } from './pages/TimeOffRequestsPage';
import { PayrollDashboard } from './pages/PayrollDashboard';
import { PayrunsPage } from './pages/PayrunsPage';
import { PayrunDetailPage } from './pages/PayrunDetailPage';
import { PayslipsPage } from './pages/PayslipsPage';
import { PayslipDetailPage } from './pages/PayslipDetailPage';
import { SalaryStructuresPage } from './pages/SalaryStructuresPage';
import type { View, UserSession, UserRole } from './types';
import { ShieldCheck } from 'lucide-react';
import { api } from './lib/api';
import { AttendanceWidget } from './components/AttendanceWidget';

export function App() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<View>('payroll-dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('emp-1');
  const [selectedPayrunId, setSelectedPayrunId] = useState('p1');
  const [selectedPayslipId, setSelectedPayslipId] = useState('ps1');
  const [relatedEmployeeId, setRelatedEmployeeId] = useState<string | undefined>();
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { view?: View; id?: string; relatedEmployeeId?: string } | null;
      if (!state?.view) return;

      setCurrentView(state.view);
      if (state.view === 'employee-detail' && state.id) setSelectedEmployeeId(state.id);
      if (state.view === 'payrun-detail' && state.id) setSelectedPayrunId(state.id);
      if (state.view === 'payslip-detail' && state.id) setSelectedPayslipId(state.id);
      if (state.view === 'contracts' || state.view === 'attendance' || state.view === 'time-off-requests' || state.view === 'time-off-allocations') {
        setRelatedEmployeeId(state.relatedEmployeeId);
      }
    };

    if (!window.history.state?.view) {
      window.history.replaceState({ view: currentView }, '', window.location.href);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  useEffect(() => {
    api.auth.getMe().then((user) => {
      const roleMap: Record<string, UserRole> = { ADMIN: 'Admin', HR_MANAGER: 'HR Manager', HR_PAYROLL_MANAGER: 'HR Payroll Manager', HR_PAYROLL_USER: 'HR Payroll User', EMPLOYEE: 'Employee' };
      const role = roleMap[user.role] || 'Employee';
      setUserSession({ email: user.email, name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email.split('@')[0], role, employeeId: user.employeeId, department: user.employee?.department?.name || 'General', avatarColor: 'bg-chartreuse-500' });
      if (role === 'Employee' && user.employeeId) { setSelectedEmployeeId(user.employeeId); setCurrentView('employee-detail'); } else if (role === 'HR Manager') setCurrentView('employees');
    }).catch(() => {}).finally(() => setIsInitializing(false));
  }, []);

  const handleLogin = (session: UserSession) => { setUserSession(session); if (session.role === 'Employee') { if (session.employeeId) setSelectedEmployeeId(session.employeeId); setCurrentView('employee-detail'); } else if (session.role === 'HR Manager') setCurrentView('employees'); else setCurrentView('payroll-dashboard'); };
  const handleLogout = async () => { try { await api.auth.logout(); } catch {} setUserSession(null); };
  const handleNavigate = (view: View, id?: string) => {
    if ((view === 'employees' || view === 'contracts') && userSession?.role === 'Employee') { if (userSession.employeeId) setSelectedEmployeeId(userSession.employeeId); setCurrentView('employee-detail'); return; }
    if ((view === 'payroll-dashboard' || view === 'payruns' || view === 'salary-structures' || view === 'salary-rules') && userSession?.role === 'HR Manager') { setCurrentView('employees'); return; }
    setCurrentView(view);
    if (view === 'employee-detail' && id) setSelectedEmployeeId(id);
    if (view === 'payrun-detail' && id) setSelectedPayrunId(id);
    if (view === 'payslip-detail' && id) setSelectedPayslipId(id);
    if (view === 'contracts' || view === 'attendance' || view === 'time-off-requests' || view === 'time-off-allocations') setRelatedEmployeeId(id);
    window.history.pushState(
      { view, id, relatedEmployeeId: view === 'contracts' || view === 'attendance' || view === 'time-off-requests' || view === 'time-off-allocations' ? id : undefined },
      '',
      window.location.href
    );
  };

  if (isInitializing) return <div className="h-screen w-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!userSession) return <AuthLandingPage onLogin={handleLogin} />;

  const renderView = () => {
    switch (currentView) {
      case 'employees': return <EmployeesPage onNavigate={handleNavigate} userSession={userSession} />;
      case 'employee-detail': return <EmployeeDetailPage employeeId={selectedEmployeeId} onNavigate={handleNavigate} userSession={userSession} />;
      case 'departments': return <DepartmentsPage onNavigate={handleNavigate} userSession={userSession} />;
      case 'job-positions': return <JobPositionsPage userSession={userSession} />;
      case 'working-schedules': return <WorkingSchedulesPage userSession={userSession} />;
      case 'contracts': return <ContractsPage employeeId={relatedEmployeeId} userSession={userSession} onNavigate={handleNavigate} />;
      case 'attendance': return <AttendancePage employeeId={relatedEmployeeId} userSession={userSession} onNavigate={handleNavigate} refreshKey={attendanceRefreshKey} />;
      case 'time-off-requests':
      case 'time-off-allocations':
      case 'time-off-types': return <TimeOffRequestsPage onNavigate={handleNavigate} employeeId={relatedEmployeeId} />;
      case 'payroll-dashboard': return <PayrollDashboard />;
      case 'payruns': return <PayrunsPage onNavigate={handleNavigate} userSession={userSession} />;
      case 'payrun-detail': return <PayrunDetailPage payrunId={selectedPayrunId} onNavigate={handleNavigate} userSession={userSession} />;
      case 'payslips': return <PayslipsPage onNavigate={handleNavigate} userSession={userSession} />;
      case 'payslip-detail': return <PayslipDetailPage payslipId={selectedPayslipId} onNavigate={handleNavigate} userSession={userSession} />;
      case 'salary-structures': return <SalaryStructuresPage initialTab="structures" userSession={userSession} onNavigate={handleNavigate} />;
      case 'salary-rules': return <SalaryStructuresPage initialTab="rules" userSession={userSession} onNavigate={handleNavigate} />;
      default: return <PayrollDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-app overflow-hidden font-sans text-ink-900 antialiased">
      <Sidebar current={currentView} onNavigate={(view) => handleNavigate(view)} userSession={userSession} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-app">
        <header className="h-12 bg-white border-b border-border px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Active Role:</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-chartreuse-50 border border-chartreuse-200 text-ink-900 text-xs font-medium">
              <ShieldCheck size={14} className="text-chartreuse-600" />
              <span>{userSession.role}</span>
            </div>
            {userSession.department && (
              <span className="text-xs text-ink-500">Department: <strong>{userSession.department}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <AttendanceWidget
              userSession={userSession}
              onAttendanceChange={() => setAttendanceRefreshKey((prev) => prev + 1)}
            />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1440px] w-full mx-auto">{renderView()}</div>
        </main>
      </div>
    </div>
  );
}

export default App;
