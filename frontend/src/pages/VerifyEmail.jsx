import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      toast.error('Invalid verification link.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-email?token=${token}`);
        // Backend returns: { message, token, user }
        if (data.token) {
          localStorage.setItem('mb_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('mb_user', JSON.stringify(data.user));
        }
        toast.success(data.message || 'Email verified successfully!');
        setStatus('success');
        // Redirect to login after 2 seconds
        setTimeout(() => navigate('/login'), 2000);
      } catch (err) {
        setStatus('error');
        toast.error(err.response?.data?.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] dark:bg-[#191c20] p-4">
      <div className="text-center p-8 bg-white dark:bg-[#23272d] border border-[#dde1e9] dark:border-[#373e47] rounded-2xl shadow-xl max-w-md w-full">
        {status === 'verifying' && (
          <div>
            <h2 className="text-xl font-bold text-[#111827] dark:text-[#e7e9ed] mb-4">Verifying your email...</h2>
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
        {status === 'success' && (
          <div>
            <h2 className="text-xl font-bold text-emerald-500 mb-2">✅ Email Verified!</h2>
            <p className="text-sm text-[#6b7280] dark:text-[#a1a1aa] mb-5">
              Your email has been verified. Redirecting you to login...
            </p>
            <button onClick={() => navigate('/login')} className="btn-primary">
              Go to Login
            </button>
          </div>
        )}
        {status === 'error' && (
          <div>
            <h2 className="text-xl font-bold text-red-500 mb-2">❌ Verification Failed</h2>
            <p className="text-sm text-[#6b7280] dark:text-[#a1a1aa] mb-5">
              The verification link is invalid or has expired.
            </p>
            <button onClick={() => navigate('/login')} className="btn-secondary">
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
