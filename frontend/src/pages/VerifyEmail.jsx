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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full">
        {status === 'verifying' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verifying your email...</h2>
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
        {status === 'success' && (
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">✅ Email Verified!</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Your email has been verified. Please login to continue.
            </p>
            <button onClick={() => navigate('/login')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Go to Login
            </button>
          </div>
        )}
        {status === 'error' && (
          <div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">❌ Verification Failed</h2>
            <p className="text-gray-600 dark:text-gray-300">The link is invalid or expired. Please try logging in to request a new verification email.</p>
            <button onClick={() => navigate('/login')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
