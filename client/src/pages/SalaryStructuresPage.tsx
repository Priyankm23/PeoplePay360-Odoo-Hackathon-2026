import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Building2,
  Calculator,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  CheckCircle2,
  Percent,
  IndianRupee,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Table, THead, TH, TBody, TR, TD } from '@/components/Table';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { api } from '@/lib/api';
import type { UserSession, SalaryStructure, SalaryRule, SalaryRuleCategory, ComputationMethod, View } from '@/types';

interface SalaryStructuresPageProps {
  initialTab?: 'structures' | 'rules';
  userSession?: UserSession | null;
  onNavigate?: (view: View, id?: string) => void;
}

export function SalaryStructuresPage({ initialTab = 'structures', userSession, onNavigate }: SalaryStructuresPageProps) {
  const roleStr = (userSession?.role || '').toUpperCase().replace(/\s+/g, '_');
  const canManage =
    roleStr === 'ADMIN' ||
    roleStr === 'HR_PAYROLL_MANAGER' ||
    userSession?.role === 'Admin' ||
    userSession?.role === 'HR Payroll Manager';
  const isPayrollUser = roleStr === 'HR_PAYROLL_USER' || userSession?.role === 'HR Payroll User';
  const isForbidden = !canManage && !isPayrollUser;

  // Active view tab: 'structures' or 'rules'
  const [activeTab, setActiveTab] = useState<'structures' | 'rules'>(initialTab);

  // Sync tab when initialTab prop changes (e.g. user clicked sidebar)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Data state
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [allRules, setAllRules] = useState<SalaryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [structureSearch, setStructureSearch] = useState('');
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleStructureFilter, setRuleStructureFilter] = useState('ALL');

  // Selected structure (for structure detail view)
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [selectedStructureRules, setSelectedStructureRules] = useState<SalaryRule[]>([]);
  const [isLoadingStructureRules, setIsLoadingStructureRules] = useState(false);

  // Structure Modal State
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [structureName, setStructureName] = useState('');
  const [structureIsActive, setStructureIsActive] = useState(true);
  const [structureFormError, setStructureFormError] = useState<string | null>(null);
  const [isSubmittingStructure, setIsSubmittingStructure] = useState(false);

  // Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SalaryRule | null>(null);
  const [ruleStructureId, setRuleStructureId] = useState<string>('');
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [ruleCategory, setRuleCategory] = useState<SalaryRuleCategory>('ALLOWANCE');
  const [ruleSequence, setRuleSequence] = useState<number>(10);
  const [ruleMethod, setRuleMethod] = useState<ComputationMethod>('FIXED');
  const [ruleFixedAmount, setRuleFixedAmount] = useState<string>('0');
  const [rulePercentage, setRulePercentage] = useState<string>('40');
  const [ruleBaseRuleId, setRuleBaseRuleId] = useState<string>('');
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  // Fetch all structures and rules
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [structuresData, rulesData] = await Promise.all([
        api.salaryStructures.getAll({ includeInactive: true }),
        api.salaryRules.getAll(),
      ]);
      setStructures(structuresData);
      setAllRules(rulesData);

      // Refresh selected structure if present
      if (selectedStructure) {
        const refreshed = structuresData.find((s) => s.id === selectedStructure.id);
        if (refreshed) {
          setSelectedStructure(refreshed);
          fetchRulesForStructure(refreshed.id);
        } else {
          setSelectedStructure(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load salary configuration data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch rules for a single structure
  const fetchRulesForStructure = async (structureId: string) => {
    setIsLoadingStructureRules(true);
    try {
      const data = await api.salaryStructures.getRules(structureId);
      setSelectedStructureRules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load salary rules for structure');
    } finally {
      setIsLoadingStructureRules(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSwitchTab = (tab: 'structures' | 'rules') => {
    setActiveTab(tab);
    if (tab === 'structures') {
      onNavigate?.('salary-structures');
    } else {
      onNavigate?.('salary-rules');
    }
  };

  // When clicking on a structure row to view details
  const handleSelectStructure = (structure: SalaryStructure) => {
    setSelectedStructure(structure);
    fetchRulesForStructure(structure.id);
  };

  // Structure handlers
  const handleOpenCreateStructure = () => {
    setEditingStructure(null);
    setStructureName('');
    setStructureIsActive(true);
    setStructureFormError(null);
    setIsStructureModalOpen(true);
  };

  const handleOpenEditStructure = (structure: SalaryStructure, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStructure(structure);
    setStructureName(structure.name);
    setStructureIsActive(structure.isActive);
    setStructureFormError(null);
    setIsStructureModalOpen(true);
  };

  const handleSubmitStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureName.trim()) {
      setStructureFormError('Structure name is required');
      return;
    }

    setIsSubmittingStructure(true);
    setStructureFormError(null);

    try {
      if (editingStructure) {
        await api.salaryStructures.update(editingStructure.id, {
          name: structureName.trim(),
          isActive: structureIsActive,
        });
      } else {
        await api.salaryStructures.create({
          name: structureName.trim(),
          isActive: structureIsActive,
        });
      }
      setIsStructureModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setStructureFormError(err.message || 'Failed to save salary structure');
    } finally {
      setIsSubmittingStructure(false);
    }
  };

  const handleDeleteStructure = async (structure: SalaryStructure, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to archive structure '${structure.name}'?\n\nThis will make it unavailable for new employment contracts.`
      )
    ) {
      return;
    }

    try {
      await api.salaryStructures.delete(structure.id);
      if (selectedStructure?.id === structure.id) {
        setSelectedStructure(null);
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Cannot delete salary structure');
    }
  };

  // Rule Modal Handlers
  const handleOpenCreateRule = (presetStructureId?: string) => {
    const targetStructureId = presetStructureId || selectedStructure?.id || structures[0]?.id || '';
    setEditingRule(null);
    setRuleStructureId(targetStructureId);
    setRuleName('');
    setRuleCode('');
    setRuleCategory('ALLOWANCE');

    // Default next sequence
    const existingInStructure = allRules.filter((r) => (r.salaryStructureId || (r as any).salaryStructure?.id) === targetStructureId);
    const maxSeq = existingInStructure.length > 0 ? Math.max(...existingInStructure.map((r) => r.sequence)) : 0;
    setRuleSequence(maxSeq + 10);

    setRuleMethod('FIXED');
    setRuleFixedAmount('0');
    setRulePercentage('40');
    setRuleBaseRuleId('');
    setRuleFormError(null);
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: SalaryRule, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const structureId = rule.salaryStructureId || (rule as any).salaryStructure?.id || selectedStructure?.id || '';
    setEditingRule(rule);
    setRuleStructureId(structureId);
    setRuleName(rule.name);
    setRuleCode(rule.code);
    setRuleCategory((rule.category as SalaryRuleCategory) || 'ALLOWANCE');
    setRuleSequence(rule.sequence);
    setRuleMethod(rule.computationMethod);
    setRuleFixedAmount(rule.fixedAmount !== null && rule.fixedAmount !== undefined ? String(rule.fixedAmount) : '0');
    setRulePercentage(rule.percentage !== null && rule.percentage !== undefined ? String(rule.percentage) : '40');
    setRuleBaseRuleId(rule.baseRuleId || '');
    setRuleFormError(null);
    setIsRuleModalOpen(true);
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleFormError(null);

    const targetStructureId = editingRule
      ? editingRule.salaryStructureId || (editingRule as any).salaryStructure?.id || ruleStructureId
      : ruleStructureId;

    if (!targetStructureId) {
      setRuleFormError('Please select a salary structure for this rule');
      return;
    }

    if (!ruleName.trim()) {
      setRuleFormError('Rule name is required');
      return;
    }

    if (!ruleCode.trim()) {
      setRuleFormError('Rule code is required');
      return;
    }

    if (ruleMethod === 'PERCENTAGE') {
      if (!ruleBaseRuleId) {
        setRuleFormError('A valid base rule is required when computation method is Percentage');
        return;
      }
      const pctVal = parseFloat(rulePercentage);
      if (isNaN(pctVal) || pctVal <= 0 || pctVal > 100) {
        setRuleFormError('Percentage must be a positive number between 0.01 and 100');
        return;
      }
    }

    setIsSubmittingRule(true);

    try {
      const payload: any = {
        name: ruleName.trim(),
        code: ruleCode.trim().toUpperCase(),
        category: ruleCategory,
        sequence: Number(ruleSequence),
        computationMethod: ruleMethod,
      };

      if (ruleMethod === 'FIXED') {
        payload.fixedAmount = parseFloat(ruleFixedAmount) || 0;
        payload.percentage = null;
        payload.baseRuleId = null;
      } else {
        payload.percentage = parseFloat(rulePercentage);
        payload.baseRuleId = ruleBaseRuleId;
        payload.fixedAmount = null;
      }

      if (editingRule) {
        await api.salaryRules.update(editingRule.id, payload);
      } else {
        await api.salaryRules.create(targetStructureId, payload);
      }

      setIsRuleModalOpen(false);
      await fetchData();
      if (selectedStructure?.id === targetStructureId) {
        await fetchRulesForStructure(targetStructureId);
      }
    } catch (err: any) {
      setRuleFormError(err.message || 'Failed to save salary rule');
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const handleDeleteRule = async (rule: SalaryRule, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete rule '${rule.name}' (${rule.code})?\n\nIf other percentage rules depend on this rule, deletion will be blocked.`
      )
    ) {
      return;
    }

    try {
      await api.salaryRules.delete(rule.id);
      await fetchData();
      const stId = rule.salaryStructureId || (rule as any).salaryStructure?.id || selectedStructure?.id;
      if (selectedStructure && selectedStructure.id === stId) {
        await fetchRulesForStructure(selectedStructure.id);
      }
    } catch (err: any) {
      setError(err.message || 'Cannot delete salary rule');
    }
  };

  // Filtered lists
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => s.name.toLowerCase().includes(structureSearch.toLowerCase().trim()));
  }, [structures, structureSearch]);

  const filteredRules = useMemo(() => {
    return allRules.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(ruleSearch.toLowerCase().trim()) ||
        r.code.toLowerCase().includes(ruleSearch.toLowerCase().trim()) ||
        (r.category || '').toLowerCase().includes(ruleSearch.toLowerCase().trim());

      const rStructureId = r.salaryStructureId || (r as any).salaryStructure?.id;
      const matchStructure = ruleStructureFilter === 'ALL' || rStructureId === ruleStructureFilter;

      return matchSearch && matchStructure;
    });
  }, [allRules, ruleSearch, ruleStructureFilter]);

  // Eligible base rules for modal based on currently selected structure & entered sequence
  const eligibleBaseRules = useMemo(() => {
    const targetStructureId = editingRule
      ? editingRule.salaryStructureId || (editingRule as any).salaryStructure?.id || ruleStructureId
      : ruleStructureId;

    const availableRules = allRules.filter((r) => {
      const stId = r.salaryStructureId || (r as any).salaryStructure?.id;
      return stId === targetStructureId;
    });

    return availableRules.filter((r) => {
      if (editingRule && r.id === editingRule.id) return false;
      return r.sequence < Number(ruleSequence);
    });
  }, [allRules, ruleStructureId, editingRule, ruleSequence]);

  // Badges & formatting helpers
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'BASIC':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            BASIC
          </span>
        );
      case 'ALLOWANCE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ALLOWANCE
          </span>
        );
      case 'DEDUCTION':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            DEDUCTION
          </span>
        );
      case 'GROSS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            GROSS
          </span>
        );
      case 'NET':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            NET TAKE-HOME
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-paper border border-border text-ink-700">
            {category}
          </span>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isForbidden) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-ink-900">Access Restricted</h2>
        <p className="text-xs text-ink-500 leading-relaxed">
          The Salary Structures & Rules module is restricted to Payroll Administrators and Specialists.
          Your current role (<strong>{userSession?.role || 'User'}</strong>) does not have permission to view or modify payroll formulas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Action Prevented</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Read-Only Notice for HR Payroll User */}
      {isPayrollUser && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span>
            <strong>Read-Only View:</strong> You have view privileges to inspect salary structures and formulas.
            Only HR Payroll Managers and Admins can create or modify rules.
          </span>
        </div>
      )}

      {/* Differentiated Tab Navigation Switcher */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1 -mb-px">
          <button
            onClick={() => {
              setSelectedStructure(null);
              handleSwitchTab('structures');
            }}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'structures'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-ink-500 hover:text-ink-900 hover:border-border'
            }`}
          >
            <Layers size={15} />
            <span>Salary Structures</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'structures' ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-600'
              }`}
            >
              {structures.length}
            </span>
          </button>

          <button
            onClick={() => handleSwitchTab('rules')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-ink-500 hover:text-ink-900 hover:border-border'
            }`}
          >
            <Calculator size={15} />
            <span>Salary Rules</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'rules' ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-600'
              }`}
            >
              {allRules.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-ink-400 hidden sm:block">
          Deterministic Rule Sequencing: <span className="font-mono font-bold text-ink-700">Seq(base) &lt; Seq(this)</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SALARY STRUCTURES (LIST OR DETAIL)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'structures' && (
        <>
          {!selectedStructure ? (
            /* VIEW 1A: STRUCTURES LIST VIEW */
            <div className="space-y-4">
              <PageHeader
                title="Salary Structures"
                subtitle="Manage salary packages, deduction frameworks, and contract blueprints"
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchData}
                      disabled={isLoading}
                      title="Refresh structures"
                    >
                      <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                      Refresh
                    </Button>
                    {canManage && (
                      <Button variant="primary" size="md" onClick={handleOpenCreateStructure} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus size={15} />
                        New Structure
                      </Button>
                    )}
                  </div>
                }
              />

              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-surface p-3 border border-border rounded-lg shadow-2xs">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={structureSearch}
                    onChange={(e) => setStructureSearch(e.target.value)}
                    placeholder="Search structures by name..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="text-xs text-ink-500 font-medium ml-auto">
                  Showing <strong>{filteredStructures.length}</strong> of {structures.length} structures
                </div>
              </div>

              {/* Structures Table */}
              <div className="bg-white overflow-hidden">
                {isLoading ? (
                  <div className="py-16 text-center text-xs text-ink-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading salary structures...
                  </div>
                ) : filteredStructures.length === 0 ? (
                  <div className="py-16 text-center">
                    <Building2 size={32} className="mx-auto text-ink-300 mb-2" />
                    <p className="text-sm font-semibold text-ink-700">No salary structures found</p>
                    <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto">
                      {structureSearch ? 'Try a different search query.' : 'Click "New Structure" to configure your first blueprint.'}
                    </p>
                  </div>
                ) : (
                  <Table className="[&>table]:table-fixed border border-[#E7EAE7] rounded-sm-md shadow-none">
                    <THead>
                      <TH>Structure Name</TH>
                      <TH align="center">Status</TH>
                      <TH align="center">Rules</TH>
                      <TH align="center">Employees / Contracts</TH>
                      <TH align="right">Actions</TH>
                    </THead>
                    <TBody>
                      {filteredStructures.map((s) => (
                        <TR
                          key={s.id}
                          className="cursor-pointer hover:bg-emerald-50/20 transition-colors"
                          onClick={() => handleSelectStructure(s)}
                        >
                          {/* Structure Name */}
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                                <Layers size={16} />
                              </div>
                              <div>
                                <div className="font-semibold text-ink-900 text-xs hover:text-emerald-700 flex items-center gap-1.5">
                                  <span>{s.name}</span>
                                  <ChevronRight size={13} className="text-ink-400" />
                                </div>
                                <div className="text-[11px] text-ink-400 mt-0.5">
                                  Click to view {s.rulesCount || 0} calculation rules
                                </div>
                              </div>
                            </div>
                          </TD>

                          {/* Status */}
                          <TD align="center">
                            {s.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-ink-600 border border-border">
                                Inactive
                              </span>
                            )}
                          </TD>

                          {/* Rules Count */}
                          <TD align="center">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 bg-paper rounded border border-border text-ink-800">
                              <Calculator size={11} className="text-ink-500" />
                              {s.rulesCount || 0} rules
                            </span>
                          </TD>

                          {/* Active Contracts */}
                          <TD align="center">
                            <span
                              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${
                                (s.contractCount || 0) > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-paper text-ink-500 border-border'
                              }`}
                            >
                              {s.contractCount || 0} active
                            </span>
                          </TD>

                          {/* Actions */}
                          <TD align="right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectStructure(s)}
                                title="Open Structure and its rules"
                              >
                                View Rules
                              </Button>
                              {canManage && (
                                <>
                                  <button
                                    onClick={(e) => handleOpenEditStructure(s, e)}
                                    className="p-1.5 text-ink-400 hover:text-ink-800 hover:bg-paper rounded transition-colors"
                                    title="Edit structure name / status"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteStructure(s, e)}
                                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    title="Archive structure"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            /* VIEW 1B: STRUCTURE DETAIL / FORM VIEW (WIREFRAME SCREEN 2) */
            <div className="space-y-6">
              {/* Breadcrumbs & Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStructure(null)}
                    className="flex items-center gap-1 text-ink-600"
                  >
                    <ArrowLeft size={14} />
                    Back to Structures
                  </Button>
                  <span className="text-ink-300">/</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                      <Layers size={14} />
                    </div>
                    <span className="text-sm font-bold text-ink-900">{selectedStructure.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRulesForStructure(selectedStructure.id)}
                    disabled={isLoadingStructureRules}
                    title="Refresh rules"
                  >
                    <RefreshCw size={13} className={isLoadingStructureRules ? 'animate-spin' : ''} />
                    Refresh
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleOpenEditStructure(selectedStructure, e)}
                      >
                        <Pencil size={13} />
                        Edit Structure
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleOpenCreateRule(selectedStructure.id)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Plus size={15} />
                        Add Rule
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Structure Information Card (Form View) */}
              <div className="bg-white border border-border rounded-sm-md p-5 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Structure Name</div>
                  <div className="text-sm font-bold text-ink-900 mt-1">{selectedStructure.name}</div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Status</div>
                  <div className="mt-1">
                    {selectedStructure.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-ink-600 border border-border">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Assigned Contracts</div>
                  <div className="text-sm font-bold text-ink-900 mt-1 flex items-center gap-1.5">
                    <span className="font-mono">{selectedStructure.contractCount || 0}</span>
                    <span className="text-xs text-ink-400 font-normal">active employment contracts</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Applied Calculation Order</div>
                  <div className="text-xs text-ink-600 mt-1">
                    Strictly evaluated from <strong>lowest sequence to highest</strong>.
                  </div>
                </div>
              </div>

              {/* Rules List for this Structure */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator size={17} className="text-emerald-700" />
                    <h3 className="text-sm font-bold text-ink-900">Configured Salary Rules</h3>
                    <span className="px-2 py-0.5 bg-paper rounded border border-border text-xs font-semibold text-ink-700 font-mono">
                      {selectedStructureRules.length} rules
                    </span>
                  </div>
                  <span className="text-xs text-ink-400">
                    Rules required: Basic salary & allowances/deductions
                  </span>
                </div>

                <div className="bg-white overflow-hidden">
                  {isLoadingStructureRules ? (
                    <div className="py-12 text-center text-xs text-ink-400">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading structure calculation rules...
                    </div>
                  ) : selectedStructureRules.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calculator size={28} className="mx-auto text-ink-300 mb-2" />
                      <p className="text-sm font-semibold text-ink-700">No rules defined in this structure yet</p>
                      <p className="text-xs text-ink-400 mt-1">
                        Click "Add Rule" to configure Basic Wage, Allowances, and Deductions.
                      </p>
                    </div>
                  ) : (
                    <Table className="border border-[#E7EAE7] rounded-sm-md shadow-none">
                      <THead>
                        <TH align="center">Seq</TH>
                        <TH>Rule Name</TH>
                        <TH>Code</TH>
                        <TH>Category</TH>
                        <TH>Computation Formula</TH>
                        <TH align="right">Actions</TH>
                      </THead>
                      <TBody>
                        {selectedStructureRules.map((rule) => (
                          <TR key={rule.id} className="hover:bg-paper-50 transition-colors">
                            {/* Sequence */}
                            <TD align="center">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-paper border border-border text-ink-800">
                                {rule.sequence}
                              </span>
                            </TD>

                            {/* Name */}
                            <TD>
                              <div className="font-semibold text-ink-900 text-xs">{rule.name}</div>
                            </TD>

                            {/* Code */}
                            <TD>
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-chartreuse-50 text-chartreuse-900 border border-chartreuse-200">
                                {rule.code}
                              </span>
                            </TD>

                            {/* Category */}
                            <TD>{getCategoryBadge(rule.category)}</TD>

                            {/* Formula */}
                            <TD>
                              {rule.computationMethod === 'PERCENTAGE' ? (
                                <div className="text-xs flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-emerald-700 font-mono">
                                    {rule.percentage}%
                                  </span>
                                  <span className="text-ink-400">of</span>
                                  {rule.baseRule ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-paper border border-border text-[11px] font-mono text-ink-800 font-semibold">
                                      {rule.baseRule.code} (Seq {rule.baseRule.sequence})
                                    </span>
                                  ) : (
                                    <span className="text-ink-400 italic text-[11px]">Base Rule</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs font-mono font-medium text-ink-800">
                                  {rule.fixedAmount ? formatCurrency(rule.fixedAmount) : '₹0.00 (Variable / Fixed)'}
                                </div>
                              )}
                            </TD>

                            {/* Actions */}
                            <TD align="right">
                              {canManage && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={(e) => handleOpenEditRule(rule, e)}
                                    className="p-1.5 text-ink-400 hover:text-ink-800 hover:bg-paper rounded transition-colors"
                                    title="Edit rule"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteRule(rule, e)}
                                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    title="Delete rule"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SALARY RULES MASTER LIST (DEDICATED ALL RULES VIEW)                 */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <PageHeader
            title="Salary Rules"
            subtitle="Browse, filter, and inspect calculation rules across all organizational structures"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={isLoading}
                  title="Refresh rules"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
                {canManage && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleOpenCreateRule()}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus size={15} />
                    New Rule
                  </Button>
                )}
              </div>
            }
          />

          {/* Filter Toolbar matching Wireframe Screen 3 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-surface p-3 border border-border rounded-lg shadow-2xs">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                placeholder="Search salary rules by name, code, or category..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Structure Filter Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <Filter size={14} className="text-ink-400" />
              <span className="text-xs font-medium text-ink-500">Structure:</span>
              <select
                value={ruleStructureFilter}
                onChange={(e) => setRuleStructureFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600 font-medium text-ink-800"
              >
                <option value="ALL">All Structures ({structures.length})</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-ink-500 font-medium sm:ml-auto">
              Showing <strong>{filteredRules.length}</strong> of {allRules.length} rules
            </div>
          </div>

          {/* All Rules Master Table */}
          <div className="bg-white overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-ink-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                Loading salary rules...
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="py-16 text-center">
                <Calculator size={32} className="mx-auto text-ink-300 mb-2" />
                <p className="text-sm font-semibold text-ink-700">No salary rules found</p>
                <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto">
                  {ruleSearch || ruleStructureFilter !== 'ALL'
                    ? 'Try resetting the search filters.'
                    : 'Click "New Rule" to configure calculation blueprints.'}
                </p>
              </div>
            ) : (
              <Table className="[&>table]:table-fixed border border-[#E7EAE7] rounded-sm-md shadow-none">
                <THead>
                  <TH className="w-[20%] pl-3">Rule Name</TH>
                  <TH className="w-[10%] pl-3">Code</TH>
                  <TH className="w-[15%] pl-3">Category</TH>
                  <TH className="w-[18%] pl-3">Structure</TH>
                  <TH className="w-[22%] pl-3">Computation Formula</TH>
                  <TH align="center" className="w-[8%]">Sequence</TH>
                  <TH align="right" className="w-[7%]">Actions</TH>
                </THead>
                <TBody>
                  {filteredRules.map((rule) => {
                    const stName =
                      (rule as any).salaryStructure?.name ||
                      structures.find((s) => s.id === rule.salaryStructureId)?.name ||
                      'Unknown Structure';
                    const stId = rule.salaryStructureId || (rule as any).salaryStructure?.id;

                    return (
                      <TR
                        key={rule.id}
                        className="hover:bg-emerald-50/20 transition-colors cursor-pointer"
                        onClick={() => handleOpenEditRule(rule)}
                      >
                        {/* Rule Name */}
                        <TD>
                          <div className="font-semibold text-ink-900 text-xs hover:text-emerald-700">
                            {rule.name}
                          </div>
                        </TD>

                        {/* Code */}
                        <TD>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-chartreuse-50 text-chartreuse-900 border border-chartreuse-200">
                            {rule.code}
                          </span>
                        </TD>

                        {/* Category */}
                        <TD>{getCategoryBadge(rule.category)}</TD>

                        {/* Structure */}
                        <TD>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetSt = structures.find((s) => s.id === stId);
                              if (targetSt) {
                                handleSelectStructure(targetSt);
                                setActiveTab('structures');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs text-ink-700 hover:text-emerald-700 hover:underline"
                            title="View this structure"
                          >
                            <Layers size={13} className="text-emerald-600 shrink-0" />
                            <span className="font-medium">{stName}</span>
                          </button>
                        </TD>

                        {/* Formula */}
                        <TD>
                          {rule.computationMethod === 'PERCENTAGE' ? (
                            <div className="text-xs flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-emerald-700 font-mono">
                                {rule.percentage}%
                              </span>
                              <span className="text-ink-400">of</span>
                              {rule.baseRule ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-paper border border-border text-[11px] font-mono text-ink-800 font-semibold">
                                  {rule.baseRule.code} (Seq {rule.baseRule.sequence})
                                </span>
                              ) : (
                                <span className="text-ink-400 italic text-[11px]">Base Rule</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs font-mono font-medium text-ink-800">
                              {rule.fixedAmount ? formatCurrency(rule.fixedAmount) : '₹0.00 (Fixed)'}
                            </div>
                          )}
                        </TD>

                        {/* Sequence */}
                        <TD align="center">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-paper border border-border text-ink-800">
                            {rule.sequence}
                          </span>
                        </TD>

                        {/* Actions */}
                        <TD align="right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {canManage && (
                              <>
                                <button
                                  onClick={(e) => handleOpenEditRule(rule, e)}
                                  className="p-1.5 text-ink-400 hover:text-ink-800 hover:bg-paper rounded transition-colors"
                                  title="Edit rule"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteRule(rule, e)}
                                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete rule"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT SALARY STRUCTURE                                   */}
      {/* ========================================================================= */}
      <Modal
        open={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        title={editingStructure ? 'Edit Salary Structure' : 'Create Salary Structure'}
        subtitle="Define an organizational salary structure package for employee contracts."
        width="md"
      >
        <form onSubmit={handleSubmitStructure} className="space-y-4">
          {structureFormError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{structureFormError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Structure Name *
            </label>
            <input
              type="text"
              required
              value={structureName}
              onChange={(e) => setStructureName(e.target.value)}
              placeholder="e.g. Regular Salary or Senior Engineering Structure"
              className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={structureIsActive}
                onChange={(e) => setStructureIsActive(e.target.checked)}
                className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div>
                <span className="text-xs font-semibold text-ink-900 block">Active for Contracts</span>
                <span className="text-[11px] text-ink-400 block">
                  When active, HR and Payroll can assign this structure to employee contracts.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsStructureModalOpen(false)}
              disabled={isSubmittingStructure}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSubmittingStructure}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmittingStructure
                ? 'Saving...'
                : editingStructure
                ? 'Update Structure'
                : 'Create Structure'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT SALARY RULE (WIREFRAME SCREEN 4)                   */}
      {/* ========================================================================= */}
      <Modal
        open={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? `Salary Rule / ${editingRule.name}` : 'Salary Rule / New Rule'}
        subtitle="Configure formula calculation method and sequencing order."
        width="lg"
      >
        <form onSubmit={handleSubmitRule} className="space-y-4">
          {ruleFormError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{ruleFormError}</span>
            </div>
          )}

          {/* Structure Selector */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Salary Structure *
            </label>
            <select
              required
              disabled={!!editingRule}
              value={ruleStructureId}
              onChange={(e) => {
                setRuleStructureId(e.target.value);
                setRuleBaseRuleId('');
              }}
              className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600 font-medium disabled:opacity-60"
            >
              <option value="">Select Structure...</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {!s.isActive ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rule Name */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Basic Salary or House Rent Allowance"
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Rule Code */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Rule Code * <span className="text-[11px] text-ink-400">(Unique identifier)</span>
              </label>
              <input
                type="text"
                required
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value.toUpperCase())}
                placeholder="e.g. BASIC, HRA, PF"
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Category *
              </label>
              <select
                required
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value as SalaryRuleCategory)}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600"
              >
                <option value="BASIC">BASIC (Base Wage)</option>
                <option value="ALLOWANCE">ALLOWANCE (Taxable/Special Additions)</option>
                <option value="DEDUCTION">DEDUCTION (PF, PT, Taxes, Insurance)</option>
                <option value="GROSS">GROSS (Sum of Earnings)</option>
                <option value="NET">NET (Final Take-Home Pay)</option>
              </select>
            </div>

            {/* Sequence */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Sequence Order * <span className="text-[11px] text-ink-400">(Ascending calculation)</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={ruleSequence}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setRuleSequence(val);
                }}
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600 font-mono"
              />
              <p className="text-[11px] text-ink-400 mt-1">
                Key Business Rule #3: Rules evaluate sequentially. Base rules must have lower sequence.
              </p>
            </div>
          </div>

          {/* Computation Method Selection */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-ink-700">
              Computation Method *
            </label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label
                className={`p-3 border rounded cursor-pointer flex items-center gap-2 text-xs font-medium transition-colors ${
                  ruleMethod === 'FIXED'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-border bg-paper text-ink-700 hover:bg-paper-100'
                }`}
              >
                <input
                  type="radio"
                  name="ruleMethod"
                  value="FIXED"
                  checked={ruleMethod === 'FIXED'}
                  onChange={() => setRuleMethod('FIXED')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <IndianRupee size={14} className="text-emerald-600" />
                <span>Fixed Amount (₹)</span>
              </label>

              <label
                className={`p-3 border rounded cursor-pointer flex items-center gap-2 text-xs font-medium transition-colors ${
                  ruleMethod === 'PERCENTAGE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-border bg-paper text-ink-700 hover:bg-paper-100'
                }`}
              >
                <input
                  type="radio"
                  name="ruleMethod"
                  value="PERCENTAGE"
                  checked={ruleMethod === 'PERCENTAGE'}
                  onChange={() => setRuleMethod('PERCENTAGE')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <Percent size={14} className="text-emerald-600" />
                <span>Percentage (%) of Base Rule</span>
              </label>
            </div>
          </div>

          {/* Computation Options Form (Wireframe Screen 4) */}
          {ruleMethod === 'FIXED' ? (
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Fixed Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={ruleFixedAmount}
                onChange={(e) => setRuleFixedAmount(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 text-xs bg-paper border border-border rounded focus:outline-none focus:border-emerald-600 font-mono"
              />
              <p className="text-[11px] text-ink-400 mt-1">
                Fixed value added or deducted during pay calculation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-paper rounded border border-border">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Percentage Rate (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    required
                    value={rulePercentage}
                    onChange={(e) => setRulePercentage(e.target.value)}
                    placeholder="40"
                    className="w-full px-3 py-2 text-xs bg-white border border-border rounded focus:outline-none focus:border-emerald-600 font-mono pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400 font-bold">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Base Rule to Calculate From *
                </label>
                <select
                  required
                  value={ruleBaseRuleId}
                  onChange={(e) => setRuleBaseRuleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-border rounded focus:outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="">Select Base Rule...</option>
                  {eligibleBaseRules.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name} ({br.code}) — Seq {br.sequence}
                    </option>
                  ))}
                </select>

                {eligibleBaseRules.length === 0 ? (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    ⚠️ No rule exists with sequence &lt; {ruleSequence}. Increase this rule's sequence or add a prior base rule first.
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-400 mt-1">
                    Enforces Key Business Rule #3: Only earlier sequences are eligible.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              disabled={isSubmittingRule}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSubmittingRule}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmittingRule ? 'Saving Rule...' : editingRule ? 'Update Rule' : 'Save Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
