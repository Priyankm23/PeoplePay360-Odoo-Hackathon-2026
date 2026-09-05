import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { StatusDot } from '@/components/StatusDot';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { attendanceRecords, getEmployee } from '@/data';
import type { AttendanceRecord } from '@/types';
import { cn } from '@/lib/utils';

export function AttendancePage({ employeeId }: { employeeId?: string }) {
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [note, setNote] = useState('');

  const openCorrection = (record: AttendanceRecord) => {
    setCorrecting(record);
    setCheckIn(record.checkIn ?? '');
    setCheckOut('');
    setNote('');
  };

  const closeCorrection = () => {
    setCorrecting(null);
    setCheckIn('');
    setCheckOut('');
    setNote('');
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Daily check-in and check-out records"
      />

      <Table>
        <THead>
          <TH>Employee</TH>
          <TH>Date</TH>
          <TH>Check In</TH>
          <TH>Check Out</TH>
          <TH align="right">Worked Hours</TH>
          <TH>Status</TH>
        </THead>
        <TBody>
          {attendanceRecords.filter((record) => !employeeId || record.employeeId === employeeId).map((record) => {
            const emp = getEmployee(record.employeeId);
            if (!emp) return null;
            return (
              <TR key={record.id}>
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
                <TD className="tnum">{record.date}</TD>
                <TD className="tnum">{record.checkIn ?? '—'}</TD>
                <TD>
                  {record.missingCheckout ? (
                    <button
                      onClick={() => openCorrection(record)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-dangerSoft text-status-danger hover:bg-status-danger/20 transition-colors"
                      title="Missing checkout — click to correct"
                    >
                      <AlertCircle size={14} />
                    </button>
                  ) : (
                    <span className="tnum">{record.checkOut}</span>
                  )}
                </TD>
                <TD align="right" className="tnum text-ink-700">
                  {record.workedHours ?? '—'}
                </TD>
                <TD>
                  <StatusDot type={record.status} />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      {/* Correction modal */}
      <Modal
        open={correcting !== null}
        onClose={closeCorrection}
        title="Correct Attendance"
        subtitle={
          correcting
            ? `${getEmployee(correcting.employeeId)?.firstName} ${getEmployee(correcting.employeeId)?.lastName} — ${correcting.date}`
            : ''
        }
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeCorrection}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={closeCorrection}>
              Save Correction
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Check In</label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300 transition-colors tnum"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Check Out</label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 focus:outline-none focus:border-ink-300 transition-colors tnum"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1.5">Correction Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Reason for correction..."
              className="w-full text-sm px-3 py-2 border border-border bg-surface rounded-sm-md text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-ink-300 transition-colors resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
