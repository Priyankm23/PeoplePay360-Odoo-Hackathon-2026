import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { departments, getEmployee } from '@/data';
import type { View } from '@/types';

interface DepartmentsPageProps {
  onNavigate: (view: View, id?: string) => void;
}

export function DepartmentsPage({ onNavigate }: DepartmentsPageProps) {
  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={`${departments.length} departments`}
        actions={
          <Button variant="primary" size="md">
            <Plus size={15} />
            New Department
          </Button>
        }
      />
      <Table>
        <THead>
          <TH>Department</TH>
          <TH>Department Head</TH>
          <TH align="right">Employees</TH>
          <TH>Description</TH>
        </THead>
        <TBody>
          {departments.map((dept) => {
            const head = dept.headId ? getEmployee(dept.headId) : undefined;
            return (
              <TR key={dept.id}>
                <TD className="font-medium">{dept.name}</TD>
                <TD>
                  {head ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        firstName={head.firstName}
                        lastName={head.lastName}
                        color={head.avatarColor}
                        size="xs"
                      />
                      <span>{head.firstName} {head.lastName}</span>
                    </div>
                  ) : (
                    <span className="text-ink-300 text-xs">—</span>
                  )}
                </TD>
                <TD align="right" className="tnum">{dept.employeeCount}</TD>
                <TD className="text-ink-500 text-xs">{dept.description}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
