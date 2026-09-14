import { useState, useEffect } from "react";
import {
  X, ArrowRight, ArrowLeft, Sparkles, Coins, Calendar, Users, Gift, Star,
  PawPrint, Wallet, Disc3, Utensils, Clock, Pill, Check, Trophy,
} from "lucide-react";
import petGuideImage from "@assets/Doluruu Grandpa_1749903476706.png";

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  text: string;
}

interface TourStep {
  icon: React.ReactNode;
  accent: string; // tailwind gradient classes
  title: string;
  intro: string;
  items?: FeatureItem[];
  petMessage: string;
}

interface OnboardingWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS: TourStep[] = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    accent: "from-fuchsia-500 to-purple-600",
    title: "Welcome to Reborn Wave!",
    intro:
      "This is your member app for the club. In 6 quick cards, Doluruu will show you how to earn rewards, care for your pet, and get the most out of every visit.",
    petMessage: "Hi! I'm Doluruu. Let me give you a quick tour — it takes under a minute.",
  },
  {
    icon: <Wallet className="w-6 h-6" />,
    accent: "from-amber-400 to-orange-500",
    title: "Your 3 balances",
    intro: "At the top of your dashboard you'll always see three numbers:",
    items: [
      { icon: <Coins className="w-5 h-5 text-amber-500" />, title: "Credits", text: "Money you top up. Use it to pay at the club and buy items." },
      { icon: <Star className="w-5 h-5 text-violet-500" />, title: "Loyalty Points", text: "Earned every time you spend. Trade them for rewards and perks." },
      { icon: <Gift className="w-5 h-5 text-emerald-500" />, title: "Tokens", text: "Earned by feeding your pet daily. Exchange them for prizes." },
    ],
    petMessage: "Think of it as: Credits = money, Points = perks, Tokens = pet rewards.",
  },
  {
    icon: <PawPrint className="w-6 h-6" />,
    accent: "from-pink-400 to-rose-500",
    title: "Your blindbox pet",
    intro: "Buy a blindbox package at the club, then enter its code in Pet Care to bring your Doluruu to life.",
    items: [
      { icon: <Utensils className="w-5 h-5 text-rose-500" />, title: "Feed 3× a day", text: "Feed your pet three times each day to earn 1 token that day." },
      { icon: <Clock className="w-5 h-5 text-amber-500" />, title: "Lives 15 days", text: "Your pet earns tokens for 15 days, then it gets sick." },
      { icon: <Pill className="w-5 h-5 text-emerald-500" />, title: "Revive with a pill", text: "Spend 300,000 RP on a visit and staff give you a free pill — it revives your pet for another 15 days." },
    ],
    petMessage: "Feed me 3 times a day and I'll give you a token!",
  },
  {
    icon: <Disc3 className="w-6 h-6" />,
    accent: "from-sky-400 to-blue-600",
    title: "Spin & Win",
    intro: "Spend your tokens on the prize wheel — just 1 token per spin.",
    items: [
      { icon: <Gift className="w-5 h-5 text-sky-500" />, title: "Win real prizes", text: "Free drinks, discount vouchers, free dishes, free spins and more." },
      { icon: <Sparkles className="w-5 h-5 text-fuchsia-500" />, title: "Doluruu egg", text: "Win an egg and it hatches into a brand-new pet after 15 days." },
      { icon: <Check className="w-5 h-5 text-emerald-500" />, title: "Claim at the club", text: "Prizes are saved under My Prizes — show staff and an admin confirms them." },
    ],
    petMessage: "Feed me for tokens, then spin the wheel to win!",
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    accent: "from-teal-400 to-emerald-600",
    title: "Book your visit",
    intro:
      "Reserve KTV rooms, beauty services and more before you arrive. Your bookings and appointments live in one place so you never miss a slot.",
    petMessage: "Booking ahead means your room is ready the moment you walk in.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    accent: "from-indigo-400 to-violet-600",
    title: "Invite friends, earn together",
    intro:
      "Share your personal referral code. When a friend joins and spends, you both benefit — you earn a 10% referral reward. Find your code in the Referrals tab.",
    petMessage: "The more friends you bring, the more you both earn. Everybody wins!",
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    accent: "from-fuchsia-500 to-purple-600",
    title: "You're all set!",
    intro:
      "That's the whole app. Start by feeding your pet and checking your balances — you can replay this tour anytime from your profile.",
    petMessage: "Have fun exploring the club. See you inside!",
  },
];

export function OnboardingWalkthrough({ isOpen, onClose, onComplete }: OnboardingWalkthroughProps) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const data = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const next = () => (isLast ? onComplete() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="App tour"
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 sm:zoom-in-95 duration-300 max-h-[92vh] flex flex-col"
      >
        {/* Header band */}
        <div className={`relative bg-gradient-to-br ${data.accent} px-5 pt-5 pb-14 text-white`}>
          <button
            onClick={onClose}
            aria-label="Close tour"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-white/90 text-xs font-semibold uppercase tracking-wider">
            <span className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">{data.icon}</span>
            Step {step + 1} of {total}
          </div>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight">{data.title}</h2>
        </div>

        {/* Mascot overlapping the band */}
        <div className="relative -mt-12 px-5">
          <div className="flex items-end gap-3">
            <img
              src={petGuideImage}
              alt="Doluruu, your guide"
              className="w-20 h-20 object-contain drop-shadow-xl flex-shrink-0"
            />
            <div className="mb-2 bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
              <p className="text-[13px] text-slate-600 leading-snug">{data.petMessage}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-2 overflow-y-auto">
          <p className="text-[15px] text-slate-700 leading-relaxed">{data.intro}</p>

          {data.items && (
            <div className="mt-4 space-y-2.5">
              {data.items.map((it, i) => (
                <div key={i} className="flex gap-3 items-start bg-slate-50 rounded-2xl p-3">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                    {it.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{it.title}</p>
                    <p className="text-[13px] text-slate-500 leading-snug">{it.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 border-t border-slate-100 mt-2">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-purple-600" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={back}
              disabled={isFirst}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <button
              onClick={onClose}
              className="ml-auto px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip
            </button>

            <button
              onClick={next}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg bg-gradient-to-r ${data.accent} hover:brightness-105 active:scale-95 transition-all`}
            >
              {isLast ? "Let's go!" : "Next"}
              {isLast ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
