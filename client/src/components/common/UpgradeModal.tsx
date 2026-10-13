import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Stethoscope, Building2, UserCheck, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  action = 'perform this action',
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!isOpen) return null;

  const handleUpgrade = (role: string) => {
    onClose();
    navigate(`/register?role=${role}`);
  };

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF5FF] flex items-center justify-center">
              <span className="text-lg">🔒</span>
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">Professional Account Required</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                To {action}, you need a professional account.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X size={18} />
          </button>
        </div>

        {!isAuthenticated ? (
          /* Not logged in — show login/register options */
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Sign in to your professional account or create one to get full access.
            </p>
            <button
              onClick={handleLogin}
              className="w-full py-2.5 px-4 bg-[#0A66C2] text-white rounded-full text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#0956a8] transition-colors"
            >
              <LogIn size={16} /> Sign In
            </button>
            <p className="text-center text-xs text-gray-500">or create a new account as:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleUpgrade('DOCTOR')}
                className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:border-[#0A66C2] hover:bg-[#EBF5FF] transition-colors text-xs font-semibold text-gray-700"
              >
                <Stethoscope size={22} className="text-[#0A66C2]" />
                Doctor
              </button>
              <button
                onClick={() => handleUpgrade('HOSPITAL_ADMIN')}
                className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:border-[#0A66C2] hover:bg-[#EBF5FF] transition-colors text-xs font-semibold text-gray-700"
              >
                <Building2 size={22} className="text-[#0D9488]" />
                Hospital
              </button>
              <button
                onClick={() => handleUpgrade('RECRUITER')}
                className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:border-[#0A66C2] hover:bg-[#EBF5FF] transition-colors text-xs font-semibold text-gray-700"
              >
                <UserCheck size={22} className="text-amber-600" />
                Recruiter
              </button>
            </div>
          </div>
        ) : (
          /* Logged in as Observer — show upgrade options */
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Your current account is in <strong>Observer mode</strong>. Upgrade to a professional
              role to {action}.
            </p>
            <p className="text-xs text-gray-500">
              It's free — just select your professional role:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleUpgrade('DOCTOR')}
                className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:border-[#0A66C2] hover:bg-[#EBF5FF] transition-colors text-xs font-semibold text-gray-700"
              >
                <Stethoscope size={22} className="text-[#0A66C2]" />
                Doctor
              </button>
              <button
                onClick={() => handleUpgrade('HOSPITAL_ADMIN')}
                className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:border-[#0D9488] hover:bg-teal-50 transition-colors text-xs font-semibold text-gray-700"
              >
                <Building2 size={22} className="text-[#0D9488]" />
                Hospital
              </button>
              <button
                onClick={() => handleUpgrade('RECRUITER')}
                className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors text-xs font-semibold text-gray-700"
              >
                <UserCheck size={22} className="text-amber-600" />
                Recruiter
              </button>
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              You can always explore the platform as an Observer with read-only access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
