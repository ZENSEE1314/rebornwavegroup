import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

    if (paymentIntent && paymentIntentClientSecret) {
      // Verify payment status with Stripe
      fetch(`/api/verify-payment?payment_intent=${paymentIntent}`, {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'succeeded') {
            setPaymentStatus('succeeded');
          } else {
            setPaymentStatus('failed');
          }
        })
        .catch(() => {
          setPaymentStatus('failed');
        });
    } else {
      setPaymentStatus('failed');
    }
  }, []);

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {paymentStatus === 'succeeded' ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-500 text-2xl">✕</span>
              </div>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {paymentStatus === 'succeeded' ? 'Payment Successful!' : 'Payment Failed'}
          </h1>
          
          <p className="text-gray-600">
            {paymentStatus === 'succeeded' 
              ? 'Your payment has been processed successfully. Credits have been added to your account.'
              : 'There was an issue processing your payment. Please try again or contact support.'
            }
          </p>
        </div>

        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>
              {paymentStatus === 'succeeded' ? 'Thank You!' : 'Payment Issue'}
            </CardTitle>
            <CardDescription>
              {paymentStatus === 'succeeded' 
                ? 'You can now use your credits to purchase toys and care for your pets.'
                : 'No charges were made to your account.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/" className="w-full">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
            
            {paymentStatus === 'failed' && (
              <Link href="/checkout" className="w-full">
                <Button variant="outline" className="w-full">
                  Try Again
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}