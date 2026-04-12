import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // In a real app, you'd verify this on the server
      // For this demo, we'll just set a flag in localStorage
      localStorage.setItem('pakua_paid', 'true');
      
      // Redirect back to builder after a short delay
      const timer = setTimeout(() => {
        navigate('/builder');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionId, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-zinc-500 mb-8">
          Thank you for your purchase. You now have full access to AI generation features.
        </p>
        <p className="text-sm text-zinc-400 animate-pulse">
          Redirecting you back to the builder...
        </p>
      </div>
    </div>
  );
}
