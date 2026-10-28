import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { WorkflowActionType, WorkflowStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface WorkflowActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemDescription: string;
  currentStatus: WorkflowStatus;
  allowedActions: WorkflowActionType[];
  onExecuteAction: (
    action: WorkflowActionType,
    comments: string,
    newStatus: WorkflowStatus
  ) => Promise<void>;
}

export const WorkflowActionModal: React.FC<WorkflowActionModalProps> = ({
  isOpen,
  onClose,
  title,
  itemDescription,
  currentStatus,
  allowedActions,
  onExecuteAction,
}) => {
  const { currentUser } = useAuth();
  const [selectedAction, setSelectedAction] = useState<WorkflowActionType>(allowedActions[0] || 'Approve');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getNewStatus = (action: WorkflowActionType): WorkflowStatus => {
    switch (action) {
      case 'Approve':
        return 'Approved';
      case 'Reject':
        return 'Rejected';
      case 'Request Correction':
        return 'Requires Correction';
      case 'Resubmit':
      case 'Submit':
        return 'Submitted';
      case 'Cancel':
        return 'Cancelled';
      default:
        return currentStatus;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((selectedAction === 'Reject' || selectedAction === 'Request Correction') && !comments.trim()) {
      setError(`Comments/reason is mandatory when executing ${selectedAction}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newStatus = getNewStatus(selectedAction);
      await onExecuteAction(selectedAction, comments, newStatus);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to execute workflow action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#083E34] text-white shrink-0">
          <div>
            <h3 className="text-base font-semibold text-white">Workflow Action</h3>
            <p className="text-xs text-amber-300/90">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            <span className="font-semibold block text-slate-900 mb-1">Item Reference:</span>
            {itemDescription}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-slate-500">Current Status:</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-medium bg-amber-100 text-amber-800 text-[11px] border border-amber-300">
                {currentStatus}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Decision / Action
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allowedActions.map((action) => {
                const isSelected = selectedAction === action;
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setSelectedAction(action)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-[#083E34] bg-[#083E34]/5 text-[#083E34] ring-1 ring-[#083E34]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {action === 'Approve' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {action === 'Reject' && <XCircle className="w-4 h-4 text-rose-600" />}
                    {action === 'Request Correction' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {action === 'Cancel' && <X className="w-4 h-4 text-slate-500" />}
                    {action === 'Submit' && <RefreshCw className="w-4 h-4 text-sky-600" />}
                    <span>{action}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reviewer Comments & Justification {selectedAction === 'Reject' && <span className="text-rose-600">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder={`State rationale for ${selectedAction} (will be captured in audit trail and notified to requester)...`}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#083E34] focus:ring-1 focus:ring-[#083E34] outline-none"
            />
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>Executing as:</span>
            <strong className="text-slate-700">{currentUser.name}</strong>
            <span>({currentUser.jobTitle})</span>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#083E34] hover:bg-[#062f28] rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
            >
              {isSubmitting ? 'Recording Action...' : `Confirm ${selectedAction}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
