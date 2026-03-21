import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Link } from "wouter";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const CheckoutForm = ({ amount, description }: { amount: number; description: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase!",
      });
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          {description} - RP {amount.toLocaleString('id-ID')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button type="submit" disabled={!stripe || isLoading} className="w-full">
            {isLoading ? "Processing..." : `Pay RP ${amount.toLocaleString('id-ID')}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Checkout() {
  if (!stripePromise) {
    return (
      <div className="rwg-page-bg min-h-screen flex items-center justify-center">
        <div className="rwg-card p-8 text-center max-w-md">
          <CreditCard className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Payments Unavailable</h2>
          <p className="text-white/60 text-sm mb-4">Stripe is not configured. Contact the administrator.</p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const [clientSecret, setClientSecret] = useState("");
  const [amount, setAmount] = useState(1000000); // Default RP 1,000,000
  const [description, setDescription] = useState("Pet Care Credits");

  useEffect(() => {
    // Get payment details from URL params or use defaults
    const urlParams = new URLSearchParams(window.location.search);
    const urlAmount = urlParams.get('amount');
    const urlDescription = urlParams.get('description');
    
    if (urlAmount) setAmount(parseInt(urlAmount));
    if (urlDescription) setDescription(urlDescription);

    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: urlAmount ? parseInt(urlAmount) : 1000000,
      description: urlDescription || "Pet Care Credits"
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error('Error creating payment intent:', error);
      });
  }, []);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Payment</h1>
          <p className="text-gray-600">Complete your purchase safely with Stripe</p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm amount={amount} description={description} />
        </Elements>
      </div>
    </div>
  );
}