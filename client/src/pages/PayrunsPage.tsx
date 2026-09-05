import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { payruns, formatCurrency } from '@/data';
import type { View } from '@/types';

interface PayrunsPageProps {
  onNavigate: (view: View, id?: string) => void;
}

export function PayrunsPage({ onNavigate }: PayrunsPageProps) {
  return (
    <div>
      <PageHeader
        title="Payruns"
        subtitle={`${payruns.length} payruns`}
        actions={
          <Button variant="primary" size="md" onClick={() => onNavigate('payrun-detail', 'p1')}>
            <Plus size={15} />
            New Payrun
          </Button>
        }
      />
      <Table>
        <THead>
          <TH>Payrun Name</TH>
          <TH>Salary Structure</TH>
          <TH>Period</TH>
          <TH align="right">Employees</TH>
          <TH align="right">Total Net</TH>
          <TH>Status</TH>
        </THead>
        <TBody>
          {payruns.map((p) => (
            <TR key={p.id} onClick={() => onNavigate('payrun-detail', p.id)}>
              <TD className="font-medium">{p.name}</TD>
              <TD className="text-ink-700">{p.salaryStructure}</TD>
              <TD className="tnum text-ink-500 text-xs">
                {p.periodStart} → {p.periodEnd}
              </TD>
              <TD align="right" className="tnum">{p.employeeCount}</TD>
              <TD align="right" className="tnum font-medium">{formatCurrency(p.totalNet)}</TD>
              <TD>
                <StatusDot type={p.status} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
