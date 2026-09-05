import { Plus, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { workingSchedules } from '@/data';

export function WorkingSchedulesPage() {
  return (
    <div>
      <PageHeader
        title="Working Schedules"
        subtitle={`${workingSchedules.length} schedules configured`}
        actions={
          <Button variant="primary" size="md">
            <Plus size={15} />
            New Schedule
          </Button>
        }
      />
      <Table>
        <THead>
          <TH>Schedule Name</TH>
          <TH align="right">Hours/Week</TH>
          <TH align="right">Days/Week</TH>
          <TH>Start Time</TH>
          <TH>End Time</TH>
          <TH>Flexible</TH>
          <TH align="right">Employees</TH>
        </THead>
        <TBody>
          {workingSchedules.map((ws) => (
            <TR key={ws.id}>
              <TD>
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-ink-300" />
                  <span className="font-medium">{ws.name}</span>
                </div>
              </TD>
              <TD align="right" className="tnum">{ws.hoursPerWeek}h</TD>
              <TD align="right" className="tnum">{ws.daysPerWeek}</TD>
              <TD className="tnum text-ink-700">{ws.startTime}</TD>
              <TD className="tnum text-ink-700">{ws.endTime}</TD>
              <TD>
                {ws.flexible ? (
                  <span className="text-xs text-status-success">Yes</span>
                ) : (
                  <span className="text-xs text-ink-500">No</span>
                )}
              </TD>
              <TD align="right" className="tnum">{ws.employeeCount}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
