import { useState } from 'react';
import { ArrowLeft, Mail, Phone, Calendar, Briefcase } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { getEmployee, getManager, contractsForEmployee, attendanceForEmployee, timeOffForEmployee, formatCurrency } from '@/data';
import type { View } from '@/types';
import { cn } from '@/lib/utils';

interface EmployeeDetailPageProps {
  employeeId: string;
  onNavigate: (view: View, employeeId?: string) => void;
}

type Tab = 'contracts' | 'attendance' | 'time-off';

export function EmployeeDetailPage({ employeeId, onNavigate }: EmployeeDetailPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('contracts');
  const employee = getEmployee(employeeId);

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-500">Employee not found.</p>
        <button
          onClick={() => onNavigate('employees')}
          className="text-chartreuse-600 text-sm mt-2"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  const manager = getManager(employee.managerId);
  const contracts = contractsForEmployee(employeeId);
  const attendance = attendanceForEmployee(employeeId);
  const timeOff = timeOffForEmployee(employeeId);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'contracts', label: 'Contracts', count: contracts.length },
    { key: 'attendance', label: 'Attendance', count: attendance.length },
    { key: 'time-off', label: 'Time Off', count: timeOff.length },
  ];

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => onNavigate('employees')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-5"
      >
        <ArrowLeft size={15} />
        Employees
      </button>

      <div className="flex gap-6">
        {/* Left column - profile */}
        <div className="w-[280px] shrink-0">
          <div className="border border-border bg-surface rounded-sm-md p-5">
            <div className="flex flex-col items-center text-center">
              <Avatar
                firstName={employee.firstName}
                lastName={employee.lastName}
                color={employee.avatarColor}
                size="lg"
              />
              <h2 className="text-base font-semibold mt-3">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-sm text-ink-500 mt-0.5">{employee.jobTitle}</p>
              <div className="mt-2">
                <StatusDot type={employee.status} />
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-border-soft space-y-3">
              <div className="flex items-center gap-2.5 text-sm">
                <Briefcase size={15} className="text-ink-300 shrink-0" />
                <span className="text-ink-500">Department</span>
                <span className="ml-auto text-ink-900">{employee.department}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Mail size={15} className="text-ink-300 shrink-0" />
                <span className="text-ink-500 truncate">{employee.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Phone size={15} className="text-ink-300 shrink-0" />
                <span className="text-ink-900 tnum">{employee.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar size={15} className="text-ink-300 shrink-0" />
                <span className="text-ink-500">Hired</span>
                <span className="ml-auto text-ink-900 tnum">{employee.hireDate}</span>
              </div>
            </div>

            {manager && (
              <div className="mt-5 pt-5 border-t border-border-soft">
                <div className="text-xs text-ink-500 mb-2">Manager</div>
                <div className="flex items-center gap-2.5">
                  <Avatar
                    firstName={manager.firstName}
                    lastName={manager.lastName}
                    color={manager.avatarColor}
                    size="sm"
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {manager.firstName} {manager.lastName}
                    </div>
                    <div className="text-xs text-ink-500">{manager.jobTitle}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-border-soft">
              <div className="text-xs text-ink-500 mb-1">Working Schedule</div>
              <div className="text-sm text-ink-900">{employee.workingSchedule}</div>
            </div>
          </div>
        </div>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Stat tiles */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Contracts', count: employee.contractCount },
              { label: 'Attendance', count: employee.attendanceCount },
              { label: 'Time Off', count: employee.timeOffCount },
              { label: 'Allocations', count: employee.allocationCount },
            ].map((tile) => (
              <div
                key={tile.label}
                className="border border-border bg-surface rounded-sm-md px-4 py-3"
              >
                <div className="text-xs text-ink-500 mb-1">{tile.label}</div>
                <div className="text-lg font-semibold tnum text-ink-900">{tile.count}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px border-b-2',
                  activeTab === tab.key
                    ? 'border-ink-900 text-ink-900'
                    : 'border-transparent text-ink-500 hover:text-ink-700'
                )}
              >
                {tab.label}
                <span className="text-xs tnum text-ink-300">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'contracts' && (
            <Table>
              <THead>
                <TH>Start Date</TH>
                <TH>End Date</TH>
                <TH align="right">Wage</TH>
                <TH>Salary Structure</TH>
                <TH>Status</TH>
              </THead>
              <TBody>
                {contracts.map((c) => (
                  <TR key={c.id} className={c.status === 'running' ? 'relative' : ''}>
                    {c.status === 'running' && (
                      <td className="absolute left-0 top-0 bottom-0 w-[3px] bg-chartreuse-500" />
                    )}
                    <TD className="tnum">{c.startDate}</TD>
                    <TD className="tnum text-ink-500">{c.endDate ?? 'Present'}</TD>
                    <TD align="right">
                      {formatCurrency(c.wage)}
                      <span className="text-ink-300 text-xs ml-1">/{c.wageType}</span>
                    </TD>
                    <TD className="text-ink-700">{c.salaryStructure}</TD>
                    <TD>
                      <StatusDot type={c.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {activeTab === 'attendance' && (
            <Table>
              <THead>
                <TH>Date</TH>
                <TH>Check In</TH>
                <TH>Check Out</TH>
                <TH align="right">Worked Hours</TH>
                <TH>Status</TH>
              </THead>
              <TBody>
                {attendance.map((a) => (
                  <TR key={a.id}>
                    <TD className="tnum">{a.date}</TD>
                    <TD className="tnum">{a.checkIn ?? '—'}</TD>
                    <TD className="tnum">{a.checkOut ?? '—'}</TD>
                    <TD align="right" className="tnum">{a.workedHours ?? '—'}</TD>
                    <TD>
                      <StatusDot type={a.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {activeTab === 'time-off' && (
            <Table>
              <THead>
                <TH>Type</TH>
                <TH>Start Date</TH>
                <TH>End Date</TH>
                <TH align="right">Duration</TH>
                <TH>Status</TH>
              </THead>
              <TBody>
                {timeOff.map((r) => (
                  <TR key={r.id}>
                    <TD className="text-ink-700">{r.type}</TD>
                    <TD className="tnum">{r.startDate}</TD>
                    <TD className="tnum">{r.endDate}</TD>
                    <TD align="right" className="tnum">{r.duration} days</TD>
                    <TD>
                      <StatusDot type={r.status} />
                    </TD>
                  </TR>
                ))}
                {timeOff.length === 0 && (
                  <TR>
                    <TD className="text-ink-300 text-center py-8" colSpan={5}>
                      No time off requests
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
