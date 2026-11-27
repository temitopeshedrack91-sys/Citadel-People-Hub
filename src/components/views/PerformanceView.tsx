import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award,
  Target,
  CheckCircle2,
  Star,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Check,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  X,
  FileText,
  User,
  Sliders,
  AlertCircle,
  HelpCircle,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { isHrOrAdminUser } from '../../utils/rbac';
import { Badge } from '../common/Badge';
import { performanceRepository, employeeRepository, classificationRepository } from '../../services';
import { PerformanceReview, Kpi, Employee, ReviewRating, JobTitle } from '../../types';

interface ScoringItemState {
  kpiId?: number;
  score: number;
  comment: string;
  weight: number;
  title: string;
  minRating: number;
  maxRating: number;
}

export const PerformanceView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'reviews' | 'kpis' | 'framework' | 'okrs'>('reviews');
  const [checkinFeedback, setCheckinFeedback] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Data state
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [kpiRoleFilter, setKpiRoleFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [isInitiateReviewModalOpen, setIsInitiateReviewModalOpen] = useState(false);
  const [selectedReviewForScoring, setSelectedReviewForScoring] = useState<PerformanceReview | null>(null);

  // KPI Form state
  const [editingKpiId, setEditingKpiId] = useState<number | null>(null);
  const [editingKpiVersion, setEditingKpiVersion] = useState<number | undefined>(undefined);
  const [kpiIndicator, setKpiIndicator] = useState('');
  const [kpiJobTitleId, setKpiJobTitleId] = useState<string>('');
  const [kpiJobRole, setKpiJobRole] = useState('All Roles / General');
  const [kpiMinRating, setKpiMinRating] = useState(1);
  const [kpiMaxRating, setKpiMaxRating] = useState(5);
  const [kpiWeight, setKpiWeight] = useState(25);

  // Initiate Review Form state
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [targetReviewerId, setTargetReviewerId] = useState('');
  const [reviewPeriodStart, setReviewPeriodStart] = useState('2026-07-01');
  const [reviewPeriodEnd, setReviewPeriodEnd] = useState('2026-12-31');
  const [reviewDueDate, setReviewDueDate] = useState('2026-12-15');
  const [assignedKpiIds, setAssignedKpiIds] = useState<number[]>([]);
  const [assignedWeights, setAssignedWeights] = useState<Record<number, number>>({});

  // Scoring Form state
  const [scoringRatings, setScoringRatings] = useState<Record<number, ScoringItemState>>({});
  const [scoringReviewerComments, setScoringReviewerComments] = useState('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const isHrOrAdmin = isHrOrAdminUser(currentUser);
  const canInitiateAppraisal =
    isHrOrAdmin ||
    currentRole === 'MANAGER' ||
    currentRole === 'DEPARTMENT_HEAD' ||
    currentRole === 'BUSINESS_HEAD';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [revList, kpiList, empList, titleList] = await Promise.all([
        performanceRepository.getReviews(),
        performanceRepository.getKpis(),
        employeeRepository.getAll(),
        classificationRepository.getJobTitles().catch(() => [] as JobTitle[]),
      ]);
      setReviews(revList);
      setKpis(kpiList);
      setEmployees(empList);
      setJobTitles(titleList);
      if (empList.length > 0 && !targetEmployeeId) {
        const firstNonSelf = empList.find((e) => String(e.id) !== String(currentUser.employeeId)) || empList[0];
        setTargetEmployeeId(String(firstNonSelf.id));
        const defaultMgr =
          firstNonSelf.managerId ||
          currentUser.employeeId ||
          String(empList.find((e) => e.id !== firstNonSelf.id)?.id || empList[0].id);
        setTargetReviewerId(String(defaultMgr));
      }
      if (kpiList.length > 0 && assignedKpiIds.length === 0) {
        const activeList = kpiList.filter((k) => k.isActive !== false);
        const activeSum = activeList.reduce((acc, k) => acc + Number(k.weight ?? 0), 0);
        const initialSelection =
          Math.abs(activeSum - 100) < 0.01 ? activeList : activeList.slice(0, 4);
        setAssignedKpiIds(initialSelection.map((k) => k.id));
        const nextWeights: Record<number, number> = {};
        initialSelection.forEach((k) => {
          nextWeights[k.id] = Number(k.weight ?? 25);
        });
        setAssignedWeights((prev) => (Object.keys(prev).length > 0 ? prev : nextWeights));
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load performance & appraisal records.');
    } finally {
      setLoading(false);
    }
  }, [assignedKpiIds.length, currentUser.employeeId, targetEmployeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtimeTable('kpis', () => {
    void loadData();
  });

  useRealtimeTable('performance_reviews', () => {
    void loadData();
  });

  const showSuccess = (msg: string) => {
    setErrorBanner(null);
    setCheckinFeedback(msg);
    setTimeout(() => setCheckinFeedback(null), 5000);
  };

  const showError = (msg: string) => {
    setCheckinFeedback(null);
    setErrorBanner(msg);
  };

  const resolveErrorMessage = (err: any, fallback: string): string => {
    const raw = err?.message || fallback;
    if (err?.status === 409 || String(raw).toLowerCase().includes('modified by another user') || String(raw).toLowerCase().includes('conflict')) {
      return `${raw} Click Refresh Data to pull the latest record before retrying.`;
    }
    return raw;
  };

  // Update default reviewer when target employee changes inside Initiate modal
  const handleSelectTargetEmployee = (empId: string) => {
    setTargetEmployeeId(empId);
    const selectedEmp = employees.find((e) => String(e.id) === String(empId));
    const fallbackMgr =
      selectedEmp?.managerId ||
      currentUser.employeeId ||
      employees.find((e) => String(e.id) !== String(empId))?.id ||
      '';
    setTargetReviewerId(String(fallbackMgr));
  };

  // KPI Management Handlers
  const handleOpenCreateKpi = () => {
    setModalError(null);
    setEditingKpiId(null);
    setEditingKpiVersion(undefined);
    setKpiIndicator('');
    setKpiJobTitleId('');
    setKpiJobRole('All Roles / General');
    setKpiMinRating(1);
    setKpiMaxRating(5);
    setKpiWeight(25);
    setIsKpiModalOpen(true);
  };

  const handleEditKpi = (kpi: Kpi) => {
    setModalError(null);
    setEditingKpiId(kpi.id);
    setEditingKpiVersion(kpi.version);
    setKpiIndicator(kpi.indicator);
    setKpiJobTitleId(kpi.jobTitleId ? String(kpi.jobTitleId) : '');
    setKpiJobRole(kpi.jobTitle?.name || kpi.jobTitleName || 'All Roles / General');
    setKpiMinRating(kpi.minRating ?? 1);
    setKpiMaxRating(kpi.maxRating ?? 5);
    setKpiWeight(Number(kpi.weight ?? 25));
    setIsKpiModalOpen(true);
  };

  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!kpiIndicator.trim()) return;
    if (kpiMaxRating <= kpiMinRating) {
      setModalError('Max Rating must be greater than Min Rating.');
      return;
    }

    const matchedTitle = jobTitles.find((jt) => String(jt.id) === String(kpiJobTitleId));
    const parsedJobTitleId = kpiJobTitleId && Number.isFinite(Number(kpiJobTitleId)) ? Number(kpiJobTitleId) : undefined;
    const resolvedJobTitleName = matchedTitle?.title || (kpiJobRole.trim() || 'All Roles / General');

    try {
      if (editingKpiId) {
        await performanceRepository.updateKpi(editingKpiId, {
          indicator: kpiIndicator,
          jobTitleId: parsedJobTitleId,
          jobTitleName: resolvedJobTitleName,
          minRating: kpiMinRating,
          maxRating: kpiMaxRating,
          weight: kpiWeight,
          version: editingKpiVersion,
        });
        showSuccess(`KPI "${kpiIndicator}" updated successfully.`);
      } else {
        await performanceRepository.createKpi({
          indicator: kpiIndicator,
          jobTitleId: parsedJobTitleId,
          jobTitleName: resolvedJobTitleName,
          minRating: kpiMinRating,
          maxRating: kpiMaxRating,
          weight: kpiWeight,
          isActive: true,
        });
        showSuccess(`KPI "${kpiIndicator}" created and saved to library.`);
      }
      setIsKpiModalOpen(false);
      await loadData();
    } catch (err: any) {
      const msg = resolveErrorMessage(err, 'Failed to save KPI.');
      setModalError(msg);
      showError(msg);
    }
  };

  const handleDeleteKpi = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this KPI?')) return;
    try {
      await performanceRepository.deleteKpi(id);
      showSuccess('KPI deactivated from library.');
      await loadData();
    } catch (err: any) {
      showError(resolveErrorMessage(err, 'Unable to deactivate KPI.'));
    }
  };

  const totalAssignedWeight = useMemo(
    () =>
      assignedKpiIds.reduce((sum, id) => {
        const kpi = kpis.find((item) => item.id === id);
        return sum + Number(assignedWeights[id] ?? kpi?.weight ?? 0);
      }, 0),
    [assignedKpiIds, assignedWeights, kpis]
  );

  const totalActiveLibraryWeight = useMemo(
    () =>
      kpis
        .filter((k) => k.isActive !== false)
        .reduce((sum, k) => sum + Number(k.weight ?? 0), 0),
    [kpis]
  );

  // Initiate Review Handler
  const handleInitiateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const emp = employees.find((item) => String(item.id) === String(targetEmployeeId));
    if (!emp) {
      setModalError('Please select a valid employee.');
      return;
    }

    const selectedKpis = kpis.filter((k) => assignedKpiIds.includes(k.id));
    if (selectedKpis.length === 0) {
      setModalError('Assign at least one KPI deliverable whose weight sums to 100%.');
      return;
    }
    if (Math.abs(totalAssignedWeight - 100) > 0.01) {
      setModalError(`Assigned KPI weights must sum to exactly 100% (currently ${totalAssignedWeight.toFixed(1)}%).`);
      return;
    }

    const rawReviewerId = targetReviewerId || emp.managerId || currentUser.employeeId || currentUser.id;
    if (!rawReviewerId) {
      setModalError('Select a valid evaluating manager / supervisor employee.');
      return;
    }

    const reviewerEmp = employees.find((item) => String(item.id) === String(rawReviewerId));
    const employeeIdPayload = Number.isFinite(Number(emp.id)) ? Number(emp.id) : (emp.id as any);
    const reviewerIdPayload = Number.isFinite(Number(rawReviewerId))
      ? Number(rawReviewerId)
      : (rawReviewerId as any);

    try {
      await performanceRepository.createReview({
        employeeId: employeeIdPayload,
        employeeName: emp.fullName,
        employeeStaffId: emp.staffId,
        reviewerId: reviewerIdPayload,
        reviewerName: reviewerEmp?.fullName || currentUser.name,
        reviewPeriodStart,
        reviewPeriodEnd,
        dueDate: reviewDueDate,
        kpis: selectedKpis.map((k) => ({
          kpiId: Number(k.id),
          title: k.indicator,
          weight: Number(assignedWeights[k.id] ?? k.weight ?? 0),
        })),
      });

      showSuccess(`Performance review initiated for ${emp.fullName} (Total KPI Weight: 100%).`);
      setIsInitiateReviewModalOpen(false);
      await loadData();
    } catch (err: any) {
      const msg = resolveErrorMessage(err, 'Unable to initiate appraisal.');
      setModalError(msg);
      showError(msg);
    }
  };

  // Scoring Handlers
  const handleOpenScoringModal = (rev: PerformanceReview) => {
    setModalError(null);
    setSelectedReviewForScoring(rev);
    const initialScores: Record<number, ScoringItemState> = {};

    if (rev.ratings && rev.ratings.length > 0) {
      rev.ratings.forEach((r, idx) => {
        const linked = r.kpiId ? kpis.find((k) => k.id === r.kpiId) : undefined;
        const minR = Number(linked?.minRating ?? 1);
        const maxR = Number(linked?.maxRating ?? 5);
        const rawWeight = r.weight !== undefined && r.weight !== null ? Number(r.weight) : Number(linked?.weight ?? 0);
        const defaultScore = r.rating && Number(r.rating) > 0 ? Number(r.rating) : Math.min(maxR, Math.max(minR, 4));
        initialScores[idx] = {
          kpiId: r.kpiId ?? undefined,
          score: defaultScore,
          comment: r.comment || '',
          weight: rawWeight > 0 ? rawWeight : Math.round((100 / rev.ratings!.length) * 100) / 100,
          title: r.kpiTitle || linked?.indicator || `Deliverable #${idx + 1}`,
          minRating: minR,
          maxRating: maxR,
        };
      });
    } else {
      const activeKpis = kpis.filter((k) => k.isActive !== false);
      const activeSum = activeKpis.reduce((acc, k) => acc + Number(k.weight ?? 0), 0);
      if (activeKpis.length > 0 && Math.abs(activeSum - 100) < 0.01) {
        activeKpis.forEach((k, idx) => {
          const minR = Number(k.minRating ?? 1);
          const maxR = Number(k.maxRating ?? 5);
          initialScores[idx] = {
            kpiId: k.id,
            score: Math.min(maxR, Math.max(minR, 4)),
            comment: 'Consistent execution and reliable support.',
            weight: Number(k.weight),
            title: k.indicator,
            minRating: minR,
            maxRating: maxR,
          };
        });
      } else {
        const defaultDeliverables = [
          { title: 'Core Functionality Delivery & SOP Compliance', weight: 40 },
          { title: 'Citadel Core Values & Integrity in Ministry', weight: 20 },
          { title: 'Punctuality, Attendance & Responsiveness', weight: 20 },
          { title: 'Leadership & Team Collaboration', weight: 20 },
        ];
        defaultDeliverables.forEach((d, idx) => {
          initialScores[idx] = {
            score: 4,
            comment: 'Consistent execution and reliable support.',
            weight: d.weight,
            title: d.title,
            minRating: 1,
            maxRating: 5,
          };
        });
      }
    }

    setScoringRatings(initialScores);
    setScoringReviewerComments(
      rev.reviewerComments ||
        'Demonstrates strong dedication to ministry excellence and thorough execution of functional responsibilities.'
    );
  };

  const liveTotalScoringWeight = useMemo(
    () => Object.values(scoringRatings).reduce((sum, item) => sum + Number(item.weight || 0), 0),
    [scoringRatings]
  );

  // Calculate live weighted score
  const liveWeightedScore = useMemo(() => {
    const items = Object.values(scoringRatings);
    if (items.length === 0) return '0.00';
    const totalWeighted = items.reduce((sum, item) => sum + Number(item.score) * Number(item.weight), 0);
    const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);
    return totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(2) : '0.00';
  }, [scoringRatings]);

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewForScoring) return;
    setModalError(null);

    const items = Object.values(scoringRatings);
    if (Math.abs(liveTotalScoringWeight - 100) > 0.01) {
      setModalError(`Evaluation KPI weights must total 100% (currently ${liveTotalScoringWeight.toFixed(1)}%).`);
      return;
    }

    for (const item of items) {
      if (item.score < item.minRating || item.score > item.maxRating) {
        setModalError(`Score for "${item.title}" must be between ${item.minRating} and ${item.maxRating}.`);
        return;
      }
    }

    setIsSubmittingScore(true);
    try {
      const ratingsPayload: ReviewRating[] = items.map((item) => ({
        ...(item.kpiId ? { kpiId: item.kpiId } : {}),
        kpiTitle: item.title,
        rating: item.score,
        weight: item.weight,
        comment: item.comment,
      }));

      await performanceRepository.evaluateReview(selectedReviewForScoring.id, {
        ratings: ratingsPayload,
        reviewerComments: scoringReviewerComments,
        version: selectedReviewForScoring.version,
      });

      showSuccess(`Appraisal scored successfully! Final weighted score: ${liveWeightedScore} / 5.0`);
      setSelectedReviewForScoring(null);
      await loadData();
    } catch (err: any) {
      const msg = resolveErrorMessage(err, 'Failed to submit appraisal evaluation.');
      setModalError(msg);
      showError(msg);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleApproveReview = async (rev: PerformanceReview) => {
    try {
      await performanceRepository.approveReview(rev.id, rev.version);
      showSuccess('Appraisal formally approved and archived into employee profile record.');
      await loadData();
    } catch (err: any) {
      showError(resolveErrorMessage(err, 'Unable to finalize appraisal approval.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#083E34]" />
            <span>Performance &amp; Appraisal Management</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Key Performance Indicators (KPIs), Manager Goal Setting, Weighted Appraisal Scoring &amp; Review History.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'reviews' ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Appraisals &amp; Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('kpis')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'kpis' ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              KPI Library ({kpis.length})
            </button>
            <button
              onClick={() => setActiveTab('framework')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'framework' ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CGCC Appraisal Framework
            </button>
            <button
              onClick={() => setActiveTab('okrs')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'okrs' ? 'bg-[#D4AF37] text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Strategic OKRs
            </button>
          </div>

          {canInitiateAppraisal && (
            <button
              onClick={() => {
                setModalError(null);
                setIsInitiateReviewModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#083E34] hover:bg-[#062c25] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Appraisal</span>
            </button>
          )}
        </div>
      </div>

      {checkinFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{checkinFeedback}</span>
        </div>
      )}

      {errorBanner && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadData()}
              className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-800 hover:bg-rose-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Data</span>
            </button>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: REVIEWS & APPRAISALS */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Active Appraisal Cycles &amp; Employee Scoring</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Managers score deliverables against job descriptions with comments. Overall scores are dynamically calculated using weighted averages.
              </p>
            </div>
            {canInitiateAppraisal && (
              <button
                onClick={() => {
                  setModalError(null);
                  setIsInitiateReviewModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Employee Review</span>
              </button>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No active appraisal reviews in queue.</p>
              <p className="text-[11px] text-slate-500 mt-1">Initiate a review or assign KPIs to employees to begin the evaluation cycle.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => {
                const isAssignedReviewer =
                  Boolean(currentUser.employeeId) &&
                  String(rev.reviewerId) === String(currentUser.employeeId);
                const canScore =
                  (rev.status === 'IN_PROGRESS' || rev.status === 'SUBMITTED') &&
                  (isHrOrAdmin || isAssignedReviewer || currentRole === 'MANAGER');
                const canApprove = (rev.status === 'EVALUATED' || rev.status === 'SUBMITTED') && isHrOrAdmin;

                return (
                  <div key={rev.id} className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{rev.employeeName || `Employee #${rev.employeeId}`}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                            Period: {rev.reviewPeriodStart} to {rev.reviewPeriodEnd}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            Due: {rev.dueDate}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Evaluating Manager: <strong className="text-slate-800 font-semibold">{rev.reviewerName || 'Supervisor / Dept Head'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {rev.finalRating !== null && rev.finalRating !== undefined && (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 shadow-2xs">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>Weighted Score: {rev.finalRating.toFixed(2)} / 5.0</span>
                          </div>
                        )}
                        <Badge variant={rev.status === 'APPROVED' ? 'success' : rev.status === 'EVALUATED' ? 'info' : 'warning'}>
                          {rev.status}
                        </Badge>
                      </div>
                    </div>

                    {/* KPI Ratings preview */}
                    {rev.ratings && rev.ratings.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {rev.ratings.map((r, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-slate-800 block truncate">
                                {r.kpiTitle}{' '}
                                {r.weight !== undefined && r.weight !== null && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-700">({Number(r.weight)}%)</span>
                                )}
                              </span>
                              {r.comment && <span className="text-[11px] text-slate-500 block truncate italic font-medium">"{r.comment}"</span>}
                            </div>
                            <span className="font-black text-slate-900 shrink-0 font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200">
                              {r.rating > 0 ? `${r.rating} ★` : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {rev.reviewerComments && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                        <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">Manager Feedback &amp; Justification:</span>
                        <p className="text-slate-700 italic">"{rev.reviewerComments}"</p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Record ID: REV-2026-{rev.id} {rev.version ? `• v${rev.version}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {canScore && (
                          <button
                            onClick={() => handleOpenScoringModal(rev)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#083E34] hover:bg-[#062c25] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Score KPIs &amp; Add Justification</span>
                          </button>
                        )}
                        {canApprove && (
                          <button
                            onClick={() => handleApproveReview(rev)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>HR Final Sign-off</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KPI LIBRARY */}
      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#083E34]" />
                <span>Organizational KPI &amp; Goal Library</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardized performance indicators aligned with CGCC job descriptions, evaluation scales, and percentage weights.
              </p>
              <p className={`text-[11px] font-bold mt-1.5 ${Math.abs(totalActiveLibraryWeight - 100) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>
                Active Library Weight Total: {totalActiveLibraryWeight.toFixed(0)}%{' '}
                {Math.abs(totalActiveLibraryWeight - 100) < 0.01 ? '(Balanced at 100%)' : '(Adjust weights during appraisal initiation to total 100%)'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={kpiRoleFilter}
                onChange={(e) => setKpiRoleFilter(e.target.value)}
                data-testid="kpi-role-filter"
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#083E34]"
              >
                <option value="ALL">All Job Descriptions / Roles</option>
                {jobTitles.map((jt) => (
                  <option key={jt.id} value={String(jt.id)}>
                    {jt.title}
                  </option>
                ))}
              </select>
              {isHrOrAdmin && (
                <button
                  onClick={handleOpenCreateKpi}
                  data-testid="create-kpi-btn"
                  className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New KPI</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis
              .filter((k) =>
                kpiRoleFilter === 'ALL'
                  ? true
                  : !k.jobTitleId || String(k.jobTitleId) === String(kpiRoleFilter)
              )
              .map((kpi) => (
              <div key={kpi.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Weight: {kpi.weight ?? 25}%
                    </span>
                    <Badge variant={kpi.isActive !== false ? 'success' : 'neutral'}>
                      {kpi.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">{kpi.indicator}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Rating Scale: <strong className="text-slate-800 font-mono">{kpi.minRating ?? 1}.0</strong> to <strong className="text-slate-800 font-mono">{kpi.maxRating ?? 5}.0 Stars</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Job Description / Role:{' '}
                    <span className="text-[#083E34] font-semibold">
                      {kpi.jobTitle?.name || kpi.jobTitleName || 'All Functional Roles'}
                    </span>
                  </p>
                </div>

                {isHrOrAdmin && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditKpi(kpi)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Edit KPI"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteKpi(kpi.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                      title="Deactivate KPI"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CGCC APPRAISAL FRAMEWORK */}
      {activeTab === 'framework' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#083E34]" />
              <span>The Citadel Global Community Church — Appraisal Criteria &amp; Sections</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              This structure directly reflects the CGCC Appraisal Document provided by People, Culture &amp; Change (PCCM).
              Appraisals are conducted bi-annually and calibrated against the 4 core pillars below:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Section A */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Section A • Weight: 20%
                </span>
                <Badge variant="citadel">Foundational</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Core Values &amp; Ministry Alignment</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates demonstration of Citadel core values: Spiritual devotion, high personal integrity, respect for ministry hierarchy, and Christ-like leadership in service delivery.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 pt-1 list-disc list-inside">
                <li>Faith, Prayer &amp; Spiritual Alignment</li>
                <li>Integrity, Honesty &amp; Ethical Stewardship</li>
                <li>Excellence in Ministry Operations</li>
              </ul>
            </div>

            {/* Section B */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Section B • Weight: 40%
                </span>
                <Badge variant="success">Core Weight</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Functional Deliverables &amp; Job Description KPIs</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scoring of role-specific deliverables directly extracted from the staff member's official Job Description and agreed quarterly KPIs.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 pt-1 list-disc list-inside">
                <li>Quality and timeliness of deliverables</li>
                <li>Adherence to Department SOPs &amp; Service SLAs</li>
                <li>Operational problem-solving &amp; proactive execution</li>
              </ul>
            </div>

            {/* Section C */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#083E34] uppercase tracking-wider bg-[#EBF5F2] px-2 py-0.5 rounded border border-[#A3D4C7]/60">
                  Section C · Weight: 20%
                </span>
                <Badge variant="info">Behavioral</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Leadership, Collaboration &amp; Diligence</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Team synergy, cross-departmental collaboration (e.g. CSOG, Holdings, CGCC Shared Services), attendance discipline, and responsiveness to leadership directives.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 pt-1 list-disc list-inside">
                <li>Biometric punctuality &amp; working hours adherence (9am - 4pm)</li>
                <li>Interpersonal communication &amp; team morale</li>
                <li>Adaptability to organizational changes</li>
              </ul>
            </div>

            {/* Section D */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wider bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#F2E4B8]">
                  Section D · Weight: 20%
                </span>
                <Badge variant="neutral">Growth</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Personal Growth &amp; Development Plan</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identification of training needs, professional certifications (CIPM, ICAN, IT certifications), and agreed milestones for the subsequent appraisal cycle.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 pt-1 list-disc list-inside">
                <li>Agreed skills training goals with manager</li>
                <li>Participation in CGCC leadership seminars</li>
                <li>Long-term career progression in Citadel ecosystem</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STRATEGIC OKRS */}
      {activeTab === 'okrs' && (
        <div className="space-y-4">
          {[
            {
              title: 'Digital Systems & Biometric Optimization',
              category: 'Organizational Excellence',
              progress: 85,
              dueDate: 'Q4 2026',
              keyResults: [
                'Complete ZKTeco device integration across all 3 Citadel gates',
                'Achieve 95% self-service adoption on Citadel People Hub',
              ],
            },
            {
              title: 'PCCM Policy Harmonization & Employee Handbook',
              category: 'People & Culture',
              progress: 70,
              dueDate: 'Q4 2026',
              keyResults: [
                'Publish updated Leave and Ethics charters for CGCC and CSOG',
                'Conduct orientation workshops for Citadel Holdings retail heads',
              ],
            },
            {
              title: 'Leadership Development & Capacity Building',
              category: 'Talent Growth',
              progress: 60,
              dueDate: 'Q1 2027',
              keyResults: [
                'Conduct 3 supervisory coaching masterclasses for Dept Heads',
                'Enroll 20 high-potential candidates into School of Government executive tracks',
              ],
            },
          ].map((obj, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">{obj.category}</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{obj.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-[#083E34]">{obj.progress}%</span>
                  <span className="text-[10px] text-slate-500 block font-mono">Target: {obj.dueDate}</span>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-[#083E34] h-2 rounded-full transition-all" style={{ width: `${obj.progress}%` }}></div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-700 block">Key Results:</span>
                {obj.keyResults.map((kr, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{kr}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT KPI */}
      {isKpiModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingKpiId ? 'Edit KPI Indicator' : 'Create New KPI'}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsKpiModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-[#083E34] text-white flex items-center justify-between border-b border-emerald-950/30">
              <div>
                <h3 className="text-base font-bold text-white">{editingKpiId ? 'Edit KPI Indicator' : 'Create New KPI'}</h3>
                <p className="text-xs text-emerald-100/90">Define measurable indicators based on job descriptions.</p>
              </div>
              <button
                type="button"
                aria-label="Close KPI modal"
                onClick={() => setIsKpiModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block text-slate-800 font-bold mb-1">Performance Indicator / Goal *</label>
                <textarea
                  rows={2}
                  required
                  value={kpiIndicator}
                  onChange={(e) => setKpiIndicator(e.target.value)}
                  placeholder="e.g. Ensure 99.5% biometric attendance synchronisation across all devices"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Linked Job Description / Role
                </label>
                <select
                  value={kpiJobTitleId}
                  onChange={(e) => {
                    setKpiJobTitleId(e.target.value);
                    const found = jobTitles.find((jt) => String(jt.id) === e.target.value);
                    setKpiJobRole(found ? found.title : 'All Roles / General');
                  }}
                  data-testid="kpi-job-title-select"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:border-[#083E34]"
                >
                  <option value="">All Roles / General Organizational KPI</option>
                  {jobTitles.map((jt) => (
                    <option key={jt.id} value={String(jt.id)}>
                      {jt.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aligns this KPI with a specific job description so managers evaluate employees against role expectations.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Min Rating (Stars)</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={kpiMinRating}
                    onChange={(e) => setKpiMinRating(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Max Rating (Stars)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={kpiMaxRating}
                    onChange={(e) => setKpiMaxRating(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Appraisal Weight Percentage (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={kpiWeight}
                  onChange={(e) => setKpiWeight(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-[#083E34]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKpiModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl transition shadow-xs"
                >
                  {editingKpiId ? 'Save Changes' : 'Create KPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INITIATE APPRAISAL REVIEW */}
      {isInitiateReviewModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Initiate Employee Appraisal"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsInitiateReviewModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-[#083E34] text-white flex items-center justify-between border-b border-emerald-950/30">
              <div>
                <h3 className="text-base font-bold text-white">Initiate Employee Appraisal</h3>
                <p className="text-xs text-emerald-100/90">Assign review cycle and job-specific KPIs to an employee.</p>
              </div>
              <button
                type="button"
                aria-label="Close appraisal modal"
                onClick={() => setIsInitiateReviewModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateReview} className="p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              {modalError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Select Employee *</label>
                  <select
                    value={targetEmployeeId}
                    onChange={(e) => handleSelectTargetEmployee(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.staffId}) • {emp.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Evaluating Supervisor *</label>
                  <select
                    value={targetReviewerId}
                    onChange={(e) => setTargetReviewerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.staffId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={reviewPeriodStart}
                    onChange={(e) => setReviewPeriodStart(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={reviewPeriodEnd}
                    onChange={(e) => setReviewPeriodEnd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Appraisal Due Date</label>
                <input
                  type="date"
                  required
                  value={reviewDueDate}
                  onChange={(e) => setReviewDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-800 font-bold">Assign Deliverables / KPIs &amp; Weights (Must Sum to 100%)</label>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                      Math.abs(totalAssignedWeight - 100) < 0.01
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    Total: {totalAssignedWeight.toFixed(0)}% / 100%
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                  {kpis.filter((k) => k.isActive !== false).map((k) => {
                    const checked = assignedKpiIds.includes(k.id);
                    const weightVal = assignedWeights[k.id] ?? Number(k.weight ?? 25);
                    return (
                      <div key={k.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white transition">
                        <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedKpiIds([...assignedKpiIds, k.id]);
                                setAssignedWeights((prev) => ({ ...prev, [k.id]: prev[k.id] ?? Number(k.weight ?? 25) }));
                              } else {
                                setAssignedKpiIds(assignedKpiIds.filter((id) => id !== k.id));
                              }
                            }}
                            className="rounded border-slate-300 text-[#083E34] focus:ring-[#083E34]"
                          />
                          <span className="text-slate-800 font-medium truncate">{k.indicator}</span>
                        </label>
                        {checked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              step="0.5"
                              value={weightVal}
                              onChange={(e) =>
                                setAssignedWeights((prev) => ({
                                  ...prev,
                                  [k.id]: Number(e.target.value),
                                }))
                              }
                              aria-label={`Weight for ${k.indicator}`}
                              className="w-16 p-1 rounded border border-slate-300 text-right font-mono font-bold bg-white"
                            />
                            <span className="text-slate-500 font-bold">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInitiateReviewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#C59B27] text-slate-950 font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Initiate Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EVALUATE & SCORE APPRAISAL (Manager Scoring with Justifications & Weighted Calculation) */}
      {selectedReviewForScoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#083E34] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Appraisal Evaluation &amp; Scoring</h3>
                <p className="text-xs text-emerald-100">
                  Employee: <strong>{selectedReviewForScoring.employeeName || `Employee #${selectedReviewForScoring.employeeId}`}</strong> • Evaluator: {currentUser.name}
                </p>
              </div>
              <button onClick={() => setSelectedReviewForScoring(null)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitScore} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
              {/* Dynamic Live Score Header */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Calculated Overall Weighted Score:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black text-[#083E34]">{liveWeightedScore}</span>
                    <span className="text-xs text-slate-500 font-bold">/ 5.0 Stars</span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        Math.abs(liveTotalScoringWeight - 100) < 0.01
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      Weight Sum: {liveTotalScoringWeight.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                    {Number(liveWeightedScore) >= 4.5 ? 'Exceptional Exceeds' : Number(liveWeightedScore) >= 3.8 ? 'Strong Performance' : 'Meets Expectations'}
                  </span>
                </div>
              </div>

              {/* Scoring Items */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-1">
                  Deliverable KPI Ratings &amp; Justifications
                </h4>

                {Object.entries(scoringRatings).map(([key, item]) => {
                  const idx = Number(key);
                  const scaleRange = Array.from(
                    { length: Math.max(1, item.maxRating - item.minRating + 1) },
                    (_, i) => item.minRating + i
                  );
                  return (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Weight: {item.weight}%
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-slate-600 font-semibold shrink-0">
                          Score ({item.minRating}-{item.maxRating}):
                        </span>
                        <div className="flex items-center gap-1">
                          {scaleRange.map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                setScoringRatings({
                                  ...scoringRatings,
                                  [idx]: { ...item, score: star },
                                });
                              }}
                              className={`p-1 rounded-md transition cursor-pointer ${
                                item.score >= star ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                              }`}
                            >
                              <Star className={`w-5 h-5 ${item.score >= star ? 'fill-amber-500' : ''}`} />
                            </button>
                          ))}
                        </div>
                        <span className="font-mono font-black text-slate-800 ml-1 text-sm">{item.score}.0</span>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1 text-[11px]">Score Justification / Operational Comments *</label>
                        <input
                          type="text"
                          required
                          value={item.comment}
                          onChange={(e) => {
                            setScoringRatings({
                              ...scoringRatings,
                              [idx]: { ...item, comment: e.target.value },
                            });
                          }}
                          placeholder="Provide specific deliverable evidence or justification..."
                          className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#083E34]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reviewer Overall Summary Comments */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">Overall Appraisal Feedback &amp; Development Recommendations *</label>
                <textarea
                  rows={3}
                  required
                  value={scoringReviewerComments}
                  onChange={(e) => setScoringReviewerComments(e.target.value)}
                  placeholder="Summarize the employee's performance deliverables and areas for development..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReviewForScoring(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingScore}
                  className="px-5 py-2 bg-[#083E34] hover:bg-[#062c25] text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                  <span>{isSubmittingScore ? 'Saving Evaluation...' : 'Save & Submit Appraisal Score'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceView;
