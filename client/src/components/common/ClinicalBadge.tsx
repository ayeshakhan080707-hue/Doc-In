import React from 'react';
import { ShieldCheck, Award } from 'lucide-react';

interface ClinicalBadgeProps {
  isClinicalVerified?: boolean;
  subscriptionTier?: 'FREE' | 'PREMIUM_GOLD';
  size?: 'sm' | 'md' | 'lg';
}

export const ClinicalBadge: React.FC<ClinicalBadgeProps> = ({
  isClinicalVerified,
  subscriptionTier,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 20;

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {/* 1. Official Clinical Verified Badge (Medical Seal / Teal) */}
      {isClinicalVerified && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]"
          title="Clinical Verified: Medical License Authenticated by Credentialing Board"
        >
          <ShieldCheck size={iconSize} className="text-[#137333]" />
          <span>Verified Practitioner</span>
        </span>
      )}

      {/* 2. Premium Gold Membership (Separate from Clinical) */}
      {subscriptionTier === 'PREMIUM_GOLD' && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#FEF9C3] text-[#854D0E] border border-[#FDE047]"
          title="DocIn Premium Gold Member"
        >
          <Award size={iconSize} className="text-[#B06000]" />
          <span>Gold Member</span>
        </span>
      )}
    </div>
  );
};
