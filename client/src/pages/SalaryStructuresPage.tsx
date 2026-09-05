import { Plus, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { salaryStructures } from '@/data';

export function SalaryStructuresPage() {
  return (
    <div>
      <PageHeader
        title="Salary Structures"
        subtitle={`${salaryStructures.length} structures`}
        actions={
          <Button variant="primary" size="md">
            <Plus size={15} />
            New Structure
          </Button>
        }
      />
      <Table>
        <THead>
          <TH>Structure Name</TH>
          <TH>Type</TH>
          <TH align="right">Rules</TH>
          <TH>Parent Structure</TH>
          <TH>Active</TH>
          <TH></TH>
        </THead>
        <TBody>
          {salaryStructures.map((s) => (
            <TR key={s.id}>
              <TD className="font-medium">{s.name}</TD>
              <TD className="text-ink-700 capitalize">{s.type}</TD>
              <TD align="right" className="tnum">{s.rulesCount}</TD>
              <TD className="text-ink-500 text-xs">{s.parent ?? '—'}</TD>
              <TD>
                {s.active ? (
                  <span className="inline-flex items-center gap-1 text-xs text-status-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-300" />
                    Inactive
                  </span>
                )}
              </TD>
              <TD align="right">
                <ChevronRight size={15} className="text-ink-300 inline" />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
