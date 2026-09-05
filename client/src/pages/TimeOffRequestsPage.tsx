import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Drawer } from '@/components/Drawer';
import { Button } from '@/components/Button';
import { timeOffRequests, getEmployee } from '@/data';
import type { TimeOffRequest, View } from '@/types';
import { cn } from '@/lib/utils';

interface TimeOffRequestsPageProps {
  onNavigate: (view: View) => void;
  employeeId?: string;
}

type SubTab = 'requests' | 'allocations' | 'types';

export function TimeOffRequestsPage({ onNavigate, employeeId }: TimeOffRequestsPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('requests');
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);

  const subTabs: { key: SubTab; label: string; view: View }[] = [
    { key: 'requests', label: 'Requests', view: 'time-off-requests' },
    { key: 'allocations', label: 'Allocations', view: 'time-off-allocations' },
    { key: 'types', label: 'Types', view: 'time-off-types' },
  ];

  const selectedEmp = selectedRequest ? getEmployee(selectedRequest.employeeId) : null;
  const remaining = selectedRequest
    ? selectedRequest.allocationTotal - selectedRequest.allocationUsed
    : 0;

  return (
    <div>
      <PageHeader title="Time Off" subtitle="Manage leave requests and allocations" />

      {/* Sub-tab pills */}
      <div className="flex items-center gap-1 mb-5">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onNavigate(tab.view)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-sm-md border transition-colors',
              activeSubTab === tab.key
                ? 'border-sidebar-bg bg-sidebar-bg text-white'
                : 'border-border bg-surface text-ink-500 hover:border-ink-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Table>
        <THead>
          <TH>Employee</TH>
          <TH>Type</TH>
          <TH>Start Date</TH>
          <TH>End Date</TH>
          <TH align="right">Duration</TH>
          <TH>Status</TH>
        </THead>
        <TBody>
          {timeOffRequests.filter((req) => !employeeId || req.employeeId === employeeId).map((req) => {
            const emp = getEmployee(req.employeeId);
            if (!emp) return null;
            return (
              <TR key={req.id} onClick={() => setSelectedRequest(req)}>
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
                <TD className="text-ink-700">{req.type}</TD>
                <TD className="tnum">{req.startDate}</TD>
                <TD className="tnum">{req.endDate}</TD>
                <TD align="right" className="tnum">
                  {req.duration} {req.duration === 1 ? 'day' : 'days'}
                </TD>
                <TD>
                  <StatusDot type={req.status} />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      {/* Detail drawer */}
      <Drawer
        open={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        title="Time Off Request"
        subtitle={selectedRequest ? `Submitted ${selectedRequest.startDate}` : ''}
        footer={
          selectedRequest && (
            <>
              <Button
                variant="dangerOutline"
                size="sm"
                className="mr-auto"
                onClick={() => setSelectedRequest(null)}
              >
                Refuse
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                disabled={selectedRequest.status === 'approved' || selectedRequest.status === 'refused'}
              >
                Approve
              </Button>
            </>
          )
        }
      >
        {selectedRequest && selectedEmp && (
          <div className="space-y-5">
            {/* Employee */}
            <div className="flex items-center gap-3">
              <Avatar
                firstName={selectedEmp.firstName}
                lastName={selectedEmp.lastName}
                color={selectedEmp.avatarColor}
                size="md"
              />
              <div>
                <div className="text-sm font-semibold">
                  {selectedEmp.firstName} {selectedEmp.lastName}
                </div>
                <div className="text-xs text-ink-500">{selectedEmp.jobTitle}</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 pt-4 border-t border-border-soft">
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Leave Type</span>
                <span className="text-ink-900 font-medium">{selectedRequest.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Start Date</span>
                <span className="text-ink-900 tnum">{selectedRequest.startDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">End Date</span>
                <span className="text-ink-900 tnum">{selectedRequest.endDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Duration</span>
                <span className="text-ink-900 tnum">
                  {selectedRequest.duration} {selectedRequest.duration === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Status</span>
                <StatusDot type={selectedRequest.status} />
              </div>
            </div>

            {/* Reason */}
            {selectedRequest.reason && (
              <div className="pt-4 border-t border-border-soft">
                <div className="text-xs text-ink-500 mb-1.5">Reason</div>
                <p className="text-sm text-ink-700">{selectedRequest.reason}</p>
              </div>
            )}

            {/* Balance indicator */}
            <div className="pt-4 border-t border-border-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-500">Allocation Balance</span>
                <span className="text-xs text-ink-700 tnum">
                  {remaining.toFixed(1)} / {selectedRequest.allocationTotal} days remaining
                </span>
              </div>
              <div className="h-2 bg-paper rounded-full overflow-hidden">
                <div
                  className="h-full bg-chartreuse-400 rounded-full transition-all"
                  style={{
                    width: `${(remaining / selectedRequest.allocationTotal) * 100}%`,
                  }}
                />
              </div>
              <div className="text-xs text-ink-300 mt-1.5 tnum">
                {selectedRequest.allocationUsed} days used of {selectedRequest.allocationTotal}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
