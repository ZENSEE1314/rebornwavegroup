import { useState } from "react";
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
import MobileBackButton from "@/components/mobile-back-button";

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
    toast({ title: "Success!", description: "Appointment booked successfully" });
    setIsDialogOpen(false);
    form.reset();
  };

  const cancelAppointment = (id: number) => {
    setAppointments(appointments.map(apt => apt.id === id ? { ...apt, status: "cancelled" } : apt));
    toast({ title: "Cancelled", description: "Appointment has been cancelled" });
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'beauty': return '💄';
      case 'fun': return '🎵';
      case 'entertainment': return '🎮';
      default: return '📅';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-white/10 text-white/50 border border-white/20';
    }
  };

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <MobileBackButton className="mb-4" />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Appointments</h1>
            <p className="text-white/50 mt-1">Manage your beauty, fun & entertainment bookings</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl">
                <Plus className="w-5 h-5 mr-2" />
                Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-[#14082e] border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Book New Appointment</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Service Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rwg-input">
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#14082e] border border-white/10 text-white">
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
                        <FormLabel className="text-white/70">Service Title</FormLabel>
                        <FormControl>
                          <Input className="rwg-input" placeholder="e.g., Premium Facial Treatment" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Description</FormLabel>
                        <FormControl>
                          <Textarea className="rwg-input" placeholder="Brief description of the service..." {...field} />
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
                          <FormLabel className="text-white/70">Date</FormLabel>
                          <FormControl>
                            <Input type="date" className="rwg-input" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="appointmentTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/70">Time</FormLabel>
                          <FormControl>
                            <Input type="time" className="rwg-input" {...field} />
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
                          <FormLabel className="text-white/70">Duration (min)</FormLabel>
                          <FormControl>
                            <Input type="number" className="rwg-input" placeholder="60" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/70">Cost ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" className="rwg-input" placeholder="0.00" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-2">
                    <Button type="button" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl">
                      Book Appointment
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="rwg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-3xl mt-1">{getServiceIcon(appointment.service)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1">{appointment.title}</h3>
                    <p className="text-white/50 text-sm mb-3">{appointment.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/40">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{appointment.appointmentDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{appointment.appointmentTime}</span>
                      </div>
                      <span className="text-white/30">·</span>
                      <span>{appointment.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2 flex-shrink-0 ml-4">
                  <div className="text-2xl font-bold text-white">${appointment.cost.toFixed(2)}</div>
                  <span className={`text-xs px-2.5 py-1 rounded-full inline-block ${getStatusStyle(appointment.status)}`}>
                    {appointment.status}
                  </span>
                  {appointment.status === 'pending' && (
                    <div className="flex space-x-2 justify-end">
                      <Button size="sm" className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg"
                        onClick={() => cancelAppointment(appointment.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {appointments.length === 0 && (
          <div className="rwg-card text-center py-16">
            <Calendar className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No appointments yet</h3>
            <p className="text-white/50 mb-6">Book your first appointment to get started</p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Book Appointment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
