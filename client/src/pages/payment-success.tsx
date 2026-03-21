import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

    if (paymentIntent && paymentIntentClientSecret) {
      fetch(`/api/verify-payment?payment_intent=${paymentIntent}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setPaymentStatus(data.status === 'succeeded' ? 'succeeded' : 'failed');
        })
        .catch(() => setPaymentStatus('failed'));
    } else {
      setPaymentStatus('failed');
    }
  }, []);

  return (
    <div className="rwg-page-bg min-h-screen flex items-center justify-center p-4">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />

      <div className="rwg-card p-10 max-w-md w-full text-center relative z-10">
        {paymentStatus === 'loading' ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Processing...</h1>
            <p className="text-white/40 text-sm">Verifying your payment</p>
          </>
        ) : paymentStatus === 'succeeded' ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-white/45 text-sm mb-8">
              Your payment has been processed. Credits have been added to your account.
            </p>
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold h-11">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
            <p className="text-white/45 text-sm mb-8">
              There was an issue processing your payment. No charges were made.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/checkout">
                <Button className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold h-11">
                  Try Again
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full text-white/50 hover:text-white/80 hover:bg-white/8 rounded-xl h-11">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
