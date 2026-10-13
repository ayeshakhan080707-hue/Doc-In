import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, Loader2, Star, Zap, Shield, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const SubscriptionPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get('/payment/status');
      setStatus(res.data.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const init = async () => {
      if (paymentStatus === 'success' && sessionId) {
        try {
          await apiClient.get(`/payment/verify/${sessionId}`);
          await refreshUser();
        } catch { /* webhook may have processed already */ }
      }
      await fetchStatus();
    };
    init();
  }, []);

  const handleUpgrade = async () => {
    setIsCheckingOut(true);
    setError(null);
    try {
      const res = await apiClient.post('/payment/checkout');
      if (res.data.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to process payment. Please try again.');
    } finally { setIsCheckingOut(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your Gold membership? You will lose access to premium features.')) return;
    try {
      await apiClient.post('/payment/cancel');
      await fetchStatus();
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel subscription.');
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#0A66C2]" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Payment Success Banner */}
      {paymentStatus === 'success' && (
        <div className="rounded-xl p-5 bg-green-50 border border-green-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-800">Welcome to DocIn Premium Gold!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Your subscription is now active. Enjoy all premium features.
            </p>
          </div>
          <button
            onClick={() => navigate('/feed')}
            className="ml-auto text-sm font-semibold text-green-700 hover:text-green-900 underline flex-shrink-0"
          >
            Go to Feed →
          </button>
        </div>
      )}

      {/* Cancelled Banner */}
      {paymentStatus === 'cancelled' && (
        <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-600">Payment was not completed. No charges were made.</p>
        </div>
      )}

      {/* Page Header */}
      <div className="text-center space-y-2 py-4">
        <h1 className="text-3xl font-bold text-gray-900">Upgrade to DocIn Premium Gold</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Join thousands of verified healthcare professionals who trust DocIn Gold for priority access and advanced features.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Card */}
        <div className="card-linkedin p-6 bg-gradient-to-br from-amber-50 via-amber-50 to-white border-2 border-amber-300 relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
              Most Popular
            </span>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center">
              <Star size={22} className="text-white fill-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">Premium Gold</h2>
              <p className="text-xs text-amber-600 font-medium">For serious healthcare professionals</p>
            </div>
          </div>

          {status?.isGold ? (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-amber-200 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <p className="font-bold text-gray-900">Active Gold Member</p>
                </div>
                {status.expiresAt && (
                  <p className="text-xs text-gray-500">
                    Next renewal: {new Date(status.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="w-full text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
              >
                Cancel subscription
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">$29</span>
                  <span className="text-gray-500 font-medium">/month</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Billed monthly • Cancel anytime • No hidden fees</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleUpgrade}
                disabled={isCheckingOut}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                {isCheckingOut ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Star size={16} className="fill-white" /> Get Premium Gold</>
                )}
              </button>

              <div className="flex items-center gap-2 text-[11px] text-gray-400 justify-center">
                <Shield size={12} />
                <span>Secure payment • Powered by Stripe</span>
              </div>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="card-linkedin p-6 space-y-4">
          <h3 className="font-bold text-sm text-gray-900">Everything in Gold</h3>
          <div className="space-y-3">
            {[
              { icon: <TrendingUp size={16} className="text-amber-500" />, title: 'Priority Recruiter Visibility', desc: 'Appear at top of talent search results' },
              { icon: <Users size={16} className="text-amber-500" />, title: 'Unlimited Connections', desc: 'No monthly limit on connection requests' },
              { icon: <Zap size={16} className="text-amber-500" />, title: 'Fast-Track Verification', desc: 'Priority processing for credentials' },
              { icon: <Award size={16} className="text-amber-500" />, title: 'Gold Badge', desc: 'Distinguished Gold member badge on profile' },
              { icon: <TrendingUp size={16} className="text-amber-500" />, title: 'Advanced Analytics', desc: 'See which organizations viewed your profile' },
              { icon: <Star size={16} className="text-amber-500" />, title: 'Early Feature Access', desc: 'Get new features before anyone else' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{item.title}</p>
                  <p className="text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card-linkedin p-5">
        <h3 className="font-bold text-sm text-gray-900 mb-4">Free vs Gold</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 text-gray-500 font-semibold">Feature</th>
                <th className="text-center pb-3 text-gray-500 font-semibold w-24">Free</th>
                <th className="text-center pb-3 text-amber-600 font-semibold w-24">Gold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ['Feed & Public Posts', '✓', '✓'],
                ['Monthly Connection Requests', '20', 'Unlimited'],
                ['InMail Messages', '10', 'Unlimited'],
                ['Job Applications', '5', 'Unlimited'],
                ['Credential Uploads', '2', 'Unlimited'],
                ['Profile Analytics', 'Basic', 'Advanced'],
                ['Recruiter Search Placement', 'Standard', '⭐ Priority'],
                ['Credential Verification Queue', 'Standard', '⭐ Priority'],
              ].map(([feature, free, gold]) => (
                <tr key={String(feature)} className="hover:bg-gray-50/50">
                  <td className="py-2.5 text-gray-700">{feature}</td>
                  <td className="py-2.5 text-center text-gray-400">{free}</td>
                  <td className="py-2.5 text-center font-semibold text-amber-700">{gold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="card-linkedin p-5 space-y-3">
        <h3 className="font-bold text-sm text-gray-900">Frequently Asked Questions</h3>
        {[
          { q: 'Can I cancel anytime?', a: 'Yes, cancel anytime from your subscription settings. No cancellation fees.' },
          { q: 'What payment methods are accepted?', a: 'All major credit and debit cards are accepted through our secure payment processor.' },
          { q: 'Will I lose my data if I downgrade?', a: 'No, all your posts, connections, and credentials remain. Only premium features are restricted.' },
        ].map((item, i) => (
          <div key={i} className="text-xs">
            <p className="font-semibold text-gray-800">{item.q}</p>
            <p className="text-gray-500 mt-0.5">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
