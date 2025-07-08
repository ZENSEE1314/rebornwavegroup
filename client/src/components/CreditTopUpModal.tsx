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

import { Upload, CreditCard, Building, Wallet, History, Eye, X, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface CreditTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: string;
}

// Stripe Tab Component
function StripeTab({ onClose }: { onClose: () => void }) {
  const [, setLocation] = useLocation();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const creditPackages = [
    { amount: 100000, price: "RP 100,000", credits: "100,000", popular: false },
    { amount: 500000, price: "RP 500,000", credits: "500,000", popular: false },
    { amount: 1000000, price: "RP 1,000,000", credits: "1,000,000", popular: true },
    { amount: 5000000, price: "RP 5,000,000", credits: "5,000,000", popular: false },
    { amount: 10000000, price: "RP 10,000,000", credits: "10,000,000", popular: false },
    { amount: 50000000, price: "RP 50,000,000", credits: "50,000,000", popular: false },
    { amount: 100000000, price: "RP 100,000,000", credits: "100,000,000", popular: false },
  ];

  const handleStripePayment = () => {
    if (!selectedAmount) return;
    
    const selectedPackage = creditPackages.find(pkg => pkg.amount === selectedAmount);
    if (!selectedPackage) return;
    
    // Close modal and navigate to Stripe checkout
    onClose();
    setLocation(`/checkout?amount=${selectedAmount}&description=Pet Care Credits - ${selectedPackage.credits}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Payment</CardTitle>
        <CardDescription>
          Pay securely with Stripe. All major credit cards accepted. Credits added instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Select Credit Package</Label>
          <div className="grid grid-cols-1 gap-3 mt-2">
            {creditPackages.map((pkg) => (
              <Card 
                key={pkg.amount}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  selectedAmount === pkg.amount 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedAmount(pkg.amount)}
              >
                <CardContent className="p-4 relative">
                  {pkg.popular && (
                    <div className="absolute -top-2 right-4 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-bold text-lg">{pkg.credits} Credits</div>
                        <div className="text-sm text-gray-600">{pkg.price}</div>
                      </div>
                    </div>
                    {selectedAmount === pkg.amount && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Secure Payment</span>
          </div>
          <p className="text-sm text-blue-800">
            Payments are processed securely through Stripe. We accept Visa, Mastercard, American Express, and more.
          </p>
        </div>

        <Button 
          onClick={handleStripePayment}
          disabled={!selectedAmount}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {selectedAmount 
            ? `Pay ${creditPackages.find(pkg => pkg.amount === selectedAmount)?.price} with Stripe`
            : "Select Amount to Continue"
          }
        </Button>
      </CardContent>
    </Card>
  );
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

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, JPEG)",
        variant: "destructive",
      });
      return;
    }

    // Allow up to 10MB for payment proof images
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Add Credits to Account
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="ml-auto"
            >
              <History className="h-4 w-4 mr-1" />
              {showHistory ? "Hide History" : "View History"}
            </Button>
          </DialogTitle>
          <DialogDescription>
            Current Balance: <span className="font-semibold">IDR {currentCredits}</span>
          </DialogDescription>
        </DialogHeader>

        {showHistory && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Top-up History
            </h3>
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : Array.isArray(topUpHistory) && topUpHistory.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {topUpHistory.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div>
                      <div className="font-medium">IDR {parseFloat(item.amount).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{item.paymentMethod}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {item.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                      {item.status === 'rejected' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.status === 'approved' ? 'bg-green-100 text-green-700' :
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No top-up history found</p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="stripe" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stripe" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Stripe
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

          <TabsContent value="stripe">
            <StripeTab onClose={onClose} />
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {paymentProof ? (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <img 
                            src={paymentProof} 
                            alt="Payment proof" 
                            className="max-w-full max-h-48 rounded-lg shadow-md"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setPaymentProof("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(paymentProof, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Full Size
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-sm text-gray-600">Upload bank transfer receipt</p>
                          <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="bank-file-upload"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('bank-file-upload')?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Choose File
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {paymentProof ? (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <img 
                            src={paymentProof} 
                            alt="Payment proof" 
                            className="max-w-full max-h-48 rounded-lg shadow-md"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setPaymentProof("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(paymentProof, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Full Size
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-sm text-gray-600">Upload cash deposit receipt</p>
                          <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="cash-file-upload"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('cash-file-upload')?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Choose File
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}