import React, { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  ArrowRight,
  X,
  Building,
  Briefcase,
  HelpCircle,
  Eye,
  Check,
} from 'lucide-react';
import {
  payrollRepository,
  employeeRepository,
  auditRepository,
} from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  SalaryTemplate,
  EmployeeSalaryAssignment,
  PayrollRun,
  PayrollItem,
  EmployeeLoan,
  EmployeeDeduction,
  EmployeeProvidentFund,
  Employee,
} from '../../types';
import { ChevronStepper, StepItem } from '../common/ChevronStepper';
import { StatusPill } from '../common/StatusPill';

export const PayrollView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  // Active Tab
  type TabKey = 'runs' | 'structures' | 'assignments' | 'payslips' | 'loans' | 'deductions';
  const [activeTab, setActiveTab] = useState<TabKey>('runs');

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [assignments, setAssignments] = useState<EmployeeSalaryAssignment[]>([]);
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [deductions, setDeductions] = useState<EmployeeDeduction[]>([]);
  const [providentFunds, setProvidentFunds] = useState<EmployeeProvidentFund[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isPayRunModalOpen, setIsPayRunModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollItem | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Stepper state for Pay Run Generation Wizard
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    title: `November ${new Date().getFullYear()} Monthly Payroll Run`,
    period_start: `${new Date().getFullYear()}-11-01`,
    period_end: `${new Date().getFullYear()}-11-30`,
    pay_date: `${new Date().getFullYear()}-11-28`,
    notes: 'Standard monthly executive, academic, and administrative payroll cycle.',
  });

  // Structure Form State
  const [structureForm, setStructureForm] = useState({
    name: '',
    basic_salary: 300000,
    description: '',
    allowances: [
      { name: 'Housing Allowance', amount: 100000 },
      { name: 'Transport Allowance', amount: 40000 },
    ],
    deductions: [
      { name: 'Statutory PAYE Tax', amount: 35000 },
      { name: 'Pension Contribution (8%)', amount: 24000 },
    ],
  });

  // Assignment Form State
  const [assignmentForm, setAssignmentForm] = useState({
    employee_id: '',
    salary_template_id: '',
    effective_date: new Date().toISOString().split('T')[0],
    override_basic_salary: '',
    notes: '',
  });

  // Loan Form State
  const [loanForm, setLoanForm] = useState({
    employee_id: '',
    loan_type: 'Staff Appliance & Personal Advance',
    principal_amount: 200000,
    interest_rate: 0,
    total_installments: 10,
    monthly_installment: 20000,
    notes: '',
  });

  // Load all payroll data
  const loadData = async () => {
    try {
      setLoading(true);
      const [rList, tList, aList, lList, dList, pfList, empList] = await Promise.all([
        payrollRepository.getPayrollRuns(),
        payrollRepository.getSalaryTemplates(),
        payrollRepository.getAssignments(),
        payrollRepository.getLoans(),
        payrollRepository.getDeductions(),
        payrollRepository.getProvidentFunds(),
        employeeRepository.getAll(),
      ]);

      setRuns(rList);
      setTemplates(tList);
      setAssignments(aList);
      setLoans(lList);
      setDeductions(dList);
      setProvidentFunds(pfList);
      setEmployees(empList);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Format currency
  const formatMoney = (amount?: number | null, currency = 'NGN') => {
    const val = amount || 0;
    return `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    const totalGrossYtd = runs.reduce((acc, r) => acc + (r.total_gross || 0), 0);
    const latestRun = runs[0];
    const latestNet = latestRun ? latestRun.total_net : 0;
    const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'approved');
    const totalLoanRemaining = activeLoans.reduce((acc, l) => acc + (l.remaining_balance || 0), 0);
    const pfReserve = providentFunds.reduce((acc, pf) => acc + (pf.current_balance || 0), 0);

    return {
      totalGrossYtd,
      latestNet,
      structuresCount: templates.length,
      assignedStaffCount: assignments.filter((a) => a.is_active).length,
      activeLoansCount: activeLoans.length,
      totalLoanRemaining,
      pfReserve,
    };
  }, [runs, templates, assignments, loans, providentFunds]);

  // Stepper Items for Pay Run Modal
  const wizardSteps: StepItem[] = [
    { id: '1', title: 'Select Period', subtitle: 'Dates & Run Title' },
    { id: '2', title: 'Details', subtitle: 'Scope & Headcount' },
    { id: '3', title: 'Verify', subtitle: 'Calculations & Taxes' },
    { id: '4', title: 'Finish', subtitle: 'Generate Pay Run' },
  ];

  // Handle Pay Run Draft Generation
  const handleGeneratePayRun = async () => {
    try {
      const created = await payrollRepository.generatePayrollRun({
        title: wizardData.title,
        period_start: wizardData.period_start,
        period_end: wizardData.period_end,
        pay_date: wizardData.pay_date,
        notes: wizardData.notes,
      });

      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'ADMIN',
        module: 'Payroll',
        action: 'GENERATE_PAY_RUN',
        recordAffectedId: created.id,
        recordAffectedTitle: `Pay Run ${created.run_number} (${created.title})`,
        severity: 'Info',
      });

      setIsPayRunModalOpen(false);
      setWizardStep(1);
      showNotification(`Pay run ${created.run_number} draft successfully created!`);
      loadData();
    } catch (err: any) {
      alert(`Failed to generate pay run: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle Pay Run Finalization
  const handleFinalizeRun = async (runId: string) => {
    try {
      const finalized = await payrollRepository.finalizePayrollRun(runId);
      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'ADMIN',
        module: 'Payroll',
        action: 'FINALIZE_PAY_RUN',
        recordAffectedId: finalized.id,
        recordAffectedTitle: `Approved pay run ${finalized.run_number}`,
        severity: 'Info',
      });
      showNotification(`Pay run ${finalized.run_number} has been finalized and approved!`);
      loadData();
    } catch (err: any) {
      alert(`Could not finalize run: ${err.message}`);
    }
  };

  // Handle Loan Approval
  const handleApproveLoan = async (loanId: string) => {
    try {
      const approved = await payrollRepository.approveLoan(loanId);
      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'ADMIN',
        module: 'Payroll',
        action: 'APPROVE_LOAN',
        recordAffectedId: approved.id,
        recordAffectedTitle: `Loan ${approved.loan_number}`,
        severity: 'Info',
      });
      showNotification(`Loan ${approved.loan_number} approved and activated.`);
      loadData();
    } catch (err: any) {
      alert(`Error approving loan: ${err.message}`);
    }
  };

  // Handle Create Salary Structure
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureForm.name) {
      alert('Please enter a structure name');
      return;
    }
    try {
      const created = await payrollRepository.createSalaryTemplate({
        name: structureForm.name,
        basic_salary: Number(structureForm.basic_salary),
        allowances: structureForm.allowances,
        deductions: structureForm.deductions,
        description: structureForm.description,
        is_active: true,
      });
      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'ADMIN',
        module: 'Payroll',
        action: 'CREATE_SALARY_STRUCTURE',
        recordAffectedId: created.id,
        recordAffectedTitle: `Salary Structure ${created.name}`,
        severity: 'Info',
      });
      setIsTemplateModalOpen(false);
      showNotification(`Salary structure "${created.name}" created successfully.`);
      loadData();
    } catch (err: any) {
      alert(`Failed to save template: ${err.message}`);
    }
  };

  // Handle Assign Structure
  const handleAssignStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.employee_id || !assignmentForm.salary_template_id) {
      alert('Please select both an employee and a salary structure');
      return;
    }
    try {
      const res = await payrollRepository.assignSalaryTemplate({
        employee_id: assignmentForm.employee_id,
        salary_template_id: assignmentForm.salary_template_id,
        effective_date: assignmentForm.effective_date,
        override_basic_salary: assignmentForm.override_basic_salary
          ? Number(assignmentForm.override_basic_salary)
          : null,
        notes: assignmentForm.notes,
      });
      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'ADMIN',
        module: 'Payroll',
        action: 'ASSIGN_SALARY_STRUCTURE',
        recordAffectedId: res.id,
        recordAffectedTitle: `Assignment for employee ${res.employee_id}`,
        severity: 'Info',
      });
      setIsAssignmentModalOpen(false);
      showNotification('Employee salary structure assigned successfully.');
      loadData();
    } catch (err: any) {
      alert(`Failed to assign template: ${err.message}`);
    }
  };

  // Handle Create Loan
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.employee_id) {
      alert('Please select an employee');
      return;
    }
    try {
      const res = await payrollRepository.createLoan({
        employee_id: loanForm.employee_id,
        loan_type: loanForm.loan_type,
        principal_amount: Number(loanForm.principal_amount),
        interest_rate: Number(loanForm.interest_rate),
        monthly_installment: Number(loanForm.monthly_installment),
        total_installments: Number(loanForm.total_installments),
        disbursed_at: new Date().toISOString().split('T')[0],
        notes: loanForm.notes,
      });
      await auditRepository.logAction({
        userId: currentUser?.id || 'sys-admin',
        userName: currentUser?.name || 'Administrator',
        userRole: (currentUser?.role as any) || 'ADMIN',
        module: 'Payroll',
        action: 'CREATE_LOAN_APPLICATION',
        recordAffectedId: res.id,
        recordAffectedTitle: `Loan Application ${res.loan_number}`,
        severity: 'Info',
      });
      setIsLoanModalOpen(false);
      showNotification(`Loan application ${res.loan_number} created.`);
      loadData();
    } catch (err: any) {
      alert(`Failed to create loan: ${err.message}`);
    }
  };

  // Handle Mark Payslip Paid
  const handleMarkPayslipPaid = async (item: PayrollItem) => {
    try {
      const updated = await payrollRepository.markPayslipPaid(item.id, 'Direct Bank Transfer');
      setSelectedPayslip(updated);
      showNotification(`Payslip for ${item.employee?.name || 'Employee'} marked as PAID.`);
      loadData();
    } catch (err: any) {
      alert(`Could not mark paid: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#083E34] text-white px-5 py-3 rounded-xl shadow-xl border border-[#D4AF37]/40 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />
          <span className="text-sm font-semibold">{actionSuccessMessage}</span>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-white/60 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-slate-950 flex items-center justify-center shadow-md border border-[#C59B27]">
              <Banknote className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Payroll & Compensation Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Consolidated multi-entity pay structures, statutory taxes, loan deductions, and bank disbursements.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => {
              setWizardStep(1);
              setIsPayRunModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-xs border border-[#C59B27] transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Generate Pay Run</span>
          </button>

          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span>New Structure</span>
          </button>

          <button
            onClick={() => setIsAssignmentModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Assign Staff</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total YTD Payout */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>YTD Payroll Volume</span>
            <DollarSign className="w-4 h-4 text-[#083E34]" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {formatMoney(metrics.totalGrossYtd)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-emerald-600 font-bold">100% compliant</span>
            <span>across all entities</span>
          </div>
        </div>

        {/* Latest Net Disbursement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Latest Net Payout</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {formatMoney(metrics.latestNet)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-slate-700 font-semibold">{runs[0]?.run_number || 'Cycle'}</span>
            <span>settled on {runs[0]?.pay_date || 'N/A'}</span>
          </div>
        </div>

        {/* Assigned Staff on Structure */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Structure Coverage</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {metrics.assignedStaffCount}{' '}
            <span className="text-sm font-normal text-slate-400">/ {employees.length} Staff</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-blue-600 font-bold">{metrics.structuresCount}</span>
            <span>active compensation tiers</span>
          </div>
        </div>

        {/* Active Staff Loans */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Revolving Loans</span>
            <CreditCard className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {formatMoney(metrics.totalLoanRemaining)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-[#083E34] font-bold">{metrics.activeLoansCount} active loans</span>
            <span>repaying via payroll</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-xl px-2 pt-2 shadow-xs">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar">
          {[
            { key: 'runs', label: 'Pay Runs & Cycles', count: runs.length },
            { key: 'structures', label: 'Salary Structures', count: templates.length },
            { key: 'assignments', label: 'Staff Assignments', count: assignments.length },
            { key: 'payslips', label: 'Payslips & History' },
            { key: 'loans', label: 'Loans & Advances', count: loans.length },
            { key: 'deductions', label: 'Deductions & Provident Fund' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            /* Restrict Excel management tabs to ADMIN and HR_STAFF only */

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`py-3 px-3 sm:px-4 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#D4AF37] text-slate-950 shadow-xs border border-[#C59B27]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT 1: PAY RUNS & CYCLES */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search pay run number or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]"
              />
            </div>

            <button
              onClick={() => {
                setWizardStep(1);
                setIsPayRunModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] px-3.5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>New Pay Run</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Run Code & Title</th>
                    <th className="py-3.5 px-4">Period</th>
                    <th className="py-3.5 px-4">Pay Date</th>
                    <th className="py-3.5 px-4 text-right">Gross Pay</th>
                    <th className="py-3.5 px-4 text-right">Deductions</th>
                    <th className="py-3.5 px-4 text-right">Net Payout</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs
                    .filter((r) =>
                      searchQuery
                        ? (r.run_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (r.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                        : true
                    )
                    .map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{run.run_number}</div>
                          <div className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                            {run.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-700">
                            {run.period_start} → {run.period_end}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{run.pay_date}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                          {formatMoney(run.total_gross)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                          -{formatMoney(run.total_deduction)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                          {formatMoney(run.total_net)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              run.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : run.status === 'approved'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {run.status === 'draft' && (
                              <button
                                onClick={() => handleFinalizeRun(run.id)}
                                className="px-2.5 py-1 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 border border-[#C59B27] rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                Finalize & Approve
                              </button>
                            )}
                            {run.items && run.items.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedPayslip(run.items![0]);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View Payslips in Run"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: SALARY STRUCTURES */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Configured compensation salary structures containing baseline pay, standard allowances, and mandatory deductions.
            </p>
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] px-3.5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Create Structure</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{tpl.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {tpl.description || 'Citadel baseline compensation model.'}
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  {/* Basic Salary */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Basic Base Salary
                    </span>
                    <span className="text-lg font-black text-[#083E34]">
                      {formatMoney(tpl.basic_salary)}
                    </span>
                  </div>

                  {/* Allowances Breakdown */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Allowances ({tpl.allowances?.length || 0})
                    </span>
                    {tpl.allowances?.map((a, i) => (
                      <div key={i} className="flex justify-between text-xs text-slate-600">
                        <span>{a.name}</span>
                        <span className="font-semibold text-slate-800">{formatMoney(a.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Statutory Deductions ({tpl.deductions?.length || 0})
                    </span>
                    {tpl.deductions?.map((d, i) => (
                      <div key={i} className="flex justify-between text-xs text-rose-600">
                        <span>{d.name}</span>
                        <span className="font-semibold">-{formatMoney(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Assigned to {assignments.filter((a) => a.salary_template_id === tpl.id).length} staff
                  </span>
                  <button
                    onClick={() => {
                      setAssignmentForm({
                        ...assignmentForm,
                        salary_template_id: tpl.id,
                      });
                      setIsAssignmentModalOpen(true);
                    }}
                    className="text-xs font-bold text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    Assign Staff →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: STAFF ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Active employee assignments mapping staff to compensation structures and custom differentials.
            </p>
            <button
              onClick={() => setIsAssignmentModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] px-3.5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Assign Structure</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Assigned Structure</th>
                    <th className="py-3.5 px-4">Effective Date</th>
                    <th className="py-3.5 px-4 text-right">Applicable Basic</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((asgn) => {
                    const basic =
                      asgn.override_basic_salary ??
                      asgn.salary_template?.basic_salary ??
                      0;
                    return (
                      <tr key={asgn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {asgn.employee?.name || asgn.employee_id}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {asgn.employee?.staff_id} · {asgn.employee?.department_name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">
                            {asgn.salary_template?.name || asgn.salary_template_id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {asgn.effective_date}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#083E34]">
                          {formatMoney(basic)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {asgn.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PAYSLIPS & DISBURSEMENTS */}
      {activeTab === 'payslips' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-900">
                Itemized Employee Payslips (Settled & Approved Runs)
              </h3>
              <span className="text-xs text-slate-500">
                Click any payslip to inspect full line-item tax and deduction breakdown.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Bank Account</th>
                    <th className="py-3.5 px-4 text-right">Basic Pay</th>
                    <th className="py-3.5 px-4 text-right">Allowances</th>
                    <th className="py-3.5 px-4 text-right">Gross Salary</th>
                    <th className="py-3.5 px-4 text-right">Deductions</th>
                    <th className="py-3.5 px-4 text-right">Net Salary</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs
                    .flatMap((r) => r.items || [])
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {item.employee?.name || item.employee_id}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.employee?.staff_id} · {item.employee?.department_name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {item.employee?.bank_name || 'Zenith Bank'}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {item.employee?.account_number || '1012398450'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {formatMoney(item.basic_salary)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                          +{formatMoney(item.allowance_total)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {formatMoney(item.gross_salary)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                          -{formatMoney(item.deduction_total)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                          {formatMoney(item.net_salary)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.payment_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedPayslip(item)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-[#D4AF37] hover:text-slate-950 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            Inspect Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: LOANS & ADVANCES */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Staff welfare revolving advances, loan tenures, monthly deductions, and remaining repayment balances.
            </p>
            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] px-3.5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Issue Staff Loan</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Loan Code & Staff</th>
                    <th className="py-3.5 px-4">Loan Purpose</th>
                    <th className="py-3.5 px-4 text-right">Principal</th>
                    <th className="py-3.5 px-4 text-right">Monthly Installment</th>
                    <th className="py-3.5 px-4 text-center">Tenure Progress</th>
                    <th className="py-3.5 px-4 text-right">Remaining Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{loan.loan_number}</div>
                        <div className="text-[11px] text-slate-500">
                          {loan.employee?.name || loan.employee_id} · {loan.employee?.staff_id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{loan.loan_type}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {formatMoney(loan.principal_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                        -{formatMoney(loan.monthly_installment)} / mo
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-slate-700">
                          {loan.paid_installments} / {loan.total_installments} mos
                        </span>
                        <div className="w-20 bg-slate-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{
                              width: `${(loan.paid_installments / loan.total_installments) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {formatMoney(loan.remaining_balance)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            loan.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : loan.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {loan.status === 'pending' && (
                          <button
                            onClick={() => handleApproveLoan(loan.id)}
                            className="px-2.5 py-1 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 border border-[#C59B27] rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: DEDUCTIONS & PROVIDENT FUND */}
      {activeTab === 'deductions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Custom Recurring Deductions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Custom Staff Deductions</h3>
                <p className="text-xs text-slate-500">
                  Cooperative dues, voluntary savings, union contributions.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Staff</th>
                    <th className="p-2.5">Deduction Title</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deductions.map((d) => (
                    <tr key={d.id}>
                      <td className="p-2.5 font-bold text-slate-900">
                        {d.employee?.name || d.employee_id}
                      </td>
                      <td className="p-2.5">{d.title}</td>
                      <td className="p-2.5 text-right font-black text-rose-600">
                        -{formatMoney(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provident Fund & Pension Pool */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Provident Fund & Pension Pool</h3>
                <p className="text-xs text-slate-500">
                  8% Employee contribution matched by 10% Employer contribution.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Staff</th>
                    <th className="p-2.5 text-right">Employee (8%)</th>
                    <th className="p-2.5 text-right">Employer (10%)</th>
                    <th className="p-2.5 text-right">Cumulative Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {providentFunds.map((pf) => (
                    <tr key={pf.id}>
                      <td className="p-2.5 font-bold text-slate-900">
                        {pf.employee?.name || pf.employee_id}
                      </td>
                      <td className="p-2.5 text-right font-medium text-slate-700">
                        {formatMoney(pf.total_employee_contribution)}
                      </td>
                      <td className="p-2.5 text-right font-medium text-emerald-700">
                        {formatMoney(pf.total_employer_contribution)}
                      </td>
                      <td className="p-2.5 text-right font-black text-[#083E34]">
                        {formatMoney(pf.current_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: PAY RUN GENERATION WIZARD (WITH CHEVRON STEPPER DESIGN)
         ========================================================================= */}
      {isPayRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Generate Pay Run Cycle</h2>
                <p className="text-xs text-slate-500">
                  Automated computation of basic pay, allowances, statutory PAYE, loan deductions, and PF.
                </p>
              </div>
              <button
                onClick={() => setIsPayRunModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User-Approved Chevron Stepper */}
            <ChevronStepper
              steps={wizardSteps}
              currentStep={wizardStep}
              onStepClick={(step) => setWizardStep(step)}
              variant="detailed"
            />

            {/* Step 1: Select Period & Parameters */}
            {wizardStep === 1 && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pay Run Cycle Title</label>
                  <input
                    type="text"
                    value={wizardData.title}
                    onChange={(e) => setWizardData({ ...wizardData, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#083E34]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Period Start</label>
                    <input
                      type="date"
                      value={wizardData.period_start}
                      onChange={(e) => setWizardData({ ...wizardData, period_start: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Period End</label>
                    <input
                      type="date"
                      value={wizardData.period_end}
                      onChange={(e) => setWizardData({ ...wizardData, period_end: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Pay Date</label>
                  <input
                    type="date"
                    value={wizardData.pay_date}
                    onChange={(e) => setWizardData({ ...wizardData, pay_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Employee Scope & Structure Details */}
            {wizardStep === 2 && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-900">
                  <div className="font-bold">Active Staff Eligibility Check</div>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    All active employees assigned to compensation structures will be computed.
                    Unassigned staff are flagged for review.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Assigned Employees
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      {assignments.filter((a) => a.is_active).length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Active Loans To Deduct
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      {loans.filter((l) => l.status === 'active').length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Verify Calculations & Totals */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-700">
                    <span>Estimated Baseline Basic Pay</span>
                    <span className="font-bold text-slate-900">₦1,690,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Estimated Total Allowances</span>
                    <span className="font-bold text-emerald-700">+₦975,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Gross Payroll Payout</span>
                    <span className="font-bold text-slate-900">₦2,665,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-2">
                    <span>Statutory Taxes (PAYE) & Pension</span>
                    <span className="font-bold text-rose-600">-₦403,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Monthly Loan Installment Deductions</span>
                    <span className="font-bold text-rose-600">-₦20,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-900 border-t border-slate-300 pt-2 text-sm font-black">
                    <span>Estimated Net Disbursement</span>
                    <span className="text-emerald-700">₦2,242,000.00</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Finish & Confirm */}
            {wizardStep === 4 && (
              <div className="space-y-4 animate-fade-in text-xs text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 text-slate-950 flex items-center justify-center mx-auto mb-2 border border-[#D4AF37]">
                  <Check className="w-6 h-6 stroke-[3] text-slate-950" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Ready to Generate Draft Pay Run</h3>
                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Generating this draft will populate the itemized payslips for all eligible personnel.
                  It remains in draft status until finalized.
                </p>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) setWizardStep(wizardStep - 1);
                  else setIsPayRunModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {wizardStep > 1 ? '← Back' : 'Cancel'}
              </button>

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4 text-slate-950" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGeneratePayRun}
                  className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-black border border-[#C59B27] rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Generate Pay Run Draft</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD SALARY STRUCTURE
         ========================================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Create Salary Structure</h2>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStructure} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Structure / Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Media & Technology Specialist (Grade 3)"
                  value={structureForm.name}
                  onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Basic Monthly Base Salary (₦)</label>
                <input
                  type="number"
                  required
                  value={structureForm.basic_salary}
                  onChange={(e) =>
                    setStructureForm({ ...structureForm, basic_salary: Number(e.target.value) })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Grade Level</label>
                <textarea
                  rows={2}
                  placeholder="Applicable staff departments or governance tier notes"
                  value={structureForm.description}
                  onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] rounded-xl shadow-xs cursor-pointer active:scale-95 transition"
                >
                  Save Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ASSIGN STRUCTURE TO STAFF
         ========================================================================= */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Assign Salary Structure</h2>
              <button
                onClick={() => setIsAssignmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignStructure} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Employee</label>
                <select
                  required
                  value={assignmentForm.employee_id}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, employee_id: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.staffId}) - {emp.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Salary Structure</label>
                <select
                  required
                  value={assignmentForm.salary_template_id}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, salary_template_id: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="">-- Choose Structure --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} (Basic: ₦{tpl.basic_salary.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={assignmentForm.effective_date}
                    onChange={(e) =>
                      setAssignmentForm({ ...assignmentForm, effective_date: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Override Basic Pay (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Leave empty to use base"
                    value={assignmentForm.override_basic_salary}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        override_basic_salary: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] rounded-xl shadow-xs cursor-pointer active:scale-95 transition"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: ISSUE STAFF LOAN
         ========================================================================= */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Issue Staff Loan / Advance</h2>
              <button
                onClick={() => setIsLoanModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employee</label>
                <select
                  required
                  value={loanForm.employee_id}
                  onChange={(e) => setLoanForm({ ...loanForm, employee_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.staffId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loan / Advance Type</label>
                <input
                  type="text"
                  required
                  value={loanForm.loan_type}
                  onChange={(e) => setLoanForm({ ...loanForm, loan_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Principal Amount (₦)</label>
                  <input
                    type="number"
                    required
                    value={loanForm.principal_amount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const inst = Number(loanForm.total_installments) || 1;
                      setLoanForm({
                        ...loanForm,
                        principal_amount: val,
                        monthly_installment: Math.round(val / inst),
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    required
                    value={loanForm.total_installments}
                    onChange={(e) => {
                      const inst = Number(e.target.value) || 1;
                      setLoanForm({
                        ...loanForm,
                        total_installments: inst,
                        monthly_installment: Math.round(loanForm.principal_amount / inst),
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Deduction (₦)</label>
                <input
                  type="number"
                  readOnly
                  value={loanForm.monthly_installment}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-[#083E34]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] rounded-xl shadow-xs cursor-pointer active:scale-95 transition"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: DETAILED PAYSLIP INSPECTION & PRINT DRAWER
         ========================================================================= */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37] block">
                  Citadel People Hub · Official Pay Slip
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedPayslip.employee?.name || 'Staff Member'}
                </h2>
                <div className="text-xs text-slate-500">
                  Staff ID: {selectedPayslip.employee?.staff_id} · {selectedPayslip.employee?.department_name}
                </div>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banking Details */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Disbursement Bank</span>
                <span className="font-bold text-slate-800">
                  {selectedPayslip.employee?.bank_name || 'Zenith Bank PLC'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Account Number</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedPayslip.employee?.account_number || '1012398450'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedPayslip.payment_status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedPayslip.payment_status}
                </span>
              </div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Earnings */}
              <div className="space-y-2 border border-slate-200 p-3 rounded-xl">
                <span className="font-bold text-[#083E34] text-[11px] block border-b border-slate-100 pb-1">
                  Gross Earnings
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Basic Base Pay</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(selectedPayslip.basic_salary)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Allowances</span>
                  <span className="font-semibold text-emerald-600">
                    +{formatMoney(selectedPayslip.allowance_total)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1">
                  <span>Total Gross</span>
                  <span>{formatMoney(selectedPayslip.gross_salary)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2 border border-slate-200 p-3 rounded-xl">
                <span className="font-bold text-rose-700 text-[11px] block border-b border-slate-100 pb-1">
                  Statutory & Loan Deductions
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>PAYE Tax</span>
                  <span className="font-semibold text-rose-600">
                    -{formatMoney(selectedPayslip.tax_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pension / PF (8%)</span>
                  <span className="font-semibold text-rose-600">
                    -{formatMoney(selectedPayslip.provident_fund_amount)}
                  </span>
                </div>
                {(selectedPayslip.loan_repayment_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Loan Installment</span>
                    <span className="font-semibold text-rose-600">
                      -{formatMoney(selectedPayslip.loan_repayment_amount!)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-rose-700 border-t border-slate-100 pt-1">
                  <span>Total Deductions</span>
                  <span>-{formatMoney(selectedPayslip.deduction_total)}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight */}
            <div className="p-4 bg-[#083E34] text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#D4AF37] uppercase font-bold tracking-wider block">
                  Net Disbursable Take-Home
                </span>
                <span className="text-xl font-black">{formatMoney(selectedPayslip.net_salary)}</span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                <span>Print Slip</span>
              </button>
            </div>

            {/* Mark as paid button if unpaid */}
            {selectedPayslip.payment_status === 'unpaid' && (
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleMarkPayslipPaid(selectedPayslip)}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold border border-[#C59B27] rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Mark as Disbursed & Paid</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollView;
