import { useState, useEffect, useRef } from 'react';
import { Clock, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import type { UserSession } from '@/types';

interface AttendanceWidgetProps {
  userSession: UserSession;
  onAttendanceChange?: () => void;
}

export function AttendanceWidget({ userSession, onAttendanceChange }: AttendanceWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasProfile, setHasProfile] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeAttendance, setActiveAttendance] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [todayTotalHours, setTodayTotalHours] = useState(0);

  const popupRef = useRef<HTMLDivElement>(null);

  // Fetch status on mount and when modal opens
  const fetchStatus = async () => {
    try {
      setError(null);
      const res = await api.attendance.getTodayStatus();
      setHasProfile(res.hasEmployeeProfile);
      setCheckedIn(res.checkedIn);
      setIsCompleted(Boolean(res.isCompleted || (res.attendance?.checkIn && res.attendance?.checkOut)));
      setActiveAttendance(res.attendance);
      setElapsedSeconds(res.elapsedSeconds || 0);
      setTodayTotalHours(res.todayTotalHours || 0);
    } catch (err: any) {
      // If pure admin or network error, quietly handle
      if (err.code === 'NO_LINKED_EMPLOYEE' || err.status === 400) {
        setHasProfile(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [userSession]);

  // Live timer tick when checked in
  useEffect(() => {
    if (!checkedIn) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        setTodayTotalHours(parseFloat((next / 3600).toFixed(2)));
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [checkedIn]);

  // Click outside listener to close popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // If user is pure Admin with no employee profile, don't show the widget
  if (!hasProfile || (userSession.role === 'Admin' && !userSession.employeeId)) {
    return null;
  }

  // Handle Check-In action
  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await api.attendance.checkIn();
      await fetchStatus();
      onAttendanceChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Check-Out action
  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await api.attendance.checkOut();
      await fetchStatus();
      onAttendanceChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  // Format elapsed time as Xh Ym Zs
  const formatElapsed = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  // Format time of day e.g. "9:48 AM"
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const displayName =
    userSession.name ||
    (activeAttendance?.employee
      ? `${activeAttendance.employee.firstName} ${activeAttendance.employee.lastName}`
      : 'User');

  return (
    <div className="relative" ref={popupRef}>
      {/* Top Navbar Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchStatus();
        }}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
          checkedIn
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-sm'
            : isCompleted
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80'
            : 'bg-paper border-border text-ink-700 hover:bg-paper/80'
        }`}
        title="Attendance Quick Action — Click to Check In / Out"
      >
        <span className="relative flex h-2.5 w-2.5">
          {checkedIn && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              checkedIn ? 'bg-emerald-500' : isCompleted ? 'bg-emerald-600' : 'bg-red-500'
            }`}
          />
        </span>
        <span className="hidden sm:inline font-medium">
          {checkedIn ? 'Checked In' : isCompleted ? 'Shift Completed' : 'Checked Out'}
        </span>
        <Clock size={13} className="text-ink-400" />
      </button>

      {/* Popover Card (Attendance Widget - "Composed Oyster") */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-surface rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-paper/60 border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  checkedIn ? 'bg-emerald-500' : isCompleted ? 'bg-emerald-600' : 'bg-red-500'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                Attendance Widget
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-paper transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Greeting */}
            <div>
              <p className="text-xs text-ink-400 font-medium">Welcome back,</p>
              <h3 className="text-base font-bold text-ink-900 leading-tight">
                {displayName}!
              </h3>
            </div>

            {/* Status Details Box */}
            <div className="bg-paper/40 border border-border/80 rounded-lg p-3.5 space-y-2.5">
              {checkedIn ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500 font-medium">
                      {formatTime(activeAttendance?.checkIn)} — Now
                    </span>
                    <span className="font-semibold text-emerald-700 font-mono text-sm">
                      {formatElapsed(elapsedSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                    <span className="text-ink-600 font-medium">Today's Total</span>
                    <span className="font-semibold text-ink-900 tnum">
                      {todayTotalHours.toFixed(2)} hrs
                    </span>
                  </div>
                </>
              ) : isCompleted ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Status</span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Shift Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                    <span className="text-ink-600 font-medium">Today's Shift</span>
                    <span className="font-semibold text-ink-900 tnum">
                      {formatTime(activeAttendance?.checkIn)} — {formatTime(activeAttendance?.checkOut)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-ink-600 font-medium">Worked Hours</span>
                    <span className="font-bold text-emerald-700 tnum">
                      {todayTotalHours.toFixed(2)} hrs
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-500">Status</span>
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      Not Checked In
                    </span>
                  </div>
                  {todayTotalHours > 0 && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                      <span className="text-ink-600 font-medium">Worked Today</span>
                      <span className="font-semibold text-ink-900 tnum">
                        {todayTotalHours.toFixed(2)} hrs
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Main Action Button */}
            <div>
              {checkedIn ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="w-full justify-center !bg-red-600 hover:!bg-red-700 !text-white font-semibold shadow-sm"
                >
                  {actionLoading ? 'Checking Out...' : 'Check Out'}
                </Button>
              ) : isCompleted ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <div className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Attendance Recorded for Today</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Your shift for today is complete ({todayTotalHours.toFixed(2)} hrs).
                  </p>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="w-full justify-center !bg-emerald-600 hover:!bg-emerald-700 !text-white font-semibold shadow-sm"
                >
                  <CheckCircle2 size={15} />
                  <span>{actionLoading ? 'Checking In...' : 'Check In'}</span>
                </Button>
              )}
            </div>

            <p className="text-[11px] text-center text-ink-400">
              {checkedIn
                ? 'Your active session is being recorded.'
                : isCompleted
                ? 'Shift complete. To adjust recorded hours, contact your HR Manager.'
                : 'Click Check In to begin recording attendance for today.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
