import { useEffect, useState } from 'react';
import { Briefcase, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Table, THead, TH, TBody, TR, TD } from '../components/Table';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';
import type { UserSession } from '../types';

interface JobPositionsPageProps {
  userSession?: UserSession | null;
}

interface DepartmentRecord {
  id: string;
  name: string;
}

interface JobPositionRecord {
  id: string;
  title: string;
  departmentId: string | null;
  department?: { id: string; name: string };
  employeeCount: number;
}

export function JobPositionsPage({ userSession }: JobPositionsPageProps) {
  const [positions, setPositions] = useState<JobPositionRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RBAC: Admin and HR Manager have write permissions
  const roleStr = (userSession?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canManageJobPositions =
    roleStr === 'ADMIN' ||
    roleStr === 'HR_MANAGER' ||
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Manager';

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Modal State
  const [editingPosition, setEditingPosition] = useState<JobPositionRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Archive Modal State
  const [archivingPosition, setArchivingPosition] = useState<JobPositionRecord | null>(null);
  const [isArchiveSubmitting, setIsArchiveSubmitting] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [positionData, departmentData] = await Promise.all([
        api.jobPositions.getAll(),
        api.departments.getAll(),
      ]);
      setPositions(positionData);
      setDepartments(departmentData);
    } catch (err: any) {
      setError(err.message || 'Failed to load job positions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setModalError('Job title cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await api.jobPositions.create(title.trim(), departmentId || undefined);
      setTitle('');
      setDepartmentId('');
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create job position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (position: JobPositionRecord) => {
    setEditingPosition(position);
    setEditTitle(position.title);
    setEditDepartmentId(position.departmentId || '');
    setEditModalError(null);
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPosition) return;
    if (!editTitle.trim()) {
      setEditModalError('Job title cannot be empty');
      return;
    }

    setIsEditSubmitting(true);
    setEditModalError(null);
    try {
      await api.jobPositions.update(editingPosition.id, {
        title: editTitle.trim(),
        departmentId: editDepartmentId || null,
      });
      setEditingPosition(null);
      await fetchData();
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update job position');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!archivingPosition) return;
    setIsArchiveSubmitting(true);
    setArchiveError(null);
    try {
      await api.jobPositions.delete(archivingPosition.id);
      setArchivingPosition(null);
      await fetchData();
    } catch (err: any) {
      setArchiveError(err.message || 'Failed to archive job position');
    } finally {
      setIsArchiveSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Job Positions"
        subtitle={isLoading ? 'Loading positions...' : `${positions.length} active position${positions.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={fetchData} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            {canManageJobPositions && (
              <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                <Plus size={15} />
                New Job Position
              </Button>
            )}
          </div>
        }
      />

      {error && <div className="p-4 mb-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <Table className="[&>table]:table-fixed">
        <THead>
          <TH className={canManageJobPositions ? 'w-2/5 text-left' : 'w-1/2 text-left'}>Job Position</TH>
          <TH className={canManageJobPositions ? 'w-1/5 text-left' : 'w-1/4 text-left'}>Department</TH>
          <TH align="right" className={canManageJobPositions ? 'w-1/5 text-right' : 'w-1/4 text-right'}>Employees</TH>
          {canManageJobPositions && <TH align="right" className="w-1/5 text-right">Actions</TH>}
        </THead>
        <TBody>
          {isLoading ? (
            <TR>
              <TD colSpan={canManageJobPositions ? 4 : 3} className="text-center py-8 text-ink-400">
                Loading job positions...
              </TD>
            </TR>
          ) : positions.length === 0 ? (
            <TR>
              <TD colSpan={canManageJobPositions ? 4 : 3} className="text-center py-8 text-ink-400">
                No job positions found.{canManageJobPositions ? ' Create one using the button above.' : ''}
              </TD>
            </TR>
          ) : positions.map((position) => (
            <TR
              key={position.id}
              onClick={() => canManageJobPositions && openEditModal(position)}
              className={canManageJobPositions ? 'cursor-pointer hover:bg-paper/60' : ''}
            >
              <TD className="font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Briefcase size={16} />
                  </div>
                  {position.title}
                </div>
              </TD>
              <TD className="text-ink-700">{position.department?.name || 'Unassigned'}</TD>
              <TD align="right" className="tnum font-semibold text-ink-900">{position.employeeCount}</TD>
              {canManageJobPositions && (
                <TD align="right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(position)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-paper border border-border transition-colors"
                      title="Edit Job Position"
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setArchivingPosition(position);
                        setArchiveError(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-status-danger hover:bg-status-dangerSoft border border-border transition-colors"
                      title="Delete Job Position"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </TD>
              )}
            </TR>
          ))}
        </TBody>
      </Table>

      {/* Create Modal */}
      {canManageJobPositions && (
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Job Position">
          <form onSubmit={handleCreate} className="space-y-4">
            {modalError && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">{modalError}</div>}
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">Job Title *</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Senior Recruiter"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">Department</label>
              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className="w-full px-3 pr-10 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              >
                <option value="">No department</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Position'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {canManageJobPositions && (
        <Modal open={Boolean(editingPosition)} onClose={() => setEditingPosition(null)} title="Edit Job Position">
          <form onSubmit={handleUpdate} className="space-y-4">
            {editModalError && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">{editModalError}</div>}
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">Job Title *</label>
              <input
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">Department</label>
              <select
                value={editDepartmentId}
                onChange={(event) => setEditDepartmentId(event.target.value)}
                className="w-full px-3 pr-10 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
              >
                <option value="">No department</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="md" onClick={() => setEditingPosition(null)} disabled={isEditSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" disabled={isEditSubmitting}>{isEditSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Archive Modal */}
      {canManageJobPositions && (
        <Modal open={Boolean(archivingPosition)} onClose={() => setArchivingPosition(null)} title="Archive Job Position">
          <div className="space-y-4">
            {archiveError && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">{archiveError}</div>}
            <p className="text-sm text-ink-600">
              Are you sure you want to archive <strong>{archivingPosition?.title}</strong>?
              {archivingPosition && archivingPosition.employeeCount > 0 && (
                <span className="block mt-2 text-status-danger font-medium">
                  Warning: This position currently has {archivingPosition.employeeCount} active employee(s).
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="md" onClick={() => setArchivingPosition(null)} disabled={isArchiveSubmitting}>Cancel</Button>
              <Button type="button" variant="danger" size="md" onClick={handleArchive} disabled={isArchiveSubmitting}>
                {isArchiveSubmitting ? 'Archiving...' : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
