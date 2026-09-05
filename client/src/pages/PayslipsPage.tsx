import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { payslips, getEmployee, formatCurrency, payruns } from '@/data';
import type { View } from '@/types';

interface PayslipsPageProps {
  onNavigate: (view: View, id?: string) => void;
}

export function PayslipsPage({ onNavigate }: PayslipsPageProps) {
  return (
    <div>
      <PageHeader
        title="Payslips"
        subtitle={`${payslips.length} payslips across all payruns`}
      />
      <Table>
        <THead>
          <TH>Employee</TH>
          <TH>Pay Period</TH>
          <TH>Payrun</TH>
          <TH align="right">Gross</TH>
          <TH align="right">Net Salary</TH>
          <TH>Status</TH>
        </THead>
        <TBody>
          {payslips.map((p) => {
            const emp = getEmployee(p.employeeId);
            const payrun = payruns.find((pr) => pr.id === p.payrunId);
            if (!emp) return null;
            return (
              <TR key={p.id} onClick={() => onNavigate('payslip-detail', p.id)}>
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
                <TD className="text-ink-700">{p.payPeriod}</TD>
                <TD className="text-ink-500 text-xs">{payrun?.name ?? '—'}</TD>
                <TD align="right" className="tnum text-ink-500">
                  {formatCurrency(p.gross)}
                </TD>
                <TD align="right" className="tnum font-medium">
                  {formatCurrency(p.net)}
                </TD>
                <TD>
                  <StatusDot type={p.status} />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
