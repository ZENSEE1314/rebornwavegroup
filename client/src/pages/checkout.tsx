import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { useTranslation, localeTag } from "@/lib/i18n";
import { moneySymbol } from "@/lib/money";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const CheckoutForm = ({ amount, description }: { amount: number; description: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const amountText = amount.toLocaleString(localeTag(language));
  const descriptionText = description === "Pet Care Credits" ? t("ac.co.petCredits") : description;
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
        title: t("ac.co.failed"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("ac.co.success"),
        description: t("ac.co.thanks"),
      });
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {t("ac.co.complete")}
        </CardTitle>
        <CardDescription>
          {descriptionText} - {moneySymbol()} {amountText}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button type="submit" disabled={!stripe || isLoading} className="w-full">
            {isLoading ? t("ac.co.processing") : t("ac.co.pay", { n: amountText })}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Checkout() {
  const { t } = useTranslation();
  if (!stripePromise) {
    return (
      <div className="rwg-page-bg min-h-screen flex items-center justify-center">
        <div className="rwg-card p-8 text-center max-w-md">
          <CreditCard className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">{t("ac.co.unavailable")}</h2>
          <p className="text-white/60 text-sm mb-4">{t("ac.co.notConfigured")}</p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm">{t("ac.co.backHome")}</Link>
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
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label={t("ac.co.loading")}/>
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
          {t("ac.co.backDashboard")}
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("ac.co.secure")}</h1>
          <p className="text-gray-600">{t("ac.co.secureDesc")}</p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm amount={amount} description={description} />
        </Elements>
      </div>
    </div>
  );
}