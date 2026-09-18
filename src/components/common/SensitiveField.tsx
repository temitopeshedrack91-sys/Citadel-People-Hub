import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SensitiveFieldProps {
  id?: string;
  value: string | number | undefined | null;
  label?: string;
  category: 'salary' | 'bank' | 'pension' | 'address' | 'dateOfBirth' | 'nextOfKin';
  maskedPlaceholder?: string;
  className?: string;
  ownerId?: string; // If the employee owns this record, they may view their own address/DOB
}

export const SensitiveField: React.FC<SensitiveFieldProps> = ({
  id,
  value,
  label,
  category,
  maskedPlaceholder = '••••••••••••',
  className = '',
  ownerId,
}) => {
  const { canViewSensitiveData, currentUser } = useAuth();
  const [isRevealed, setIsRevealed] = useState(false);

  // An employee can view their own address/DOB, but salary/bank is restricted or permitted as per policy
  const isOwner = Boolean(ownerId && currentUser.id === ownerId);
  const isAuthorized = canViewSensitiveData || isOwner;

  if (!value) {
    return <span className="text-slate-400 italic text-xs">Not recorded</span>;
  }

  if (!isAuthorized) {
    return (
      <div id={id} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono select-none ${className}`}>
        <Lock className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Restricted (PCCM Only)</span>
      </div>
    );
  }

  return (
    <div id={id} className={`inline-flex items-center gap-2 group ${className}`}>
      <span className="font-mono text-xs text-slate-800">
        {isRevealed ? String(value) : maskedPlaceholder}
      </span>
      <button
        type="button"
        onClick={() => setIsRevealed(!isRevealed)}
        className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
        title={isRevealed ? 'Mask sensitive data' : 'Reveal sensitive data'}
      >
        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
