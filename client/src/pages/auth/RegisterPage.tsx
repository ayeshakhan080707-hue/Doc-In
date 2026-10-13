import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Building2,
  UserCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

// ── Inline field error ──────────────────────────────────────────────────────
const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5">
      <AlertCircle size={11} className="flex-shrink-0" />
      {msg}
    </p>
  ) : null;

// ── Password strength ───────────────────────────────────────────────────────
const checks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
];

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      {checks.map((c) => {
        const ok = c.test(password);
        return (
          <div key={c.label} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
            {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {c.label}
          </div>
        );
      })}
    </div>
  );
};

type RegistrationMode = 'professional' | 'observer';

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  licenseNumber?: string;
}

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRole = searchParams.get('role') as UserRole | null;

  const [mode, setMode] = useState<RegistrationMode>('professional');
  const [role, setRole] = useState<UserRole>(
    preselectedRole && preselectedRole !== 'CREDENTIALING_OFFICER' && preselectedRole !== 'SUPER_ADMIN'
      ? preselectedRole
      : 'DOCTOR'
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [specialization, setSpecialty] = useState('Cardiology');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      preselectedRole &&
      preselectedRole !== 'OBSERVER' &&
      preselectedRole !== 'CREDENTIALING_OFFICER' &&
      preselectedRole !== 'SUPER_ADMIN'
    ) {
      setMode('professional');
      setRole(preselectedRole);
    } else if (preselectedRole === 'OBSERVER') {
      setMode('observer');
      setRole('OBSERVER');
    }
  }, [preselectedRole]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = (): FormErrors => {
    const e: FormErrors = {};
    const finalRole = mode === 'observer' ? 'OBSERVER' : role;

    if (mode === 'professional') {
      if (!fullName.trim()) {
        e.fullName = role === 'HOSPITAL_ADMIN' ? 'Institution name is required.' : 'Full name is required.';
      } else if (fullName.trim().length < 2) {
        e.fullName = 'Name must be at least 2 characters.';
      }
    }

    if (!email.trim()) {
      e.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Enter a valid email address.';
    }

    if (!password) {
      e.password = 'Password is required.';
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters.';
    }

    return e;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleFieldChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (touched[field]) setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setTouched({ fullName: true, email: true, password: true, licenseNumber: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    const finalRole = mode === 'observer' ? 'OBSERVER' : role;

    try {
      await register({
        fullName: mode === 'observer' ? (fullName || email.split('@')[0]) : fullName,
        email,
        password,
        role: finalRole,
        ...(finalRole === 'DOCTOR' && { specialization, licenseNumber }),
      });
      navigate('/feed');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: keyof FormErrors) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 outline-none transition-all ${
      touched[field] && errors[field]
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-200'
        : 'border-gray-300 focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20'
    }`;

  return (
    <div className="min-h-screen bg-[#F3F2EF] flex flex-col justify-center py-10 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/feed" className="inline-flex items-center gap-2 mb-2">
          <img src="/logo.png" alt="DocIn Digital Health Platform" className="h-14 w-auto object-contain" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[rgba(0,0,0,0.9)]">
          Join the verified medical network
        </h1>
        <p className="text-xs text-[rgba(0,0,0,0.6)] mt-1">
          Connect with trusted healthcare professionals worldwide
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-[rgba(0,0,0,0.08)] space-y-5">

          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('professional'); setRole('DOCTOR'); setErrors({}); setTouched({}); }}
              className={`flex-1 py-2.5 transition-colors ${
                mode === 'professional' ? 'bg-[#0A66C2] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              I am a Healthcare Professional
            </button>
            <button
              type="button"
              onClick={() => { setMode('observer'); setRole('OBSERVER' as UserRole); setErrors({}); setTouched({}); }}
              className={`flex-1 py-2.5 transition-colors ${
                mode === 'observer' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              I want to explore DocIn
            </button>
          </div>

          {/* Observer info */}
          {mode === 'observer' && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">Observer Account — Free & Read-Only</p>
              <p>Browse the feed, view doctor profiles, and explore job listings.</p>
              <p className="text-gray-500">To post, connect, or apply for jobs — upgrade anytime.</p>
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Role Selector */}
          {mode === 'professional' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Select Your Professional Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { value: 'DOCTOR', label: 'Physician / Doctor', sub: 'Clinical profile', icon: <Stethoscope size={16} className="text-[#0D9488]" />, active: 'border-[#0D9488] bg-teal-50/60 ring-1 ring-[#0D9488]' },
                  { value: 'HOSPITAL_ADMIN', label: 'Hospital / Clinic', sub: 'Affiliations', icon: <Building2 size={16} className="text-[#0A66C2]" />, active: 'border-[#0A66C2] bg-blue-50/60 ring-1 ring-[#0A66C2]' },
                  { value: 'RECRUITER', label: 'Medical Recruiter', sub: 'Talent matching', icon: <UserCheck size={16} className="text-[#B06000]" />, active: 'border-[#B06000] bg-amber-50/60 ring-1 ring-[#B06000]' },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value as UserRole)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between gap-1 transition-all ${
                      role === r.value ? r.active : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="flex-shrink-0">{r.icon}</span>
                      <p className="font-bold text-gray-900 leading-tight">{r.label}</p>
                    </div>
                    <p className="text-[11px] text-gray-500">{r.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            {/* Full name */}
            {mode === 'professional' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {role === 'HOSPITAL_ADMIN' ? 'Hospital / Institution Name' : 'Full Name'}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value, setFullName)}
                  onBlur={() => handleBlur('fullName')}
                  placeholder={role === 'DOCTOR' ? 'Dr. Elizabeth Blackwell, MD' : 'Metropolitan Medical Center'}
                  className={inputClass('fullName')}
                  maxLength={100}
                />
                <FieldError msg={touched.fullName ? errors.fullName : undefined} />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {mode === 'observer' ? 'Email Address' : 'Professional Work Email'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
                onBlur={() => handleBlur('email')}
                placeholder={mode === 'professional' ? 'name@hospital.org' : 'you@example.com'}
                className={inputClass('email')}
              />
              <FieldError msg={touched.email ? errors.email : undefined} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handleFieldChange('password', e.target.value, setPassword)}
                  onBlur={() => handleBlur('password')}
                  placeholder="At least 8 characters"
                  className={`${inputClass('password')} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <FieldError msg={touched.password ? errors.password : undefined} />
              <PasswordStrength password={password} />
            </div>

            {/* Doctor fields */}
            {mode === 'professional' && role === 'DOCTOR' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Specialty</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-2.5 py-2.5 border border-gray-300 rounded-lg text-xs text-gray-900 outline-none bg-white focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 transition-all"
                  >
                    {['Cardiology','Neurology','Pediatrics','Orthopedics','Oncology','Radiology','General Surgery','Emergency Medicine','General Medicine'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">License #</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="PMC-89124-A"
                    className="w-full px-2.5 py-2.5 border border-gray-300 rounded-lg text-xs text-gray-900 outline-none font-mono focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 transition-all"
                    maxLength={50}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-pill-primary py-2.5 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'observer' ? (
                'Create Observer Account'
              ) : (
                'Agree & Join DocIn'
              )}
            </button>
          </form>

          {mode === 'professional' && (
            <p className="text-[11px] text-center text-gray-500 leading-normal">
              By clicking Agree & Join, you agree to DocIn's User Agreement, Privacy Policy, and HIPAA Safe Harbor compliance terms.
            </p>
          )}
        </div>

        <div className="mt-5 text-center text-xs text-[rgba(0,0,0,0.6)]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#0A66C2] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
