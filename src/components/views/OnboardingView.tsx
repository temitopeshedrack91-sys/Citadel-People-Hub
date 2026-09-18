import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  Circle,
  Clock,
  Laptop,
  BookOpen,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { OnboardingJourney } from '../../types';
import { talentRepository, auditRepository } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const OnboardingView: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [journeys, setJourneys] = useState<OnboardingJourney[]>([]);

  const loadData = async () => {
    const list = await talentRepository.getOnboardingJourneys();
    setJourneys(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTask = async (journeyId: string, taskId: string, currentVal: boolean) => {
    const updated = await talentRepository.toggleTaskCompletion(journeyId, taskId, !currentVal);
    setJourneys(journeys.map((j) => (j.id === journeyId ? updated : j)));

    await auditRepository.logAction({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole,
      module: 'Talent & Onboarding',
      action: !currentVal ? 'Completed Onboarding Task' : 'Unchecked Onboarding Task',
      recordAffectedId: journeyId,
      recordAffectedTitle: `Journey for ${updated.employeeName}`,
      previousValue: currentVal ? 'Done' : 'Pending',
      newValue: !currentVal ? 'Done' : 'Pending',
      severity: 'Info',
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#0A1E3F]" />
          <span>Staff Onboarding Journeys</span>
        </h2>
        <p className="text-xs text-slate-500">
          Structured 30-60-90 day orientation checklists covering PCCM induction, IT provisioning, and buddy pairings.
        </p>
      </div>

      <div className="space-y-6">
        {journeys.map((journey) => (
          <div
            key={journey.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
          >
            {/* Journey Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{journey.employeeName}</h3>
                  <span className="text-xs text-slate-400 font-mono">({journey.staffId})</span>
                  <Badge variant={journey.status === 'Completed' ? 'success' : 'citadel'}>
                    {journey.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {journey.jobTitle} • {journey.departmentName} ({journey.entityName})
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                  <span>Start Date: {journey.startDate}</span>
                  <span>•</span>
                  <span>Mentor / Buddy: {journey.mentorBuddyName}</span>
                </div>
              </div>

              {/* Progress Bar & Percentage */}
              <div className="sm:text-right min-w-[140px]">
                <div className="flex items-baseline justify-between sm:justify-end gap-2">
                  <span className="text-xs font-semibold text-slate-600">Progress:</span>
                  <span className="text-base font-bold text-[#0A1E3F]">
                    {journey.overallProgressPercent}%
                  </span>
                </div>
                <div className="mt-1 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#C5A059] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${journey.overallProgressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Tasks Checklist */}
            <div className="p-5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Key Milestones & Verification Steps
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {journey.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(journey.id, task.id, task.isCompleted)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-start gap-3 ${
                      task.isCompleted
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-emerald-600 shrink-0"
                      title={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold ${
                            task.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {task.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Owner: {task.responsibleRole}</span>
                        {task.completedAt && (
                          <span className="text-emerald-700 font-medium">
                            Completed on {task.completedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
