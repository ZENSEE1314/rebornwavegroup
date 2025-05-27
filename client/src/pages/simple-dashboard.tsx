import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, DollarSign, Calendar, Gift, Copy, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userCredits, setUserCredits] = useState(350.00);
  const [loyaltyPoints, setLoyaltyPoints] = useState(125);
  const [referralEarnings, setReferralEarnings] = useState(8.00);

  // Simple state management for appointments
  const [appointments, setAppointments] = useState([
    { id: 1, service: "Beauty Consultation", date: "2025-05-30", cost: 150, status: "confirmed" },
    { id: 2, service: "Spa Treatment", date: "2025-06-02", cost: 200, status: "pending" }
  ]);

  const [newAppointment, setNewAppointment] = useState({
    service: "",
    date: "",
    cost: 0
  });

  const referralCode = "RWG-1HMTE49h";

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const bookAppointment = () => {
    if (!newAppointment.service || !newAppointment.date || !newAppointment.cost) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const appointment = {
      id: appointments.length + 1,
      service: newAppointment.service,
      date: newAppointment.date,
      cost: Number(newAppointment.cost),
      status: "pending"
    };

    setAppointments([...appointments, appointment]);
    setUserCredits(prev => prev - appointment.cost);
    setLoyaltyPoints(prev => prev + Math.floor(appointment.cost * 0.1));

    toast({
      title: "Success!",
      description: "Appointment booked successfully",
    });

    setNewAppointment({ service: "", date: "", cost: 0 });
  };

  const topUpCredits = () => {
    setUserCredits(prev => prev + 100);
    toast({
      title: "Success!",
      description: "$100 added to your account",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.firstName || 'Candy'}!</h1>
        <p className="text-blue-100">Level 1 Member • {loyaltyPoints} points • ${userCredits.toFixed(2)} credits</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-sm text-green-600 font-medium">Credits</p>
            <p className="text-2xl font-bold text-green-800">${userCredits.toFixed(2)}</p>
            <Button size="sm" onClick={topUpCredits} className="mt-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />
              Add $100
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6 text-center">
            <Gift className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-sm text-purple-600 font-medium">Loyalty Points</p>
            <p className="text-2xl font-bold text-purple-800">{loyaltyPoints}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-sm text-blue-600 font-medium">Referrals</p>
            <p className="text-2xl font-bold text-blue-800">1</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-sm text-yellow-600 font-medium">Earnings</p>
            <p className="text-2xl font-bold text-yellow-800">${referralEarnings.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointments.map((apt) => (
                <div key={apt.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{apt.service}</p>
                    <p className="text-sm text-gray-600">{apt.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${apt.cost}</p>
                    <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                      {apt.status}
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Book New Appointment */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Book New Appointment</h3>
                <Input
                  placeholder="Service (e.g., Beauty Treatment)"
                  value={newAppointment.service}
                  onChange={(e) => setNewAppointment({...newAppointment, service: e.target.value})}
                />
                <Input
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder="Cost ($)"
                  value={newAppointment.cost || ''}
                  onChange={(e) => setNewAppointment({...newAppointment, cost: Number(e.target.value)})}
                />
                <Button onClick={bookAppointment} className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Section */}
        <div>
          <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-white">Your Referral Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white/20 rounded-lg p-4 mb-4 text-center">
                <p className="text-2xl font-bold font-mono">{referralCode}</p>
                <p className="text-emerald-100 text-sm mt-1">Share to earn 10% commission</p>
              </div>
              <Button 
                onClick={copyReferralCode}
                className="w-full bg-white/20 hover:bg-white/30 text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </CardContent>
          </Card>

          {/* Commission Structure */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Commission Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Level 1 (Direct)</span>
                <span className="font-bold text-green-600">10%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">Level 2</span>
                <span className="font-bold text-blue-600">3%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="font-medium">Level 3</span>
                <span className="font-bold text-purple-600">2%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}