import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { contracts, getEmployee, formatCurrency } from '@/data';

export function ContractsPage({ employeeId }: { employeeId?: string }) {
  const visibleContracts = employeeId ? contracts.filter((contract) => contract.employeeId === employeeId) : contracts;
  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle={`${visibleContracts.length} employment contract${visibleContracts.length === 1 ? '' : 's'}${employeeId ? ' for this employee' : ''}`}
        actions={
          <Button variant="primary" size="md">
            <Plus size={15} />
            New Contract
          </Button>
        }
      />
      <Table>
        <THead>
          <TH>Employee</TH>
          <TH>Start Date</TH>
          <TH>End Date</TH>
          <TH align="right">Wage</TH>
          <TH>Salary Structure</TH>
          <TH>Status</TH>
        </THead>
        <TBody>
          {visibleContracts.map((c) => {
            const emp = getEmployee(c.employeeId);
            if (!emp) return null;
            return (
              <TR key={c.id}>
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
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
