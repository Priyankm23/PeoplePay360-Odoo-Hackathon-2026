import { useState } from 'react';
import {
  CircleDollarSign,
  Users,
  Wallet,
  CalendarCheck,
  FileText,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
  Layers,
  UserCheck2,
  LayoutGrid,
} from 'lucide-react';
import type { UserRole, UserSession } from '@/types';
import { cn } from '@/lib/utils';

interface AuthLandingPageProps {
  onLogin: (session: UserSession) => void;
}

type NavTab = 'overview' | 'presets' | 'architecture';

const DEMO_PRESETS: {
  role: UserRole;
  name: string;
  email: string;
  badge: string;
  badgeStyle: string;
  description: string;
  initials: string;
}[] = [
  {
    role: 'Admin',
    name: 'Alexandra Vance',
    email: 'admin@peoplepay360.io',
    badge: 'System Admin',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-medium',
    description: 'Full platform control, user provisioning, global security, and module access.',
    initials: 'AV',
  },
  {
    role: 'HR Payroll Manager',
    name: 'Sarah Jenkins',
    email: 'payroll.mgr@peoplepay360.io',
    badge: 'Payroll Lead',
    badgeStyle: 'bg-chartreuse-100 text-chartreuse-900 border-chartreuse-300 font-semibold',
    description: 'CRUD on Payruns, Payslips, Salary Structures, Formula Rules, and Employees.',
    initials: 'SJ',
  },
  {
    role: 'HR Manager',
    name: 'Marcus Chen',
    email: 'hr.mgr@peoplepay360.io',
    badge: 'HR Operations',
    badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200/80 font-medium',
    description: 'Manages Employee directory, Contracts, Attendance tracking, and Leave approvals.',
    initials: 'MC',
  },
  {
    role: 'Employee',
    name: 'David Miller',
    email: 'd.miller@peoplepay360.io',
    badge: 'Self-Service',
    badgeStyle: 'bg-purple-50 text-purple-800 border-purple-200/80 font-medium',
    description: 'Personal portal to log daily attendance check-ins and submit leave requests.',
    initials: 'DM',
  },
];

export function AuthLandingPage({ onLogin }: AuthLandingPageProps) {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [email, setEmail] = useState('payroll.mgr@peoplepay360.io');
  const [password, setPassword] = useState('demoPassword123');
  const [role, setRole] = useState<UserRole>('HR Payroll Manager');
  const [department, setDepartment] = useState('Finance');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setEmail(preset.email);
    setRole(preset.role);
    setPassword('demoPassword123');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter your work email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      const matched = DEMO_PRESETS.find((p) => p.email === email);
      onLogin({
        email,
        name: matched ? matched.name : email.split('@')[0].replace('.', ' '),
        role,
        department,
        avatarColor: 'bg-chartreuse-500',
      });
    }, 350);
  };

  return (
    <div className="h-screen overflow-hidden bg-white text-ink-900 flex flex-col font-sans selection:bg-chartreuse-200 selection:text-ink-900">
      {/* Expansive Warm Top Header */}
      <header className="h-14 bg-white border-b border-[#DADDD9] px-5 lg:px-10 flex items-center justify-between shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center shadow-sm">
            <CircleDollarSign size={20} className="text-chartreuse-300" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-base tracking-tight text-ink-900">
              PeoplePay<span className="text-chartreuse-600">360</span>
            </span>
            <span className="hidden sm:inline text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-chartreuse-100/80 text-chartreuse-900 border border-chartreuse-300/60">
              HR & Payroll
            </span>
          </div>
        </div>

        {/* Dynamic Section Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'flex items-center gap-2 px-1 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all',
              activeTab === 'overview'
                ? 'text-ink-900 border-ink-900'
                : 'text-ink-500 border-transparent hover:text-ink-900'
            )}
          >
            <LayoutGrid size={15} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={cn(
              'flex items-center gap-2 px-1 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all',
              activeTab === 'presets'
                ? 'text-ink-900 border-ink-900'
                : 'text-ink-500 border-transparent hover:text-ink-900'
            )}
          >
            <UserCheck2 size={15} />
            <span>Demo Roles</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={cn(
              'flex items-center gap-2 px-1 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all',
              activeTab === 'architecture'
                ? 'text-ink-900 border-ink-900'
                : 'text-ink-500 border-transparent hover:text-ink-900'
            )}
          >
            <Layers size={15} />
            <span>Architecture</span>
          </button>
        </nav>

        {/* Quick Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const preset = DEMO_PRESETS[1];
              handleSelectPreset(preset);
            }}
            className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-ink-900 text-white hover:bg-ink-700 transition-all shadow-sm active:scale-95"
          >
            Quick Sign In
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 min-h-0 w-full mx-auto flex flex-col justify-between">
        
        {/* Responsive Grid with Generous Gap Between Left & Right Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch flex-1 min-h-0">
          
          {/* Left Column — Tab Content Area */}
          <div className="lg:col-span-7 min-h-0 overflow-y-auto px-5 py-6 sm:px-8 lg:px-10 lg:py-8 flex items-center justify-center">
            <div className="max-w-3xl w-full mx-auto space-y-5">
            
            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-chartreuse-100/70 border border-chartreuse-300/80 text-chartreuse-900 text-xs sm:text-sm font-semibold">
                  <Sparkles size={15} className="text-chartreuse-600 shrink-0" />
                  <span>Odoo Hackathon Operational Architecture Standard</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl lg:text-[2.7rem] font-extrabold tracking-tight text-ink-900 leading-[1.1]">
                    Integrated HR & <br />
                    <span className="text-chartreuse-700">Payroll Engine</span>
                  </h1>
                  <p className="text-ink-600 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                    Connect employee master records, period-specific contracts, attendance logs, and leave balances directly into structured salary rules and printable payslips.
                  </p>
                </div>

                {/* 2x2 Feature Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-3.5 rounded-2xl bg-white border border-[#DADDD9] shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-chartreuse-100/70 text-chartreuse-800 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink-900">2-Step Payrun Wizard</h4>
                      <p className="text-xs sm:text-sm text-ink-500 mt-0.5 leading-normal">
                        Select period & structure, check warnings, and compute batch.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#DADDD9] shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-chartreuse-100/70 text-chartreuse-800 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink-900">Rule-Based Payslips</h4>
                      <p className="text-xs sm:text-sm text-ink-500 mt-0.5 leading-normal">
                        Itemized Basic, Allowances, Deductions & PDF output.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#DADDD9] shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-chartreuse-100/70 text-chartreuse-800 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <CalendarCheck size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-ink-900">Attendance Review</h4>
                      <p className="text-xs sm:text-sm text-ink-500 mt-0.5 leading-normal">
                        Check-in/out records with manual exception approvals.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#DADDD9] shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-chartreuse-100/70 text-chartreuse-800 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-ink-900">Contract History</h4>
                      <p className="text-xs sm:text-sm text-ink-500 mt-0.5 leading-normal">
                        Maintains terms and binds period-active contracts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('presets')}
                    className="px-4 py-2 rounded-xl bg-chartreuse-100 text-chartreuse-900 font-bold text-xs sm:text-sm border border-chartreuse-300 hover:bg-chartreuse-200 transition-colors flex items-center gap-1.5"
                  >
                    <span>View Role Portals</span>
                    <ArrowRight size={15} />
                  </button>
                  <span className="text-xs sm:text-sm text-ink-500 font-medium">
                    Select a preset on the next tab to autofill login.
                  </span>
                </div>
              </div>
            )}

            {/* Presets Tab Content */}
            {activeTab === 'presets' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl font-extrabold text-ink-900 tracking-tight">Demo Role Presets</h2>
                  <p className="text-xs sm:text-sm text-ink-500 mt-1">
                    Click any role card below to autofill your credentials into the Sign In form.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        'text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2.5 group',
                        role === preset.role
                          ? 'bg-chartreuse-50/90 border-chartreuse-400 ring-2 ring-chartreuse-400/40 shadow-sm'
                          : 'bg-white border-[#DADDD9] hover:border-gray-300 hover:shadow-xs'
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-ink-900 text-chartreuse-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {preset.initials}
                          </div>
                          <div>
                            <div className="font-bold text-sm sm:text-base text-ink-900 group-hover:text-chartreuse-800 transition-colors">
                              {preset.name}
                            </div>
                            <div className="text-xs text-ink-500">{preset.role}</div>
                          </div>
                        </div>
                        <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-semibold', preset.badgeStyle)}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-ink-600 leading-snug line-clamp-2">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Architecture Tab Content */}
            {activeTab === 'architecture' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-2xl font-extrabold text-ink-900 tracking-tight">Core System Architecture</h2>
                  <p className="text-xs sm:text-sm text-ink-500 mt-1">
                    Operational modules designed in strict accordance with the PeoplePay360 specification.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-white border border-[#DADDD9] shadow-xs flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-chartreuse-100/70 text-chartreuse-800 font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0">
                      01
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-ink-900">Employee Master & Period Contracts</h3>
                      <p className="text-xs sm:text-sm text-ink-600 leading-relaxed mt-0.5">
                        Centralized employee directory linked to active contracts, providing context for working schedules and salary calculations.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#DADDD9] shadow-xs flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-chartreuse-100/70 text-chartreuse-800 font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0">
                      02
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-ink-900">Attendance & Leave Allocations</h3>
                      <p className="text-xs sm:text-sm text-ink-600 leading-relaxed mt-0.5">
                        Time tracking with exception handling. Approved leave automatically updates employee leave balances.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#DADDD9] shadow-xs flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-chartreuse-100/70 text-chartreuse-800 font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0">
                      03
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-ink-900">Payrun Processing & PDF Payslips</h3>
                      <p className="text-xs sm:text-sm text-ink-600 leading-relaxed mt-0.5">
                        2-step payrun setup wizard, validation warning checks, rule-sequenced salary computation, and PDF export.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Right Column — Fitted Sign In Card */}
          <div className="lg:col-span-5 w-full min-h-0 bg-[#EDEEEA] border-l border-[#D3D6CE] px-5 py-6 sm:px-8 lg:px-10 flex items-center justify-center">
            <div className="bg-white border border-[#DADDD9] rounded-3xl p-5 sm:p-6 shadow-[0_12px_36px_rgba(28,31,30,0.09)] w-full max-w-md relative overflow-hidden">
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-chartreuse-400 via-chartreuse-500 to-emerald-500" />

              <div className="mb-4 pb-3.5 border-b border-[#D5D8D1]">
                <h2 className="text-lg sm:text-xl font-extrabold text-ink-900 tracking-tight">Welcome back</h2>
                <p className="text-xs sm:text-sm text-ink-600 mt-1 leading-normal">
                  Sign in to continue to your HR and payroll workspace.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-ink-900 mb-1.5">Work Email</label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#DADDD9] rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-900 focus:ring-2 focus:ring-ink-900/10 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-ink-900 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-11 py-2.5 text-sm bg-white border border-[#DADDD9] rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-900 focus:ring-2 focus:ring-ink-900/10 transition-all font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 p-1 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-ink-900 mb-1.5">Role Scope</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3 pr-10 py-2.5 text-sm bg-white border border-[#DADDD9] rounded-xl text-ink-900 font-medium focus:outline-none focus:border-ink-900 transition-all"
                    >
                      <option value="Admin">Admin</option>
                      <option value="HR Payroll Manager">HR Payroll Manager</option>
                      <option value="HR Manager">HR Manager</option>
                      <option value="HR Payroll User">HR Payroll User</option>
                      <option value="Employee">Employee</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-ink-900 mb-1.5">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 pr-10 py-2.5 text-sm bg-white border border-[#DADDD9] rounded-xl text-ink-900 font-medium focus:outline-none focus:border-ink-900 transition-all"
                    >
                      <option value="Finance">Finance</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Sales">Sales</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm text-ink-600 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-gray-300 text-ink-900 focus:ring-0"
                    />
                    <span className="font-medium text-ink-700">Remember credentials</span>
                  </label>
                  <a href="#" className="font-semibold text-ink-900 hover:underline transition-colors">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-5 rounded-xl bg-ink-900 hover:bg-ink-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md shadow-ink-900/15 hover:shadow-lg active:scale-[0.99] disabled:opacity-50 mt-3"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                {/* Provisioning Notice */}
                <div className="mt-4 pt-3.5 border-t border-[#DADDD9] flex items-start gap-2.5 text-xs sm:text-sm text-ink-600 bg-[#F8F9F7] p-3 rounded-xl">
                  <UserCheck size={18} className="text-ink-900 shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    <strong className="text-ink-900 font-semibold">Admin Provisioned:</strong> Accounts and role permissions are created directly by your System Administrator.
                  </p>
                </div>
              </form>
            </div>
          </div>

        </div>

        {/* Footer Attribution Line */}
        <div className="hidden lg:flex px-10 py-3 border-t border-[#DADDD9] items-center justify-between text-xs sm:text-sm text-ink-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink-900">PeoplePay360</span>
            <span>— Operational HR & Payroll Platform</span>
          </div>
          <span className="text-xs text-ink-500 font-medium">Built with React, Vite, TypeScript & Tailwind CSS</span>
        </div>

      </main>
    </div>
  );
}
