import { useState, useMemo } from 'react';
import { Search, Plus, List, LayoutGrid, Filter } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/Button';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { employees, getManager } from '@/data';
import type { View, EmployeeStatus, Department } from '@/types';
import { cn } from '@/lib/utils';

interface EmployeesPageProps {
  onNavigate: (view: View, employeeId?: string) => void;
}

const allDepartments: Department[] = ['Engineering', 'Finance', 'Human Resources', 'Sales', 'Operations'];
const allStatuses: EmployeeStatus[] = ['active', 'probation', 'on_leave', 'inactive'];

export function EmployeesPage({ onNavigate }: EmployeesPageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<Department | null>(null);
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | null>(null);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch =
        !search ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        e.jobTitle.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !deptFilter || e.department === deptFilter;
      const matchesStatus = !statusFilter || e.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [search, deptFilter, statusFilter]);

  const kanbanData = useMemo(() => {
    const grouped: Record<string, typeof employees> = {};
    allDepartments.forEach((d) => {
      grouped[d] = filtered.filter((e) => e.department === d);
    });
    return grouped;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} people across ${allDepartments.length} departments`}
        actions={
          <Button variant="primary" size="md">
            <Plus size={15} />
            New Employee
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full text-sm pl-9 pr-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 transition-colors"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-sm-md overflow-hidden bg-surface">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              viewMode === 'list' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper'
            )}
          >
            <List size={14} />
            List
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              viewMode === 'kanban' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper'
            )}
          >
            <LayoutGrid size={14} />
            Kanban
          </button>
        </div>

        {/* Filter chips - Department */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-ink-300" />
          {allDepartments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(deptFilter === dept ? null : dept)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-sm-md border transition-colors whitespace-nowrap',
                deptFilter === dept
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-border bg-surface text-ink-500 hover:border-ink-300'
              )}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          {allStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-sm-md border transition-colors capitalize whitespace-nowrap',
                statusFilter === status
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-border bg-surface text-ink-500 hover:border-ink-300'
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>Department</TH>
            <TH>Job Position</TH>
            <TH>Manager</TH>
            <TH>Working Schedule</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {filtered.map((emp) => {
              const manager = getManager(emp.managerId);
              return (
                <TR key={emp.id} onClick={() => onNavigate('employee-detail', emp.id)}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar
                        firstName={emp.firstName}
                        lastName={emp.lastName}
                        color={emp.avatarColor}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-xs text-ink-500">{emp.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-ink-700">{emp.department}</TD>
                  <TD className="text-ink-700">{emp.jobTitle}</TD>
                  <TD>
                    {manager ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          firstName={manager.firstName}
                          lastName={manager.lastName}
                          color={manager.avatarColor}
                          size="xs"
                        />
                        <span className="text-ink-700">
                          {manager.firstName} {manager.lastName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-ink-300 text-xs">—</span>
                    )}
                  </TD>
                  <TD className="text-ink-500 text-xs">{emp.workingSchedule}</TD>
                  <TD>
                    <StatusDot type={emp.status} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {allDepartments.map((dept) => (
            <div key={dept} className="min-w-[240px] flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-ink-900 uppercase tracking-wide">
                  {dept}
                </span>
                <span className="text-xs text-ink-300 tnum">
                  {kanbanData[dept].length}
                </span>
              </div>
              <div className="space-y-2">
                {kanbanData[dept].map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => onNavigate('employee-detail', emp.id)}
                    className="border border-border bg-surface rounded-sm-md px-3 py-2.5 cursor-pointer hover:border-ink-300 transition-colors"
                    style={{ maxHeight: '90px' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        firstName={emp.firstName}
                        lastName={emp.lastName}
                        color={emp.avatarColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-xs text-ink-500 truncate">{emp.jobTitle}</div>
                      </div>
                      <StatusDot type={emp.status} showLabel={false} />
                    </div>
                  </div>
                ))}
                {kanbanData[dept].length === 0 && (
                  <div className="text-xs text-ink-300 text-center py-4 border border-dashed border-border rounded-sm-md">
                    No employees
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
