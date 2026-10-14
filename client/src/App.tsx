import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { AdminLayout } from './components/layout/AdminLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Main pages
import { FeedPage } from './pages/feed/FeedPage';
import { SavedPostsPage } from './pages/feed/SavedPostsPage';
import { DoctorProfilePage } from './pages/profile/DoctorProfilePage';
import { PublicDoctorProfilePage } from './pages/profile/PublicDoctorProfilePage';
import { CMEDashboard } from './pages/profile/CMEDashboard';
import { DrugLibraryPage } from './pages/drugs/DrugLibraryPage';
import { AIClinicalAssistant } from './pages/ai/AIClinicalAssistant';
import { NetworkPage } from './pages/network/NetworkPage';
import { MessagingPage } from './pages/messaging/MessagingPage';
import { JobsPage } from './pages/jobs/JobsPage';
import { JobDetailPage } from './pages/jobs/JobDetailPage';
import { SearchResultsPage } from './pages/search/SearchResultsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { GroupsPage } from './pages/groups/GroupsPage';
import { GroupDetailPage } from './pages/groups/GroupDetailPage';
import { EventsPage } from './pages/events/EventsPage';
import { SubscriptionPage } from './pages/subscription/SubscriptionPage';
import { ArticleDetailPage } from './pages/news/ArticleDetailPage';

// Panels (non-admin roles)
import { RecruiterPanel } from './pages/panels/RecruiterPanel';
import { HospitalPanel } from './pages/panels/HospitalPanel';

// Verifier pages (dedicated layout)
import { VerifierLayout } from './components/layout/VerifierLayout';
import { VerifierDashboard } from './pages/verifier/VerifierDashboard';
import { VerifierQueue } from './pages/verifier/VerifierQueue';

// Admin pages (SuperAdmin only — separate layout)
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminCredentials } from './pages/admin/AdminCredentials';
import { AdminModeration } from './pages/admin/AdminModeration';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminSettings } from './pages/admin/AdminSettings';

import { UserRole } from './types';

// ── Loading Spinner ────────────────────────────────────────────────────────────
const GlobalLoader: React.FC<{ message?: string }> = ({ message = 'Loading…' }) => (
  <div className="min-h-screen bg-[#F3F2EF] flex items-center justify-center flex-col gap-3">
    <img src="/logo.png" alt="DocIn" className="h-12 w-auto object-contain" />
    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
      <span className="inline-block w-4 h-4 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
      {message}
    </div>
  </div>
);

// ── Auth Required ─────────────────────────────────────────────────────────────
const AuthRequired: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <GlobalLoader message="Verifying session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Verifier should always be in their own dashboard
  if (user?.role === 'CREDENTIALING_OFFICER') return <Navigate to="/verifier" replace />;
  return <>{children}</>;
};

// ── Professional Required ─────────────────────────────────────────────────────
const ProfessionalRequired: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const PROFESSIONAL_ROLES: UserRole[] = ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'CREDENTIALING_OFFICER', 'SUPER_ADMIN'];
  if (isLoading) return <GlobalLoader message="Verifying session…" />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!PROFESSIONAL_ROLES.includes(user.role)) return <Navigate to="/feed" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
        <span className="text-2xl">🔒</span>
        <h2 className="text-base font-bold">Access Restricted</h2>
        <p className="text-sm text-gray-600">Requires: <strong>{allowedRoles.join(' or ')}</strong></p>
        <a href="/feed" className="text-xs font-semibold text-[#0A66C2] hover:underline">← Return to Feed</a>
      </div>
    );
  }
  return <>{children}</>;
};

// ── SuperAdmin Required ───────────────────────────────────────────────────────
const SuperAdminRequired: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/feed" replace />;
  return <>{children}</>;
};

// ── Verifier Required ─────────────────────────────────────────────────────────
const VerifierRequired: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'CREDENTIALING_OFFICER' && user.role !== 'SUPER_ADMIN') return <Navigate to="/feed" replace />;
  return <>{children}</>;
};

// ── Normal App Shell (with Navbar) ────────────────────────────────────────────
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Verifier should not see normal app at all
  if (user?.role === 'CREDENTIALING_OFFICER') {
    return <Navigate to="/verifier" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] flex flex-col">
      <Navbar />
      <div className="flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
};

// ── Root App ──────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* ── Auth Routes (no layout) ──────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* ── SuperAdmin Routes — completely separate layout ────── */}
            <Route path="/admin" element={<SuperAdminRequired><AdminLayout><AdminDashboard /></AdminLayout></SuperAdminRequired>} />
            <Route path="/admin/users" element={<SuperAdminRequired><AdminLayout><AdminUsers /></AdminLayout></SuperAdminRequired>} />
            <Route path="/admin/credentials" element={<SuperAdminRequired><AdminLayout><AdminCredentials /></AdminLayout></SuperAdminRequired>} />
            <Route path="/admin/moderation" element={<SuperAdminRequired><AdminLayout><AdminModeration /></AdminLayout></SuperAdminRequired>} />
            <Route path="/admin/audit" element={<SuperAdminRequired><AdminLayout><AdminAuditLogs /></AdminLayout></SuperAdminRequired>} />
            <Route path="/admin/settings" element={<SuperAdminRequired><AdminLayout><AdminSettings /></AdminLayout></SuperAdminRequired>} />

            {/* ── Verifier Routes — dedicated credentialing layout ──── */}
            <Route path="/verifier" element={<VerifierRequired><VerifierLayout><VerifierDashboard /></VerifierLayout></VerifierRequired>} />
            <Route path="/verifier/queue" element={<VerifierRequired><VerifierLayout><VerifierQueue /></VerifierLayout></VerifierRequired>} />

            {/* ── Normal Platform Routes (with Navbar) ─────────────── */}
            <Route path="/*" element={
              <AppLayout>
                <Routes>
                  {/* Public */}
                  <Route path="/feed" element={<FeedPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/profile/:userId" element={<PublicDoctorProfilePage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/groups/:id" element={<GroupDetailPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/news/:id" element={<ArticleDetailPage />} />

                  {/* Auth required */}
                  <Route path="/profile" element={<AuthRequired><DoctorProfilePage /></AuthRequired>} />
                  <Route path="/network" element={<AuthRequired><NetworkPage /></AuthRequired>} />
                  <Route path="/messaging" element={<AuthRequired><MessagingPage /></AuthRequired>} />
                  <Route path="/saved" element={<AuthRequired><SavedPostsPage /></AuthRequired>} />
                  <Route path="/settings" element={<AuthRequired><SettingsPage /></AuthRequired>} />
                  <Route path="/subscription" element={<AuthRequired><SubscriptionPage /></AuthRequired>} />
                  <Route path="/cme" element={<AuthRequired><CMEDashboard /></AuthRequired>} />
                  <Route path="/drug-library" element={<AuthRequired><DrugLibraryPage /></AuthRequired>} />
                  <Route path="/ai-assistant" element={<AuthRequired><AIClinicalAssistant /></AuthRequired>} />

                  {/* Professional panels */}
                  <Route path="/recruiter" element={<ProfessionalRequired allowedRoles={['RECRUITER']}><RecruiterPanel /></ProfessionalRequired>} />
                  <Route path="/hospital" element={<ProfessionalRequired allowedRoles={['HOSPITAL_ADMIN']}><HospitalPanel /></ProfessionalRequired>} />

                  {/* Default */}
                  <Route path="*" element={<Navigate to="/feed" replace />} />
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
