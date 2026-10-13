import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, FileText, ScanLine, Users, TrendingUp, Calendar, Award, CheckCircle2, Clock, AlertTriangle, FlaskConical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ClinicalBadge } from '../common/ClinicalBadge';
import { apiClient } from '../../api/client';
import { CredentialDocument } from '../../types';

interface LeftSidebarProps {
  onOpenOcrModal?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onOpenOcrModal }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<{ profileViews: number; connections: number; headline?: string } | null>(null);
  const [credentialDoc, setCredentialDoc] = useState<CredentialDocument | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [analyticsRes, profileRes, credRes, connectionsRes] = await Promise.all([
          apiClient.get('/doctor/analytics').catch(() => ({ data: { data: null } })),
          user?.role === 'DOCTOR' ? apiClient.get('/doctor/me').catch(() => ({ data: { data: null } })) : Promise.resolve(null),
          user?.role === 'DOCTOR' ? apiClient.get('/credentials/my-credentials').catch(() => ({ data: { data: [] } })) : Promise.resolve(null),
          apiClient.get('/network/my-connections').catch(() => ({ data: { data: [] } })),
        ]);
        const profileData = profileRes?.data?.data;
        const credList = credRes?.data?.data || [];
        const connectionsList = connectionsRes?.data?.data || [];
        if (credList.length > 0) {
          setCredentialDoc(credList[0]);
        }
        setAnalytics({
          profileViews: analyticsRes.data.data?.profileViews ?? 0,
          connections: connectionsList.length,
          headline: profileData?.headline,
        });
      } catch {
        setAnalytics({ profileViews: 0, connections: 0 });
      }
    };
    if (user) fetchAnalytics();
  }, [user?.id]);

  return (
    <aside className="w-full md:w-64 flex-shrink-0 space-y-2">
      {/* 1. Main Profile Card */}
      <div className="card-linkedin overflow-hidden text-center pb-3">
        {/* Banner */}
        <div className="h-16 bg-gradient-to-r from-[#0A66C2] via-[#0D9488] to-[#004182] relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        </div>

        {/* Avatar */}
        <div className="relative -mt-10 mb-2 inline-block">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80'}
            alt={user?.fullName || 'Doctor Avatar'}
            className="w-16 h-16 rounded-full border-2 border-white object-cover shadow-sm mx-auto bg-white"
          />
        </div>

        <div className="px-4">
          <Link to="/profile" className="font-semibold text-sm text-[rgba(0,0,0,0.9)] hover:underline block leading-tight">
            {user?.fullName}
          </Link>
          <p className="text-xs text-[rgba(0,0,0,0.6)] mt-1 line-clamp-2">
            {user?.role === 'DOCTOR'
              ? (analytics?.headline || `${user.role.replace('_', ' ')} • DocIn Network`)
              : `${user?.role?.replace('_', ' ')} • DocIn Healthcare Network`}
          </p>

          <div className="mt-2.5 flex justify-center">
            <ClinicalBadge
              isClinicalVerified={user?.isClinicalVerified}
              subscriptionTier={user?.subscriptionTier}
              size="sm"
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.08)] px-4 text-left text-xs space-y-2">
          <Link to="/profile" className="flex justify-between items-center text-[rgba(0,0,0,0.6)] hover:bg-[#F3F2EF] -mx-4 px-4 py-1 transition-colors">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={13} />
              Profile viewers
            </span>
            <span className="font-bold text-[#0A66C2]">{analytics?.profileViews ?? '—'}</span>
          </Link>

          <Link to="/network" className="flex justify-between items-center text-[rgba(0,0,0,0.6)] hover:bg-[#F3F2EF] -mx-4 px-4 py-1 transition-colors">
            <span className="flex items-center gap-1.5">
              <Users size={13} />
              Colleague connections
            </span>
            <span className="font-bold text-[#0A66C2]">{analytics?.connections ?? '—'}</span>
          </Link>
        </div>

        {/* OCR Action Trigger for Doctors — Status Aware */}
        {user?.role === 'DOCTOR' && (
          <div className="mt-3 px-3">
            {user?.isClinicalVerified || credentialDoc?.verificationStatus === 'APPROVED' ? (
              <div className="w-full py-1.5 px-3 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Clinical Verified Doctor ✓</span>
              </div>
            ) : credentialDoc?.verificationStatus === 'SUBMITTED' || credentialDoc?.verificationStatus === 'UNDER_REVIEW' ? (
              <button
                onClick={onOpenOcrModal}
                className="w-full py-1.5 px-3 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                title="Your document has been submitted and is currently pending review by a Credentialing Officer"
              >
                <Clock size={14} className="text-amber-600 animate-pulse" />
                <span>Submitted: Pending Verification ⏳</span>
              </button>
            ) : credentialDoc?.verificationStatus === 'REJECTED' ? (
              <button
                onClick={onOpenOcrModal}
                className="w-full py-1.5 px-3 rounded-md bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                title={credentialDoc.rejectionReason || 'Verification rejected. Click to resubmit.'}
              >
                <AlertTriangle size={14} className="text-rose-600" />
                <span>Verification Failed • Resubmit ↻</span>
              </button>
            ) : onOpenOcrModal ? (
              <button
                onClick={onOpenOcrModal}
                className="w-full py-1.5 px-3 rounded-md bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] text-xs font-semibold hover:bg-[#CCFBF1] transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ScanLine size={14} className="text-[#0D9488]" />
                <span>Scan & Verify Credentials (AI OCR)</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* 2. Shortcuts Card */}
      <div className="card-linkedin p-3 text-xs space-y-2 hidden md:block">
        <p className="font-bold text-[rgba(0,0,0,0.6)] text-[11px] uppercase tracking-wider">Clinical Shortcuts</p>
        <Link to="/network" className="flex items-center gap-2 text-[rgba(0,0,0,0.8)] hover:text-[#0A66C2] py-1 font-medium">
          <Users size={14} /><span>My Network</span>
        </Link>
        <Link to="/groups" className="flex items-center gap-2 text-[rgba(0,0,0,0.8)] hover:text-[#0A66C2] py-1 font-medium">
          <Users size={14} /><span>Medical Groups</span>
        </Link>
        <Link to="/events" className="flex items-center gap-2 text-[rgba(0,0,0,0.8)] hover:text-[#0A66C2] py-1 font-medium">
          <Calendar size={14} /><span>Events & Conferences</span>
        </Link>
        <Link to="/jobs" className="flex items-center gap-2 text-[rgba(0,0,0,0.8)] hover:text-[#0A66C2] py-1 font-medium">
          <FileText size={14} /><span>Fellowships & Jobs</span>
        </Link>
        {user?.role === 'DOCTOR' && (
          <Link to="/cme" className="flex items-center gap-2 text-[rgba(0,0,0,0.8)] hover:text-[#0A66C2] py-1 font-medium">
            <Award size={14} /><span>CME Credits</span>
          </Link>
        )}
        <Link to="/saved" className="flex items-center gap-2 text-[rgba(0,0,0,0.8)] hover:text-[#0A66C2] py-1 font-medium">
          <Bookmark size={14} /><span>Saved Clinical Cases</span>
        </Link>
        {user?.role === 'DOCTOR' && (
          <Link to="/drug-library" className="flex items-center gap-2 text-[rgba(0,0,0,0.8)] hover:text-[#0D9488] py-1 font-medium">
            <FlaskConical size={14} className="text-[#0D9488]" /><span>Drug Library</span>
          </Link>
        )}
      </div>
    </aside>
  );
};
