import { useState, useEffect } from 'react';
import { Plus, Building2, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { api } from '@/lib/api';
import type { View, UserSession } from '@/types';

interface DepartmentsPageProps {
  onNavigate: (view: View, id?: string) => void;
  userSession?: UserSession | null;
}

interface DepartmentRecord {
  id: string;
  name: string;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export function DepartmentsPage({ onNavigate: _onNavigate, userSession }: DepartmentsPageProps) {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Permissions: Admin and HR Manager have CRUD access
  const roleStr = (userSession?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canManageDepartments =
    roleStr === 'ADMIN' ||
    roleStr === 'HR_MANAGER' ||
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Manager';

  // New Department Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Department Modal State
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Delete / Archive Confirmation State
  const [archivingDept, setArchivingDept] = useState<DepartmentRecord | null>(null);
  const [isArchiveSubmitting, setIsArchiveSubmitting] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.departments.getAll();
      setDepartments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      setModalError('Department name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await api.departments.create(newDeptName.trim());
      setNewDeptName('');
      setIsModalOpen(false);
      await fetchDepartments();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setEditModalError(null);
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!editDeptName.trim()) {
      setEditModalError('Department name cannot be empty');
      return;
    }

    setIsEditSubmitting(true);
    setEditModalError(null);
    try {
      await api.departments.update(editingDept.id, editDeptName.trim());
      setEditingDept(null);
      await fetchDepartments();
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update department');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleArchiveDepartment = async () => {
    if (!archivingDept) return;
    setIsArchiveSubmitting(true);
    setArchiveError(null);
    try {
      await api.departments.delete(archivingDept.id);
      setArchivingDept(null);
      await fetchDepartments();
    } catch (err: any) {
      setArchiveError(err.message || 'Failed to archive department');
    } finally {
      setIsArchiveSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={
          isLoading
            ? 'Loading departments...'
            : `${departments.length} active department${departments.length === 1 ? '' : 's'}`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={fetchDepartments} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            {canManageDepartments && (
              <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                <Plus size={15} />
                New Department
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="p-4 mb-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <Table className="[&>table]:table-fixed">
        <THead>
          <TH className={canManageDepartments ? 'w-2/5 text-left' : 'w-1/2 text-left'}>Department</TH>
          <TH className={canManageDepartments ? 'w-1/5 text-left' : 'w-1/4 text-left'}>Active Employees</TH>
          <TH className={canManageDepartments ? 'w-1/5 text-left' : 'w-1/4 text-left'}>Created Date</TH>
          {canManageDepartments && <TH align="right" className="w-1/5 text-right">Actions</TH>}
        </THead>
        <TBody>
          {isLoading ? (
            <TR>
              <TD colSpan={canManageDepartments ? 4 : 3} className="text-center py-8 text-ink-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading live department records...</span>
                </div>
              </TD>
            </TR>
          ) : departments.length === 0 ? (
            <TR>
              <TD colSpan={canManageDepartments ? 4 : 3} className="text-center py-8 text-ink-400">
                No departments found.{canManageDepartments ? ' Create one using the button above.' : ''}
              </TD>
            </TR>
          ) : (
            departments.map((dept) => (
              <TR
                key={dept.id}
                onClick={() => canManageDepartments && openEditModal(dept)}
                className={canManageDepartments ? 'cursor-pointer hover:bg-paper/60' : ''}
              >
                <TD className="font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Building2 size={16} />
                    </div>
                    <span>{dept.name}</span>
                  </div>
                </TD>
                <TD className="tnum font-semibold text-ink-900">
                  {dept.employeeCount}
                </TD>
                <TD className="text-ink-500 text-xs">
                  {new Date(dept.createdAt).toLocaleDateString()}
                </TD>
                {canManageDepartments && (
                  <TD align="right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditModal(dept)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-paper border border-border transition-colors"
                        title="Edit Department"
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setArchivingDept(dept);
                          setArchiveError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-status-danger hover:bg-status-dangerSoft border border-border transition-colors"
                        title="Archive Department"
                      >
                        <Trash2 size={12} />
                        <span>Archive</span>
                      </button>
                    </div>
                  </TD>
                )}
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {/* New Department Modal */}
      {canManageDepartments && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Department"
        >
          <form onSubmit={handleCreateDepartment} className="space-y-4">
            {modalError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {modalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Department Name *
              </label>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Quality Assurance, Legal, R&D"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Department Modal */}
      {canManageDepartments && (
        <Modal
          open={Boolean(editingDept)}
          onClose={() => setEditingDept(null)}
          title="Edit Department"
        >
          <form onSubmit={handleUpdateDepartment} className="space-y-4">
            {editModalError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {editModalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Department Name *
              </label>
              <input
                type="text"
                value={editDeptName}
                onChange={(e) => setEditDeptName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-sm-md focus:outline-none focus:border-ink-400 bg-surface"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setEditingDept(null)}
                disabled={isEditSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={isEditSubmitting}>
                {isEditSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Archive Department Confirmation Modal */}
      {canManageDepartments && (
        <Modal
          open={Boolean(archivingDept)}
          onClose={() => setArchivingDept(null)}
          title="Archive Department"
        >
          <div className="space-y-4">
            {archiveError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {archiveError}
              </div>
            )}
            <p className="text-sm text-ink-600">
              Are you sure you want to archive <strong>{archivingDept?.name}</strong>?
              {archivingDept && archivingDept.employeeCount > 0 && (
                <span className="block mt-2 text-status-danger font-medium">
                  Warning: This department currently has {archivingDept.employeeCount} active employee(s).
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setArchivingDept(null)}
                disabled={isArchiveSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleArchiveDepartment}
                disabled={isArchiveSubmitting}
              >
                {isArchiveSubmitting ? 'Archiving...' : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
