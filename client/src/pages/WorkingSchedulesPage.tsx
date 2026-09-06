import { useEffect, useState } from 'react';
import { Plus, Clock, ArrowLeft, Trash2, Pencil } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Table, THead, TH, TBody, TR, TD } from '../components/Table';
import { api } from '../lib/api';
import type { UserSession } from '../types';

interface WorkingSchedulesPageProps {
  userSession?: UserSession | null;
}

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

type Line = {
  day: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
};

type Schedule = {
  id: string;
  name: string;
  type: 'FULL_TIME' | 'PART_TIME';
  lines: Line[];
  weeklyHours: number;
  daysPerWeek: number;
  employeeCount: number;
  isArchived: boolean;
};

const defaultLines = (): Line[] =>
  days.slice(0, 5).map((day) => ({
    day,
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
  }));

const hours = (line: Line) => {
  const start = line.startTime.split(':').map(Number);
  const end = line.endTime.split(':').map(Number);
  return ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1]) - line.breakMinutes) / 60;
};

export function WorkingSchedulesPage({ userSession }: WorkingSchedulesPageProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'FULL_TIME' | 'PART_TIME'>('FULL_TIME');
  const [lines, setLines] = useState<Line[]>(defaultLines());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RBAC: Admin and HR Manager have create/edit access
  const roleStr = (userSession?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canManageSchedules =
    roleStr === 'ADMIN' ||
    roleStr === 'HR_MANAGER' ||
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Manager';

  const load = async () => {
    setLoading(true);
    try {
      setSchedules(await api.workingSchedules.getAll());
    } catch (err: any) {
      setError(err.message || 'Unable to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    if (!canManageSchedules) return;
    setSelected(null);
    setFormOpen(true);
    setName('');
    setType('FULL_TIME');
    setLines(defaultLines());
    setError(null);
  };

  const closeForm = () => {
    setSelected(null);
    setFormOpen(false);
    setName('');
    setError(null);
  };

  const openSchedule = (schedule: Schedule) => {
    setSelected(schedule);
    setFormOpen(true);
    setName(schedule.name);
    setType(schedule.type);
    setLines(schedule.lines || []);
    setError(null);
  };

  const updateLine = (index: number, field: keyof Line, value: string) => {
    if (!canManageSchedules) return;
    setLines((current) =>
      current.map((line, i) =>
        i === index
          ? { ...line, [field]: field === 'breakMinutes' ? Number(value) : value }
          : line
      )
    );
  };

  const addDay = () => {
    if (!canManageSchedules) return;
    const day = days.find((candidate) => !lines.some((line) => line.day === candidate));
    if (day) {
      setLines([...lines, { day, startTime: '09:00', endTime: '17:00', breakMinutes: 60 }]);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageSchedules) return;
    setSaving(true);
    setError(null);
    try {
      const result = selected
        ? await api.workingSchedules.update(selected.id, { name, type, lines })
        : await api.workingSchedules.create({ name, type, lines });
      await load();
      openSchedule(result);
    } catch (err: any) {
      setError(err.message || 'Unable to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (schedule: Schedule) => {
    if (!canManageSchedules) return;
    try {
      await api.workingSchedules.setArchived(schedule.id, !schedule.isArchived);
      await load();
    } catch (err: any) {
      setError(err.message || 'Unable to update schedule status');
    }
  };

  if (formOpen) {
    return (
      <div>
        <button
          onClick={closeForm}
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 mb-4"
        >
          <ArrowLeft size={14} /> Back to list
        </button>

        <PageHeader
          title={selected ? name : 'New Working Schedule'}
          subtitle="Define the weekly working pattern"
        />

        <form onSubmit={save} className="border border-border rounded-lg bg-surface">
          {error && (
            <div className="m-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border-b border-border">
            <label className="text-xs font-semibold text-ink-700">
              Schedule Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 40 Hours / Week"
                disabled={!canManageSchedules}
                className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-sm-md bg-surface disabled:bg-paper disabled:text-ink-500"
                required
              />
            </label>
            <label className="text-xs font-semibold text-ink-700">
              Schedule Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                disabled={!canManageSchedules}
                className="mt-1.5 w-full px-3 pr-10 py-2 text-sm border border-border rounded-sm-md bg-surface disabled:bg-paper disabled:text-ink-500"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
              </select>
            </label>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">Weekly Schedule</h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  Set working hours and breaks for each day.
                </p>
              </div>
              {canManageSchedules && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDay}
                  disabled={lines.length === 7}
                >
                  <Plus size={14} /> Add Day
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-xs text-ink-500">
                    <th className="py-2">Day</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Break (min)</th>
                    <th>Hours</th>
                    {canManageSchedules && <th />}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.day} className="border-b border-border-soft">
                      <td className="py-2 font-medium capitalize">{line.day.toLowerCase()}</td>
                      <td>
                        <input
                          type="time"
                          value={line.startTime}
                          onChange={(e) => updateLine(index, 'startTime', e.target.value)}
                          disabled={!canManageSchedules}
                          className="px-2 py-1.5 border border-border rounded-sm-md text-xs disabled:bg-paper"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={line.endTime}
                          onChange={(e) => updateLine(index, 'endTime', e.target.value)}
                          disabled={!canManageSchedules}
                          className="px-2 py-1.5 border border-border rounded-sm-md text-xs disabled:bg-paper"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={line.breakMinutes}
                          onChange={(e) => updateLine(index, 'breakMinutes', e.target.value)}
                          disabled={!canManageSchedules}
                          className="w-24 px-2 py-1.5 border border-border rounded-sm-md text-xs disabled:bg-paper"
                        />
                      </td>
                      <td className="tnum text-xs">{hours(line).toFixed(1)}h</td>
                      {canManageSchedules && (
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => setLines(lines.filter((_, i) => i !== index))}
                            disabled={lines.length === 1}
                            className="text-ink-300 hover:text-status-danger disabled:opacity-30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-8 pt-4 text-sm">
              <span className="text-ink-500">Total Weekly Hours:</span>
              <strong className="tnum">
                {lines.reduce((total, line) => total + hours(line), 0).toFixed(1)}h
              </strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button type="button" variant="outline" size="md" onClick={closeForm}>
              {canManageSchedules ? 'Cancel' : 'Back'}
            </Button>
            {canManageSchedules && (
              <Button type="submit" variant="primary" size="md" disabled={saving}>
                {saving ? 'Saving...' : selected ? 'Save Changes' : 'Create Schedule'}
              </Button>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Working Schedules"
        subtitle={loading ? 'Loading schedules...' : `${schedules.length} schedules configured`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={load} disabled={loading}>
              <Clock size={14} /> Refresh
            </Button>
            {canManageSchedules && (
              <Button variant="primary" size="md" onClick={openNew}>
                <Plus size={15} /> New Schedule
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <Table className="bg-white">
        <THead>
          <TH className="text-left">Schedule Name</TH>
          <TH className="text-left">Days / Week</TH>
          <TH className="text-left">Hours / Week</TH>
          <TH className="text-left">Employees</TH>
          <TH className="text-left">Status</TH>
          <TH align="right" className="text-right">Actions</TH>
        </THead>
        <TBody>
          {schedules.map((schedule) => (
            <TR
              key={schedule.id}
              onClick={() => openSchedule(schedule)}
              className="cursor-pointer hover:bg-paper/60"
            >
              <TD className="font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <span className="text-ink-900 font-semibold">{schedule.name}</span>
                </div>
              </TD>
              <TD className="text-ink-700">{schedule.daysPerWeek}</TD>
              <TD className="text-ink-700 tnum">{schedule.weeklyHours.toFixed(1)}h</TD>
              <TD className="tnum font-semibold text-ink-900">{schedule.employeeCount}</TD>
              <TD>
                <span className={schedule.isArchived ? 'text-xs text-ink-400 font-medium' : 'text-xs text-status-success font-semibold'}>
                  {schedule.isArchived ? 'Inactive' : 'Active'}
                </span>
              </TD>
              <TD align="right">
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openSchedule(schedule)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-paper border border-border transition-colors"
                    title={canManageSchedules ? 'Edit Working Schedule' : 'View Working Schedule'}
                  >
                    <Pencil size={12} />
                    <span>{canManageSchedules ? 'Edit' : 'View'}</span>
                  </button>
                  {canManageSchedules && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(schedule)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-paper border border-border transition-colors"
                      title={schedule.isArchived ? 'Reactivate Working Schedule' : 'Make Working Schedule Inactive'}
                    >
                      <span>{schedule.isArchived ? 'Reactivate' : 'Deactivate'}</span>
                    </button>
                  )}
                </div>
              </TD>
            </TR>
          ))}
          {!loading && schedules.length === 0 && (
            <TR>
              <TD colSpan={6} className="text-center py-8 text-ink-400">
                No schedules found.{canManageSchedules ? ' Create one using the button above.' : ''}
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
