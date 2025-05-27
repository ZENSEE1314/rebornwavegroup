import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

export default function Bookings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      title: "Premium Beauty Consultation",
      description: "Advanced skincare analysis and personalized treatment plan",
      appointmentDate: "2025-05-30",
      appointmentTime: "10:00",
      duration: "90 minutes",
      cost: 150.00,
      status: "confirmed",
      service: "beauty"
    },
    {
      id: 2,
      title: "Luxury Spa Treatment",
      description: "Full body relaxation massage with aromatherapy",
      appointmentDate: "2025-06-02",
      appointmentTime: "14:30",
      duration: "120 minutes",
      cost: 200.00,
      status: "pending",
      service: "beauty"
    }
  ]);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      appointmentDate: "",
      appointmentTime: "",
      duration: "60",
      cost: "",
      service: "",
    },
  });

  const onSubmit = (data: any) => {
    const newAppointment = {
      id: appointments.length + 1,
      title: data.title,
      description: data.description,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      duration: `${data.duration} minutes`,
      cost: parseFloat(data.cost),
      status: "pending",
      service: data.service
    };

    setAppointments([...appointments, newAppointment]);
    
    toast({
      title: "Success!",
      description: "Appointment booked successfully",
    });
    
    setIsDialogOpen(false);
    form.reset();
  };

  const cancelAppointment = (id: number) => {
    setAppointments(appointments.map(apt => 
      apt.id === id ? { ...apt, status: "cancelled" } : apt
    ));
    
    toast({
      title: "Cancelled",
      description: "Appointment has been cancelled",
    });
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'beauty': return '💄';
      case 'fun': return '🎵';
      case 'entertainment': return '🎮';
      default: return '📅';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-slate-600 mt-2">Manage your beauty, fun & entertainment bookings</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book New Appointment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beauty">💄 Beauty & Wellness</SelectItem>
                          <SelectItem value="fun">🎵 Fun & Activities</SelectItem>
                          <SelectItem value="entertainment">🎮 Entertainment & Gaming</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Premium Facial Treatment" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description of the service..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="60" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Book Appointment</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {appointments.map((appointment) => (
          <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {getServiceIcon(appointment.service)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-1">
                      {appointment.title}
                    </h3>
                    <p className="text-slate-600 mb-2">{appointment.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{appointment.appointmentDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{appointment.appointmentTime}</span>
                      </div>
                      <span>•</span>
                      <span>{appointment.duration}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <div className="text-2xl font-bold text-slate-900">
                    ${appointment.cost.toFixed(2)}
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status}
                  </Badge>
                  {appointment.status === 'pending' && (
                    <div className="space-x-2">
                      <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirm
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => cancelAppointment(appointment.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {appointments.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No appointments yet</h3>
            <p className="text-slate-600 mb-6">Book your first appointment to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Book Appointment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}