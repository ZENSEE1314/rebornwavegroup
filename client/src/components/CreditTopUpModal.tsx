import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import PayPalButton from "./PayPalButton";
import { Upload, CreditCard, Building, Wallet, History, Eye, X, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface CreditTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: string;
}

export default function CreditTopUpModal({ isOpen, onClose, currentCredits }: CreditTopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    referenceNumber: "",
  });
  const [paymentProof, setPaymentProof] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's top-up history
  const { data: topUpHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/topup/history"],
    enabled: showHistory,
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentProof(e.target?.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const paypalTopUpMutation = useMutation({
    mutationFn: async (data: { amount: number }) => {
      return await apiRequest("POST", "/api/topup/paypal", data);
    },
    onSuccess: () => {
      toast({
        title: "PayPal Payment Initiated",
        description: "Complete the PayPal payment to add credits to your account.",
      });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate PayPal payment",
        variant: "destructive",
      });
    },
  });

  const bankTransferMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/topup/bank-transfer", data);
    },
    onSuccess: () => {
      toast({
        title: "Bank Transfer Request Submitted",
        description: "Your request has been submitted for admin approval.",
      });
      setAmount("");
      setBankDetails({ bankName: "", accountNumber: "", referenceNumber: "" });
      setPaymentProof("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit bank transfer request",
        variant: "destructive",
      });
    },
  });

  const cashDepositMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/topup/cash-deposit", data);
    },
    onSuccess: () => {
      toast({
        title: "Cash Deposit Request Submitted",
        description: "Your request has been submitted for admin approval.",
      });
      setAmount("");
      setPaymentProof("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit cash deposit request",
        variant: "destructive",
      });
    },
  });

  const handlePayPalTopUp = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    paypalTopUpMutation.mutate({ amount: amountNum });
  };

  const handleBankTransfer = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10000) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount (minimum IDR 10,000)",
        variant: "destructive",
      });
      return;
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.referenceNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bank transfer details",
        variant: "destructive",
      });
      return;
    }

    if (!paymentProof || paymentProof.trim().length < 10) {
      toast({
        title: "Photo Proof Required",
        description: "Please upload photo proof of your bank transfer receipt",
        variant: "destructive",
      });
      return;
    }

    bankTransferMutation.mutate({
      amount: amountNum,
      bankTransferDetails: bankDetails,
      paymentProof,
    });
  };

  const handleCashDeposit = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 10000) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount (minimum IDR 10,000)",
        variant: "destructive",
      });
      return;
    }

    if (!paymentProof || paymentProof.trim().length < 10) {
      toast({
        title: "Photo Proof Required",
        description: "Please upload photo proof of your cash deposit receipt",
        variant: "destructive",
      });
      return;
    }

    cashDepositMutation.mutate({
      amount: amountNum,
      paymentProof,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Add Credits to Account
          </DialogTitle>
          <DialogDescription>
            Current Balance: <span className="font-semibold">${currentCredits}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="paypal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="paypal" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              PayPal
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Bank Transfer
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Cash Deposit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paypal">
            <Card>
              <CardHeader>
                <CardTitle>PayPal Payment</CardTitle>
                <CardDescription>
                  Pay securely with PayPal. Credits will be added instantly after payment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="paypal-amount">Amount (IDR)</Label>
                  <Input
                    id="paypal-amount"
                    type="number"
                    step="1000"
                    min="10000"
                    placeholder="Enter amount in Rupiah"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum: IDR 10,000</p>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handlePayPalTopUp}
                    disabled={paypalTopUpMutation.isPending || !amount}
                    className="w-full"
                  >
                    {paypalTopUpMutation.isPending ? "Processing..." : "Continue with PayPal"}
                  </Button>
                  
                  {amount && parseFloat(amount) > 0 && (
                    <div className="mt-4">
                      <PayPalButton 
                        amount={amount}
                        currency="USD"
                        intent="capture"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Transfer</CardTitle>
                <CardDescription>
                  Transfer money to our bank account. Credits will be added after verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bank-amount">Amount (IDR)</Label>
                  <Input
                    id="bank-amount"
                    type="number"
                    step="1000"
                    min="10000"
                    placeholder="Enter amount in Rupiah"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum: IDR 10,000</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input
                      id="bank-name"
                      placeholder="Your bank name"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      placeholder="Your account number"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reference-number">Transfer Reference Number</Label>
                  <Input
                    id="reference-number"
                    placeholder="Bank transfer reference number"
                    value={bankDetails.referenceNumber}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="bank-proof">Payment Proof (Required)</Label>
                  <Textarea
                    id="bank-proof"
                    placeholder="Upload bank transfer receipt photo URL or describe payment details..."
                    value={paymentProof}
                    onChange={(e) => setPaymentProof(e.target.value)}
                    required
                  />
                  <p className="text-xs text-red-500 mt-1">* Photo proof of bank transfer is required for verification</p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">Bank Transfer Instructions:</h4>
                  <div className="text-sm text-orange-700 dark:text-orange-300 mt-1 space-y-1">
                    <p><strong>Bank:</strong> Bank Mandiri</p>
                    <p><strong>Account Number:</strong> 1234-5678-9012</p>
                    <p><strong>Account Name:</strong> Reborn Wave Group</p>
                    <p className="mt-2 font-medium">After transfer, upload receipt photo and admin will approve within 24 hours.</p>
                  </div>
                </div>

                <Button 
                  onClick={handleBankTransfer}
                  disabled={bankTransferMutation.isPending}
                  className="w-full"
                >
                  {bankTransferMutation.isPending ? "Submitting..." : "Submit Bank Transfer"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash">
            <Card>
              <CardHeader>
                <CardTitle>Cash Deposit</CardTitle>
                <CardDescription>
                  Deposit cash at our physical location. Credits will be added after verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cash-amount">Amount (IDR)</Label>
                  <Input
                    id="cash-amount"
                    type="number"
                    step="1000"
                    min="10000"
                    placeholder="Enter amount in Rupiah"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum: IDR 10,000</p>
                </div>

                <div>
                  <Label htmlFor="cash-proof">Payment Proof (Required)</Label>
                  <Textarea
                    id="cash-proof"
                    placeholder="Upload cash deposit receipt photo URL or describe deposit details..."
                    value={paymentProof}
                    onChange={(e) => setPaymentProof(e.target.value)}
                    required
                  />
                  <p className="text-xs text-red-500 mt-1">* Photo proof of cash deposit receipt is required for verification</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Cash Deposit Instructions:</h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <p><strong>Location:</strong> Reborn Wave Group Office, Batam, Indonesia</p>
                    <p><strong>Address:</strong> Jl. Raya Batam Center No. 123, Batam 29432</p>
                    <p><strong>Hours:</strong> Monday - Sunday, 9:00 AM - 9:00 PM</p>
                    <p className="mt-2 font-medium">After deposit, upload receipt photo and admin will approve within 24 hours.</p>
                  </div>
                </div>

                <Button 
                  onClick={handleCashDeposit}
                  disabled={cashDepositMutation.isPending}
                  className="w-full"
                >
                  {cashDepositMutation.isPending ? "Submitting..." : "Submit Cash Deposit"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}