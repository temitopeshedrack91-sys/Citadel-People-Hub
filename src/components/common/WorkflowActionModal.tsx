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

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Workflow Action: ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#0B1F3A] text-white shrink-0 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white">Workflow Action</h3>
            <p className="text-xs text-[#D4AF37]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
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
              <span className="px-2 py-0.5 rounded-full font-mono font-medium bg-[#FAF5EB] text-[#B88A24] text-[11px] border border-[#E9D59A]">
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
                        ? 'border-[#174EA6] bg-[#EFF6FF] text-[#174EA6] ring-1 ring-[#174EA6]'
                        : 'border-[#E5E7EB] text-[#64748B] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    {action === 'Approve' && <CheckCircle2 className="w-4 h-4 text-[#174EA6]" />}
                    {action === 'Reject' && <XCircle className="w-4 h-4 text-[#111827]" />}
                    {action === 'Request Correction' && <AlertCircle className="w-4 h-4 text-[#B88A24]" />}
                    {action === 'Cancel' && <X className="w-4 h-4 text-[#64748B]" />}
                    {action === 'Submit' && <RefreshCw className="w-4 h-4 text-[#174EA6]" />}
                    <span>{action}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reviewer Comments & Justification {selectedAction === 'Reject' && <span className="text-[#111827]">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder={`State rationale for ${selectedAction} (will be captured in audit trail and notified to requester)...`}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#174EA6] focus:ring-1 focus:ring-[#174EA6] outline-none"
            />
          </div>

          <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
            <span>Executing as:</span>
            <strong className="text-[#111827]">{currentUser.name}</strong>
            <span>({currentUser.jobTitle})</span>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#F5F7FA] border border-[#111827] text-[#111827] text-xs font-medium">
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
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-[#C59B27] rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
            >
              {isSubmitting ? 'Recording Action...' : `Confirm ${selectedAction}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
