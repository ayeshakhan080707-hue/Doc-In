import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Building2, GraduationCap, MapPin,
  Stethoscope, UserPlus, MessageSquare,
  Loader2, Award, CheckCircle2, Briefcase, UserCheck,
  Calendar, FileText, Clock,
} from 'lucide-react';
import { ClinicalBadge } from '../../components/common/ClinicalBadge';
import { UpgradeModal } from '../../components/common/UpgradeModal';
import { PostCard } from '../../components/feed/PostCard';
import { useProfessionalGuard } from '../../hooks/useProfessionalGuard';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Post } from '../../types';

// ── Role-specific profile sections ─────────────────────────────────────────
const DoctorSections: React.FC<{ profile: any; userInfo: any }> = ({ profile, userInfo }) => (
  <>
    {profile?.about && (
      <div className="card-linkedin p-5">
        <h2 className="font-bold text-sm text-gray-900 mb-2">About</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{profile.about}</p>
      </div>
    )}

    <div className="card-linkedin p-5">
      <h2 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
        <Award size={16} className="text-amber-600" /> Specialization
      </h2>
      <div className="flex flex-wrap gap-2 text-xs">
        {profile?.specialization && (
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 font-semibold border border-blue-200">
            {profile.specialization}
          </span>
        )}
        {profile?.subSpecialties?.map((sub: string, i: number) => (
          <span key={i} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">{sub}</span>
        ))}
        {(profile?.yearsOfExperience ?? 0) > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-800 font-medium border border-green-200">
            {profile.yearsOfExperience}+ Years
          </span>
        )}
      </div>
    </div>

    {profile?.medicalLicenseNumber && (
      <div className="card-linkedin p-5">
        <h2 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#0D9488]" /> Medical License
        </h2>
        <div className="p-3 bg-teal-50/40 border border-teal-200/80 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">{profile.licensingBody || 'Medical Licensing Board'}</p>
            <p className="font-mono font-bold text-sm text-gray-900 mt-0.5">{profile.medicalLicenseNumber}</p>
          </div>
          {userInfo?.isClinicalVerified && <CheckCircle2 size={22} className="text-[#137333]" />}
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {profile?.hospitalAffiliations?.length > 0 && (
        <div className="card-linkedin p-5 space-y-3">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Building2 size={16} className="text-[#0A66C2]" /> Affiliations
          </h2>
          {profile.hospitalAffiliations.map((aff: any, i: number) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <div className="w-9 h-9 rounded-md bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold flex-shrink-0">
                {(aff.hospitalName || 'H').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{aff.hospitalName}</p>
                <p className="text-gray-500">{aff.position} • {aff.isCurrent ? 'Current' : 'Former'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {profile?.procedures?.length > 0 && (
        <div className="card-linkedin p-5 space-y-3">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Stethoscope size={16} className="text-[#0D9488]" /> Procedures
          </h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {profile.procedures.map((p: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-200">{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>

    {profile?.education?.length > 0 && (
      <div className="card-linkedin p-5 space-y-3">
        <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
          <GraduationCap size={16} className="text-[#0A66C2]" /> Education
        </h2>
        {profile.education.map((edu: any, i: number) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={16} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{edu.degree}</p>
              <p className="text-gray-500">{edu.institution} • {edu.year}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);

const RecruiterSections: React.FC<{ profile: any; userInfo: any }> = ({ profile }) => (
  <>
    {profile?.about && (
      <div className="card-linkedin p-5">
        <h2 className="font-bold text-sm text-gray-900 mb-2">About</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{profile.about}</p>
      </div>
    )}
    <div className="card-linkedin p-5">
      <h2 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
        <Briefcase size={16} className="text-[#B06000]" /> Talent Acquisition
      </h2>
      <div className="flex flex-wrap gap-2 text-xs">
        {profile?.specialization && (
          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
            {profile.specialization}
          </span>
        )}
        {(profile?.yearsOfExperience ?? 0) > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-800 border border-green-200">
            {profile.yearsOfExperience}+ Years Experience
          </span>
        )}
      </div>
    </div>
    {profile?.hospitalAffiliations?.length > 0 && (
      <div className="card-linkedin p-5 space-y-3">
        <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
          <Building2 size={16} className="text-[#0A66C2]" /> Organizations
        </h2>
        {profile.hospitalAffiliations.map((aff: any, i: number) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <div className="w-9 h-9 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
              {(aff.hospitalName || 'O').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{aff.hospitalName}</p>
              <p className="text-gray-500">{aff.position} • {aff.isCurrent ? 'Current' : 'Former'}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);

const HospitalSections: React.FC<{ profile: any; userInfo: any }> = ({ profile }) => (
  <>
    {profile?.about && (
      <div className="card-linkedin p-5">
        <h2 className="font-bold text-sm text-gray-900 mb-2">About</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{profile.about}</p>
      </div>
    )}
    <div className="card-linkedin p-5">
      <h2 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
        <Building2 size={16} className="text-[#0A66C2]" /> Institution Details
      </h2>
      <div className="space-y-2 text-sm text-gray-700">
        {profile?.specialization && (
          <div className="flex items-center gap-2">
            <Stethoscope size={14} className="text-gray-400" />
            <span>{profile.specialization}</span>
          </div>
        )}
        {profile?.city && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-gray-400" />
            <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {(profile?.yearsOfExperience ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <span>Est. {new Date().getFullYear() - profile.yearsOfExperience}</span>
          </div>
        )}
      </div>
    </div>
    {profile?.procedures?.length > 0 && (
      <div className="card-linkedin p-5 space-y-3">
        <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
          <Stethoscope size={16} className="text-[#0D9488]" /> Services Offered
        </h2>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {profile.procedures.map((p: string, i: number) => (
            <span key={i} className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">{p}</span>
          ))}
        </div>
      </div>
    )}
    {profile?.education?.length > 0 && (
      <div className="card-linkedin p-5 space-y-3">
        <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
          <FileText size={16} className="text-[#0A66C2]" /> Accreditations
        </h2>
        {profile.education.map((edu: any, i: number) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{edu.degree}</p>
              <p className="text-gray-500">{edu.institution} • {edu.year}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);

// ── Banner gradient by role ─────────────────────────────────────────────────
const ROLE_GRADIENT: Record<string, string> = {
  DOCTOR: 'from-[#0A66C2] via-[#0D9488] to-[#004182]',
  HOSPITAL_ADMIN: 'from-[#004182] via-[#0A66C2] to-[#0D9488]',
  RECRUITER: 'from-[#7C4A00] via-[#B06000] to-[#0A66C2]',
};

// ── Main Page ──────────────────────────────────────────────────────────────
export const PublicDoctorProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { requirePro, upgradeModal, closeUpgrade, pendingAction } = useProfessionalGuard();

  const [userInfo, setUserInfo] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/doctor/public/${userId}`);
        const { user: u, profile: p, posts: ps } = res.data.data;
        setUserInfo(u);
        setProfile(p);
        setPosts(ps || []);

        // Check connection status if authenticated
        if (isAuthenticated) {
          const [sentRes, conRes] = await Promise.all([
            apiClient.get('/network/sent').catch(() => ({ data: { data: {} } })),
            apiClient.get('/network/my-connections').catch(() => ({ data: { data: [] } })),
          ]);
          const sentMap: Record<string, string> = sentRes.data.data || {};
          const connections: any[] = conRes.data.data || [];

          if (sentMap[userId]) {
            setConnectionStatus('pending');
          } else if (connections.some((c: any) =>
            c.connectedUser?._id === userId ||
            c.connectedUser?._id?.toString() === userId
          )) {
            setConnectionStatus('connected');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId, isAuthenticated]);

  const handleConnect = async () => {
    requirePro(async () => {
      if (connectionStatus !== 'none' || !userId) return;
      setSendingRequest(true);
      try {
        await apiClient.post('/network/request', { recipientId: userId });
        setConnectionStatus('pending');
      } catch (err) {
        console.error(err);
      } finally {
        setSendingRequest(false);
      }
    }, 'connect with professionals');
  };

  const handleMessage = () => {
    requirePro(() => navigate(`/messaging?userId=${userId}`), 'send messages');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#0A66C2]" />
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  const role: string = userInfo.role || 'DOCTOR';
  const displayName = profile?.fullName || userInfo.fullName;
  const headline = profile?.headline || `${role.replace(/_/g, ' ')} | DocIn Healthcare Network`;
  const city = profile?.city;
  const country = profile?.country;
  const isOwnProfile = isAuthenticated && user?.id === userId;
  const gradient = ROLE_GRADIENT[role] || ROLE_GRADIENT.DOCTOR;

  const roleIcon =
    role === 'RECRUITER' ? <Briefcase size={14} className="text-amber-600" /> :
    role === 'HOSPITAL_ADMIN' ? <Building2 size={14} className="text-[#0A66C2]" /> :
    <Stethoscope size={14} className="text-[#0D9488]" />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
      {/* ── Hero ── */}
      <div className="card-linkedin overflow-hidden">
        <div className={`h-36 bg-gradient-to-r ${gradient} relative`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-14 sm:-mt-16 gap-4 mb-4">
            <img
              src={userInfo.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || 'U')}`}
              alt={displayName}
              className="w-28 h-28 rounded-full border-4 border-white object-cover bg-white shadow-md"
            />
            {!isOwnProfile && (
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleMessage} className="btn-pill-outline text-xs px-4 py-2 flex items-center gap-1.5">
                  <MessageSquare size={14} /> Message
                </button>
                <button
                  disabled={sendingRequest || connectionStatus !== 'none'}
                  onClick={handleConnect}
                  className={`text-xs px-4 py-2 rounded-full font-semibold flex items-center gap-1.5 transition-colors ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : connectionStatus === 'pending'
                      ? 'bg-gray-100 text-gray-600 border border-gray-300'
                      : 'btn-pill-primary'
                  }`}
                >
                  {sendingRequest ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : connectionStatus === 'connected' ? (
                    <><UserCheck size={13} /> Connected</>
                  ) : connectionStatus === 'pending' ? (
                    '✓ Pending'
                  ) : (
                    <><UserPlus size={13} /> Connect</>
                  )}
                </button>
              </div>
            )}
            {isOwnProfile && (
              <button
                onClick={() => navigate('/profile')}
                className="btn-pill-outline text-xs px-4 py-2"
              >
                Edit Profile
              </button>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[rgba(0,0,0,0.9)]">{displayName}</h1>
              <ClinicalBadge isClinicalVerified={userInfo.isClinicalVerified} subscriptionTier={userInfo.subscriptionTier} size="md" />
            </div>
            <p className="text-sm font-medium text-[rgba(0,0,0,0.7)]">{headline}</p>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {roleIcon} {role.replace(/_/g, ' ')}
              </span>
              {(city || country) && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={12} /> {[city, country].filter(Boolean).join(', ')}
                </span>
              )}
              {(profile?.yearsOfExperience ?? 0) > 0 && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} /> {profile.yearsOfExperience}+ yrs exp
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Role-specific sections ── */}
      {role === 'DOCTOR' && <DoctorSections profile={profile} userInfo={userInfo} />}
      {role === 'RECRUITER' && <RecruiterSections profile={profile} userInfo={userInfo} />}
      {role === 'HOSPITAL_ADMIN' && <HospitalSections profile={profile} userInfo={userInfo} />}

      {/* ── Posts Feed ── */}
      {posts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-gray-900 px-1 flex items-center gap-2">
            <FileText size={16} className="text-[#0A66C2]" /> Posts
            <span className="text-gray-400 font-normal">({posts.length})</span>
          </h2>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostUpdated={() => {
                // refresh posts silently
                apiClient.get(`/doctor/public/${userId}`)
                  .then(res => setPosts(res.data.data?.posts || []))
                  .catch(() => {});
              }}
            />
          ))}
        </div>
      )}

      <UpgradeModal isOpen={upgradeModal} onClose={closeUpgrade} action={pendingAction} />
    </div>
  );
};
