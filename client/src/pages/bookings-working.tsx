import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { RebornLayout } from "@/components/RebornLayout";
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
      cost: "0",
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
    <RebornLayout active="/bookings" title="BOOKINGS"><div>
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-3xl mx-auto py-2 relative z-10">
        <MobileBackButton className="mb-4" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Appointments</h1>
            <p className="text-white/50 mt-1 text-sm">Manage your beauty, fun & entertainment bookings</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl">
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
                    {/* Cost hidden from members — bookings are free to request */}
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

        <TableBookingCard />

        <div className="grid grid-cols-1 gap-5">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="rwg-card p-5">
              <div className="flex items-start gap-3">
                <div className="text-3xl mt-0.5 flex-shrink-0">{getServiceIcon(appointment.service)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-semibold text-white leading-snug">{appointment.title}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full inline-block flex-shrink-0 ${getStatusStyle(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mb-3">{appointment.description}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/40 mb-3">
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
                  {appointment.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2">
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
    </div></RebornLayout>
  );
}

function TableBookingCard() {
  const { toast } = useToast();
  const { data } = useQuery<any>({ queryKey: ["/api/reborn/booking/info"], queryFn: () => apiRequest("GET", "/api/reborn/booking/info").then((r) => r.json()) });
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string>("");
  const [party, setParty] = useState(2);
  const day = data?.days?.[dayIdx];
  const book = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reborn/booking", { date: day?.date, slot, partySize: party }).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    onSuccess: ({ ok, d }: any) => { if (!ok) { toast({ title: "Failed", description: d.message, variant: "destructive" }); return; } toast({ title: "Requested!", description: d.message }); setSlot(""); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  // Slot values are the raw HH:MM from the server; labels are display strings.
  const slotValues: string[] = ["17:00", "19:00", "21:00", "23:00", "01:00"];
  return (
    <div className="rwg-card p-5 mb-5">
      <h3 className="text-lg font-bold text-white mb-1">🪑 Book a table</h3>
      <p className="text-white/50 text-sm mb-3">{data?.hoursSummary || "Sun–Thu 5pm–2am · Fri–Sat 5pm–3am · 2-hour slots"}</p>
      {data?.imageUrl && <img src={data.imageUrl} alt="Table layout" className="w-full rounded-xl border border-white/10 mb-3" style={{ maxHeight: 320, objectFit: "contain" }} />}
      {data?.note && <p className="text-white/60 text-sm mb-3">{data.note}</p>}

      <p className="text-xs text-white/50 mb-1">Day</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {(data?.days || []).map((d: any, i: number) => (
          <button key={d.date} onClick={() => { setDayIdx(i); setSlot(""); }} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 ${i === dayIdx ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`}>
            {i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(d.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/50 mb-1">Start time {day ? `· ${day.hours}` : ""}</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(day?.slots || []).map((label: string, i: number) => (
          <button key={i} onClick={() => setSlot(slotValues[i])} className={`py-2.5 rounded-xl text-sm font-semibold ${slot === slotValues[i] ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white" : "bg-white/5 text-white/70 border border-white/10"}`}>{label}</button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-white/50">Party size</span>
        <button onClick={() => setParty((p) => Math.max(1, p - 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>−</button>
        <span className="w-8 text-center font-extrabold text-white">{party}</span>
        <button onClick={() => setParty((p) => Math.min(50, p + 1))} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white font-bold" style={{ fontSize: 18 }}>+</button>
      </div>

      <Button onClick={() => book.mutate()} disabled={!slot || book.isPending} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl disabled:opacity-50">
        {book.isPending ? "Booking…" : slot ? "Request booking" : "Pick a time"}
      </Button>
    </div>
  );
}
