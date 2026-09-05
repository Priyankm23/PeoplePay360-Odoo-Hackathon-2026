import { cn } from '@/lib/utils';

export type StatusDotType =
  | 'active'
  | 'probation'
  | 'on_leave'
  | 'inactive'
  | 'present'
  | 'late'
  | 'absent'
  | 'overtime'
  | 'running'
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'refused'
  | 'expired'
  | 'cancelled'
  | 'computed'
  | 'validated'
  | 'paid'
  | 'confirmed';

const dotConfig: Record<StatusDotType, { color: string; label: string }> = {
  active: { color: 'bg-status-success', label: 'Active' },
  probation: { color: 'bg-status-warning', label: 'Probation' },
  on_leave: { color: 'bg-status-info', label: 'On Leave' },
  inactive: { color: 'bg-ink-300', label: 'Inactive' },
  present: { color: 'bg-status-success', label: 'Present' },
  late: { color: 'bg-status-warning', label: 'Late' },
  absent: { color: 'bg-status-danger', label: 'Absent' },
  overtime: { color: 'bg-ink-700', label: 'Overtime' },
  running: { color: 'bg-status-success', label: 'Running' },
  draft: { color: 'bg-ink-300', label: 'Draft' },
  submitted: { color: 'bg-status-info', label: 'Submitted' },
  approved: { color: 'bg-status-success', label: 'Approved' },
  refused: { color: 'bg-status-danger', label: 'Refused' },
  expired: { color: 'bg-ink-300', label: 'Expired' },
  cancelled: { color: 'bg-ink-300', label: 'Cancelled' },
  computed: { color: 'bg-status-info', label: 'Computed' },
  validated: { color: 'bg-status-warning', label: 'Validated' },
  paid: { color: 'bg-status-success', label: 'Paid' },
  confirmed: { color: 'bg-status-info', label: 'Confirmed' },
};

interface StatusDotProps {
  type: StatusDotType;
  showLabel?: boolean;
  className?: string;
  labelOverride?: string;
}

export function StatusDot({ type, showLabel = true, className, labelOverride }: StatusDotProps) {
  const config = dotConfig[type];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', config.color)} />
      {showLabel && (
        <span className="text-xs text-ink-700">{labelOverride ?? config.label}</span>
      )}
    </span>
  );
}
