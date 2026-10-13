import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const PROFESSIONAL_ROLES = ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'CREDENTIALING_OFFICER', 'SUPER_ADMIN'];

/**
 * Reusable hook to guard professional-only actions.
 * If user is OBSERVER or not logged in, shows UpgradeModal instead.
 *
 * Usage:
 *   const { requirePro, upgradeModal, closeUpgrade } = useProfessionalGuard();
 *   <button onClick={() => requirePro(() => handleApply(job))}>Apply</button>
 *   <UpgradeModal isOpen={upgradeModal} onClose={closeUpgrade} action="apply for jobs" />
 */
export const useProfessionalGuard = () => {
  const { user, isAuthenticated } = useAuth();
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>('');

  const isProfessional =
    isAuthenticated && user && PROFESSIONAL_ROLES.includes(user.role);

  const requirePro = (action: () => void, actionLabel = 'perform this action') => {
    if (isProfessional) {
      action();
    } else {
      setPendingAction(actionLabel);
      setUpgradeModal(true);
    }
  };

  const closeUpgrade = () => setUpgradeModal(false);

  return { requirePro, upgradeModal, closeUpgrade, pendingAction, isProfessional };
};
