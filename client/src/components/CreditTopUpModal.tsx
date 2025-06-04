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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PayPalButton from "./PayPalButton";
import { Upload, CreditCard, Building, Wallet } from "lucide-react";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    if (!amountNum || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
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

    bankTransferMutation.mutate({
      amount: amountNum,
      bankTransferDetails: bankDetails,
      paymentProof,
    });
  };

  const handleCashDeposit = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!paymentProof) {
      toast({
        title: "Missing Proof",
        description: "Please provide payment proof details",
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
                  <Label htmlFor="paypal-amount">Amount (USD)</Label>
                  <Input
                    id="paypal-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
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
                  <Label htmlFor="bank-amount">Amount (USD)</Label>
                  <Input
                    id="bank-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
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
                  <Label htmlFor="bank-proof">Payment Proof (Optional)</Label>
                  <Textarea
                    id="bank-proof"
                    placeholder="Upload screenshot URL or provide additional details..."
                    value={paymentProof}
                    onChange={(e) => setPaymentProof(e.target.value)}
                  />
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
                  <Label htmlFor="cash-amount">Amount (USD)</Label>
                  <Input
                    id="cash-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="cash-proof">Payment Proof</Label>
                  <Textarea
                    id="cash-proof"
                    placeholder="Describe your cash deposit details, receipt number, or upload receipt URL..."
                    value={paymentProof}
                    onChange={(e) => setPaymentProof(e.target.value)}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Deposit Instructions:</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Visit our office in Batam, Indonesia to make a cash deposit. Please keep your receipt for verification.
                  </p>
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