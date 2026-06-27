import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Package, Save, ShoppingBag, Sparkles, Timer } from "lucide-react";

type WonderItem = {
  type: number;
  level: number;
  qty: number;
};

type MarketListing = WonderItem & {
  id: number;
  price: number;
  seller?: string;
};

type WonderState = {
  tokens: number;
  gems: number;
  slots: Array<WonderItem | null>;
  index: Array<{ id: number; discovered: boolean; maxLevel: number }>;
  gameLog: string[];
  market: {
    playerListings: MarketListing[];
    adminShop: MarketListing[];
  };
  nextTokenDrop: number;
};

const MAX_TOKENS = 100;
const SLOT_COUNT = 80;
const TOKEN_DROP_MS = 30 * 60 * 1000;
const MAX_LOG_ITEMS = 12;

const WONDER_ITEMS = [
  ["🍎", "Red Apple"], ["🍌", "Banana"], ["🍇", "Grapes"], ["🍒", "Cherry"], ["🍓", "Strawberry"],
  ["🍑", "Peach"], ["🍍", "Pineapple"], ["🥭", "Mango"], ["🥥", "Coconut"], ["🥝", "Kiwi"],
  ["🍅", "Tomato"], ["🥑", "Avocado"], ["🥦", "Broccoli"], ["🌽", "Corn"], ["🥕", "Carrot"],
  ["🌶️", "Pepper"], ["🥔", "Potato"], ["🍠", "Sweet Potato"], ["🥐", "Croissant"], ["🥯", "Bagel"],
  ["🍞", "Bread"], ["🧀", "Cheese"], ["🥚", "Egg"], ["🍳", "Fried Egg"], ["🥞", "Pancake"],
  ["🥓", "Bacon"], ["🍔", "Burger"], ["🍟", "Fries"], ["🍕", "Pizza"], ["🌭", "Hotdog"],
  ["🥪", "Sandwich"], ["🌮", "Taco"], ["🌯", "Burrito"], ["🥙", "Pita"], ["🥗", "Salad"],
  ["🍿", "Popcorn"], ["🧂", "Salt"], ["🥫", "Canned Food"], ["🍱", "Bento Box"], ["🍘", "Rice Cracker"],
  ["🍙", "Rice Ball"], ["🍚", "Rice"], ["🍜", "Noodles"], ["🍝", "Pasta"], ["🍢", "Oden"],
  ["🍣", "Sushi"], ["🍤", "Fried Shrimp"], ["🍥", "Fish Cake"], ["🥮", "Mooncake"], ["🍡", "Dango"],
  ["🥟", "Dumpling"], ["🥠", "Fortune Cookie"], ["🍦", "Ice Cream"], ["🍧", "Shaved Ice"], ["🍨", "Custard"],
  ["🍩", "Donut"], ["🍪", "Cookie"], ["🎂", "Cake"], ["🍰", "Shortcake"], ["🧁", "Cupcake"],
  ["🥧", "Pie"], ["🍫", "Chocolate"], ["🍬", "Candy"], ["🍭", "Lollipop"], ["🍮", "Pudding"],
  ["🍯", "Honey"], ["🍼", "Milk"], ["🥛", "Glass of Milk"], ["☕", "Coffee"], ["🍵", "Tea"],
  ["🍶", "Sake"], ["🍾", "Champagne"], ["🍷", "Wine"], ["🍸", "Cocktail"], ["🍹", "Tropical Drink"],
  ["🍺", "Beer"], ["🍻", "Clinking Beers"], ["🥂", "Clinking Glasses"], ["🥃", "Whiskey"], ["🥤", "Cup with Straw"],
  ["🧃", "Juice Box"], ["🧉", "Mate"], ["🧊", "Ice Cube"], ["🥢", "Chopsticks"], ["🍽️", "Plate"],
  ["🍴", "Fork and Knife"], ["🥄", "Spoon"], ["🔪", "Knife"], ["🏺", "Amphora"], ["🌍", "Earth"],
  ["🌎", "Globe"], ["🌏", "Asia"], ["🌐", "Network"], ["🗺️", "Map"], ["🧭", "Compass"],
  ["🏔️", "Mountain"], ["⛰️", "Hill"], ["🌋", "Volcano"], ["🗻", "Fuji"], ["🏕️", "Camping"],
] as const;

const GIFT_REWARDS = [
  { id: "plush", icon: "🧸", name: "Doluruu Plush Gift", detail: "Exchange one max-merged item for a plush redemption note." },
  { id: "voucher", icon: "🎟️", name: "Wonderland Voucher", detail: "Exchange one max-merged item for a saved gift voucher request." },
  { id: "mystery", icon: "🎁", name: "Mystery Gift Box", detail: "Exchange one max-merged item for a mystery gift claim." },
];

function createDefaultState(): WonderState {
  return {
    tokens: MAX_TOKENS,
    gems: 0,
    slots: Array(SLOT_COUNT).fill(null),
    index: Array.from({ length: WONDER_ITEMS.length }, (_, id) => ({ id, discovered: false, maxLevel: 0 })),
    gameLog: [],
    market: {
      playerListings: [],
      adminShop: [
        { id: 1, type: 5, level: 6, qty: 1, price: 50 },
        { id: 2, type: 10, level: 8, qty: 1, price: 200 },
      ],
    },
    nextTokenDrop: Date.now() + TOKEN_DROP_MS,
  };
}

function normalizeListing(item: unknown): MarketListing | null {
  if (!item || typeof item !== "object") return null;
  const listing = item as Partial<MarketListing>;
  return {
    id: Number(listing.id) || Date.now(),
    type: Math.min(WONDER_ITEMS.length - 1, Math.max(0, Number(listing.type) || 0)),
    level: Math.min(8, Math.max(1, Number(listing.level) || 1)),
    qty: Math.max(1, Number(listing.qty) || 1),
    price: Math.max(1, Number(listing.price) || 1),
    seller: listing.seller,
  };
}

function normalizeState(value: unknown): WonderState {
  const fallback = createDefaultState();
  const raw = value && typeof value === "object" ? value as Partial<WonderState> : {};
  const slots = Array.isArray(raw.slots) ? raw.slots.slice(0, SLOT_COUNT) : fallback.slots;
  while (slots.length < SLOT_COUNT) slots.push(null);

  return {
    tokens: Math.min(MAX_TOKENS, Math.max(0, Number(raw.tokens ?? fallback.tokens))),
    gems: Math.max(0, Number(raw.gems ?? fallback.gems)),
    slots: slots.map((item) => item && typeof item === "object" ? {
      type: Math.min(WONDER_ITEMS.length - 1, Math.max(0, Number((item as WonderItem).type) || 0)),
      level: Math.min(8, Math.max(1, Number((item as WonderItem).level) || 1)),
      qty: Math.max(1, Number((item as WonderItem).qty) || 1),
    } : null),
    index: fallback.index.map((entry, id) => {
      const saved = Array.isArray(raw.index) ? raw.index[id] : undefined;
      return {
        id,
        discovered: Boolean(saved?.discovered),
        maxLevel: Math.min(8, Math.max(0, Number(saved?.maxLevel) || 0)),
      };
    }),
    gameLog: Array.isArray(raw.gameLog) ? raw.gameLog.filter((item) => typeof item === "string").slice(0, MAX_LOG_ITEMS) : [],
    market: {
      playerListings: Array.isArray(raw.market?.playerListings) ? raw.market.playerListings.map(normalizeListing).filter(Boolean) as MarketListing[] : [],
      adminShop: Array.isArray(raw.market?.adminShop) && raw.market.adminShop.length > 0
        ? raw.market.adminShop.map(normalizeListing).filter(Boolean) as MarketListing[]
        : fallback.market.adminShop,
    },
    nextTokenDrop: Number(raw.nextTokenDrop) || fallback.nextTokenDrop,
  };
}

function formatTimer(ms: number) {
  const safeMs = Math.max(0, ms);
  const h = Math.floor(safeMs / 3600000);
  const m = Math.floor((safeMs % 3600000) / 60000);
  const s = Math.floor((safeMs % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DoluruuWonderland({ user }: { user: any }) {
  const [state, setState] = useState<WonderState>(() => createDefaultState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const saveTimer = useRef<number | null>(null);
  const loaded = useRef(false);

  const discoveredCount = useMemo(() => state.index.filter((item) => item.discovered).length, [state.index]);
  const emptySlots = useMemo(() => state.slots.filter((slot) => slot === null).length, [state.slots]);
  const maxMergedItems = useMemo(() => state.slots.filter((slot) => slot && slot.level >= 8), [state.slots]);

  const withLog = (current: WonderState, message: string): WonderState => ({
    ...current,
    gameLog: [message, ...(current.gameLog || [])].slice(0, MAX_LOG_ITEMS),
  });

  const saveState = async (nextState = state, showToast = false) => {
    setIsSaving(true);
    try {
      await fetch("/api/doluruu-game-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ state: nextState }),
      });
      setLastSavedAt(new Date());
      if (showToast) {
        setState((current) => withLog(current, "Game saved."));
      }
    } catch {
      localStorage.setItem(`doluruu-wonderland-${user?.id || "guest"}`, JSON.stringify(nextState));
      setState((current) => withLog(current, "Cloud save failed, saved in this browser for now."));
    } finally {
      setIsSaving(false);
    }
  };

  const updateState = (updater: (current: WonderState) => WonderState) => {
    setState((current) => {
      const next = normalizeState(updater(current));
      if (loaded.current) {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => saveState(next), 500);
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    async function loadState() {
      try {
        const response = await fetch("/api/doluruu-game-state", { credentials: "include" });
        const data = response.ok ? await response.json() : null;
        const localSave = localStorage.getItem(`doluruu-wonderland-${user?.id || "guest"}`);
        const nextState = data?.state || (localSave ? JSON.parse(localSave) : undefined);
        if (!cancelled) setState(normalizeState(nextState));
      } catch {
        const localSave = localStorage.getItem(`doluruu-wonderland-${user?.id || "guest"}`);
        if (!cancelled && localSave) setState(normalizeState(JSON.parse(localSave)));
      } finally {
        loaded.current = true;
        if (!cancelled) setIsLoading(false);
      }
    }
    loadState();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loaded.current || state.nextTokenDrop > now) return;
    updateState((current) => {
      const gained = current.tokens < MAX_TOKENS ? Math.min(2, MAX_TOKENS - current.tokens) : 0;
      const next = {
        ...current,
        tokens: current.tokens + gained,
        nextTokenDrop: Date.now() + TOKEN_DROP_MS,
      };
      return gained > 0 ? withLog(next, `Timer reward: +${gained} tokens.`) : next;
    });
  }, [now, state.nextTokenDrop]);

  const buyBox = () => {
    updateState((current) => {
      if (current.tokens < 10) return withLog(current, "Not enough tokens. Blind boxes cost 10.");

      const emptyIdx = current.slots.indexOf(null);
      if (emptyIdx === -1) return withLog(current, "Island is full. Sell, exchange, or merge an item first.");

      const type = Math.floor(Math.random() * WONDER_ITEMS.length);
      const nextIndex = current.index.map((entry, id) => id === type
        ? { ...entry, discovered: true, maxLevel: Math.max(entry.maxLevel, 1) }
        : entry);
      const isNew = !current.index[type].discovered;
      const nextSlots = [...current.slots];
      nextSlots[emptyIdx] = { type, level: 1, qty: 1 };

      return withLog({
        ...current,
        tokens: current.tokens - 10,
        gems: current.gems + (isNew ? 5 : 0),
        slots: nextSlots,
        index: nextIndex,
      }, isNew ? `New discovery: ${WONDER_ITEMS[type][0]} ${WONDER_ITEMS[type][1]} (+5 gems).` : `Blind box opened: ${WONDER_ITEMS[type][0]} ${WONDER_ITEMS[type][1]}.`);
    });
  };

  const dropSlot = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    updateState((current) => {
      const sourceItem = current.slots[dragIndex];
      const targetItem = current.slots[targetIdx];
      if (!sourceItem) return current;

      const slots = [...current.slots];
      if (!targetItem) {
        slots[targetIdx] = sourceItem;
        slots[dragIndex] = null;
        return { ...current, slots };
      }

      if (sourceItem.type !== targetItem.type || sourceItem.level !== targetItem.level || targetItem.level >= 8) {
        return withLog(current, targetItem.level >= 8 ? "This item is already max merged. Use Gift Exchange to redeem it." : "Only identical items at the same level can stack or merge.");
      }

      const totalQty = sourceItem.qty + targetItem.qty;
      if (totalQty < 3) {
        slots[targetIdx] = { ...targetItem, qty: totalQty };
        slots[dragIndex] = null;
        return { ...current, slots };
      }

      const mergeSize = totalQty >= 5 ? 5 : 3;
      const created = mergeSize === 5 ? Math.floor(totalQty / 5) * 2 : Math.floor(totalQty / 3);
      const remainder = totalQty % mergeSize;
      const availableSlots = slots.filter((slot, idx) => slot === null || idx === dragIndex || idx === targetIdx).length;
      if (created > availableSlots) return withLog(current, "Not enough island space to complete that merge.");

      const newLevel = targetItem.level + 1;
      slots[dragIndex] = null;
      slots[targetIdx] = remainder > 0 ? { ...targetItem, qty: remainder } : null;

      let leftToPlace = created;
      for (let i = 0; i < slots.length && leftToPlace > 0; i += 1) {
        if (slots[i] === null) {
          slots[i] = { type: targetItem.type, level: newLevel, qty: 1 };
          leftToPlace -= 1;
        }
      }

      const index = current.index.map((entry, id) => id === targetItem.type
        ? { ...entry, discovered: true, maxLevel: Math.max(entry.maxLevel, newLevel) }
        : entry);
      const maxMessage = newLevel >= 8 ? " Max merge reached. Gift Exchange is unlocked for this item." : "";
      return withLog({ ...current, slots, index }, `${mergeSize}-merge created ${created}x Lv.${newLevel} ${WONDER_ITEMS[targetItem.type][0]}.${maxMessage}`);
    });
    setDragIndex(null);
  };

  const listItem = () => {
    const price = Number(sellPrice);
    if (selectedSlot === null || !state.slots[selectedSlot] || !Number.isFinite(price) || price < 1) {
      updateState((current) => withLog(current, "Select an item and enter a token price first."));
      return;
    }

    updateState((current) => {
      const item = current.slots[selectedSlot];
      if (!item) return current;
      const slots = [...current.slots];
      slots[selectedSlot] = null;
      return withLog({
        ...current,
        slots,
        market: {
          ...current.market,
          playerListings: [
            ...current.market.playerListings,
            { ...item, id: Date.now(), price, seller: user?.username || user?.firstName || "Player" },
          ],
        },
      }, `Listed item for ${price} tokens.`);
    });
    setSelectedSlot(null);
    setSellPrice("");
  };

  const buyMarketItem = (listing: MarketListing, currency: "tokens" | "gems") => {
    updateState((current) => {
      const totalCost = currency === "tokens" ? listing.price + listing.level * 10 : listing.price;
      if (current.slots.indexOf(null) === -1) return withLog(current, "Island is full.");
      if (currency === "tokens" && current.tokens < totalCost) return withLog(current, `Need ${totalCost} tokens for this market item.`);
      if (currency === "gems" && current.gems < totalCost) return withLog(current, `Need ${totalCost} gems for this market item.`);

      const slots = [...current.slots];
      slots[slots.indexOf(null)] = { type: listing.type, level: listing.level, qty: listing.qty || 1 };
      const index = current.index.map((entry, id) => id === listing.type
        ? { ...entry, discovered: true, maxLevel: Math.max(entry.maxLevel, listing.level) }
        : entry);
      return withLog({
        ...current,
        tokens: currency === "tokens" ? current.tokens - totalCost : current.tokens,
        gems: currency === "gems" ? current.gems - totalCost : current.gems,
        slots,
        index,
        market: {
          ...current.market,
          playerListings: current.market.playerListings.filter((item) => item.id !== listing.id),
        },
      }, `Bought ${WONDER_ITEMS[listing.type][0]} Lv.${listing.level}.`);
    });
  };

  const addAdminShopItem = () => {
    const type = Math.floor(Math.random() * WONDER_ITEMS.length);
    updateState((current) => withLog({
      ...current,
      market: {
        ...current.market,
        adminShop: [...current.market.adminShop, { id: Date.now(), type, level: 1, qty: 1, price: 25 }],
      },
    }, "Admin shop item added."));
  };

  const exchangeGift = (rewardName: string) => {
    updateState((current) => {
      const maxSlotIndex = current.slots.findIndex((slot) => slot && slot.level >= 8);
      if (maxSlotIndex === -1) return withLog(current, "Gift Exchange needs one max-merged Lv.8 item.");

      const slots = [...current.slots];
      const item = slots[maxSlotIndex];
      if (!item) return current;

      if (item.qty > 1) {
        slots[maxSlotIndex] = { ...item, qty: item.qty - 1 };
      } else {
        slots[maxSlotIndex] = null;
      }

      return withLog({ ...current, slots }, `Gift exchange requested: ${rewardName} using ${WONDER_ITEMS[item.type][0]} ${WONDER_ITEMS[item.type][1]} Lv.8.`);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[420px] flex items-center justify-center rounded-3xl bg-sky-100">
        <div className="text-center text-violet-900">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto mb-4" />
          Loading Doluruu Wonderland...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-[28px] bg-gradient-to-b from-sky-200 via-cyan-100 to-lime-100 p-3 md:p-5 text-violet-950 shadow-2xl">
      <div className="relative overflow-hidden rounded-[24px] border-4 border-amber-300 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-sky-400 p-5 md:p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-yellow-200/50" />
        <div className="absolute -bottom-10 left-10 h-24 w-48 rounded-[50%] bg-emerald-300/40" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <span>🐉</span>
              Doluruu Wonderland
            </h2>
            <p className="text-white/85 text-sm mt-1">
              Open blind boxes, merge island items, complete your collection, and exchange max items for gifts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-100 text-amber-900 border border-amber-300">{state.tokens}/{MAX_TOKENS} tokens</Badge>
            <Badge className="bg-cyan-100 text-cyan-900 border border-cyan-300">{state.gems} gems</Badge>
            <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300">{emptySlots} free slots</Badge>
            <Button size="sm" onClick={() => saveState(state, true)} disabled={isSaving} className="bg-amber-400 hover:bg-amber-300 text-black">
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? "Saving" : "Save"}
            </Button>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-3 text-xs text-white/80">
          <span className="inline-flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> Next drop {formatTimer(state.nextTokenDrop - now)}</span>
          <span>{discoveredCount}/{WONDER_ITEMS.length} discovered</span>
          <span>{maxMergedItems.length} max items ready</span>
          {lastSavedAt && <span>Saved {lastSavedAt.toLocaleTimeString()}</span>}
        </div>
      </div>

      <Tabs defaultValue="island" className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-[680px] bg-white/80 border border-violet-200">
          <TabsTrigger value="island">Island</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="gifts">Gift Exchange</TabsTrigger>
        </TabsList>

        <TabsContent value="island" className="space-y-4">
          <Card className="bg-white/90 border-4 border-amber-200 shadow-lg">
            <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-bold text-violet-950 flex items-center gap-2"><Package className="w-4 h-4" /> Blind Box</h3>
                <p className="text-sm text-slate-600">Drag matching items together. Three merge up, five gives a bonus.</p>
              </div>
              <Button onClick={buyBox} className="bg-emerald-600 hover:bg-emerald-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Buy Blind Box (10 tokens)
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-[28px] border-[12px] border-emerald-700 bg-gradient-to-br from-lime-300 via-emerald-300 to-teal-300 p-3 shadow-2xl">
            <div className="grid grid-cols-8 md:grid-cols-10 gap-1.5">
              {state.slots.map((item, idx) => {
                const data = item ? WONDER_ITEMS[item.type] : null;
                return (
                  <button
                    key={idx}
                    type="button"
                    draggable={Boolean(item)}
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => dropSlot(idx)}
                    onClick={() => setSelectedSlot(item ? idx : null)}
                    className={`relative aspect-square rounded-xl border-2 flex items-center justify-center text-2xl md:text-4xl transition shadow-sm ${
                      selectedSlot === idx ? "bg-amber-100 border-amber-500 scale-[1.03]" : "bg-white/45 border-white/80 hover:bg-white/70"
                    }`}
                    aria-label={item ? `${data?.[1]} level ${item.level}` : "Empty island slot"}
                  >
                    {data?.[0]}
                    {item && <span className="absolute bottom-0.5 right-0.5 rounded bg-amber-300 px-1 text-[10px] md:text-xs font-bold text-black">L{item.level}</span>}
                    {item && item.qty > 1 && <span className="absolute top-0.5 left-0.5 rounded bg-red-500 px-1 text-[10px] md:text-xs font-bold text-white">x{item.qty}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="bg-violet-950/85 border-4 border-violet-300 text-white shadow-lg">
            <CardContent className="p-4 h-36 overflow-y-auto font-mono text-xs space-y-1">
              {state.gameLog.length === 0
                ? <p className="text-white/50">Game log will appear here and stay after refresh.</p>
                : state.gameLog.map((entry, idx) => <p key={`${entry}-${idx}`}>{entry}</p>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collection">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WONDER_ITEMS.map(([emoji, name], idx) => {
              const entry = state.index[idx];
              return (
                <Card key={name} className="bg-white/90 border-2 border-violet-100 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm text-violet-950">{entry.discovered ? `${emoji} ${name}` : "??? Locked"}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 8 }, (_, level) => (
                        <div key={level} className={`aspect-square rounded-lg flex items-center justify-center text-xl border ${
                          entry.discovered && entry.maxLevel >= level + 1 ? "bg-violet-100 border-violet-300" : "bg-slate-800 border-slate-700 text-white/30"
                        }`}>
                          {entry.discovered && entry.maxLevel >= level + 1 ? emoji : "?"}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...state.market.playerListings.map((item) => ({ ...item, currency: "tokens" as const })), ...state.market.adminShop.map((item) => ({ ...item, currency: "gems" as const }))].map((listing) => {
                const [emoji, name] = WONDER_ITEMS[listing.type];
                return (
                  <Card key={`${listing.currency}-${listing.id}`} className="bg-white/90 border-2 border-cyan-100 shadow-md">
                    <CardContent className="p-4 text-center">
                      <div className="text-6xl mb-2">{emoji}</div>
                      <h3 className="font-bold text-violet-950">{name}</h3>
                      <p className="text-sm text-slate-500">Level {listing.level}{listing.qty > 1 ? ` x${listing.qty}` : ""}</p>
                      <p className="text-sm font-semibold my-2">{listing.price} {listing.currency}{listing.currency === "tokens" ? ` + ${listing.level * 10} fee` : ""}</p>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => buyMarketItem(listing, listing.currency)}>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Buy
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-white/90 border-2 border-amber-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-violet-950">Sell Your Item</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {state.slots.map((item, idx) => item ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(idx)}
                      className={`aspect-square rounded-lg border text-3xl ${selectedSlot === idx ? "border-amber-500 bg-amber-100" : "border-slate-200 bg-slate-100"}`}
                    >
                      {WONDER_ITEMS[item.type][0]}
                    </button>
                  ) : null)}
                </div>
                <Input type="number" min="1" value={sellPrice} onChange={(event) => setSellPrice(event.target.value)} placeholder="Price in tokens" />
                <Button onClick={listItem} className="w-full bg-violet-600 hover:bg-violet-700">List Item</Button>
                {user?.role === "admin" && (
                  <Button onClick={addAdminShopItem} variant="outline" className="w-full">
                    Add Admin Shop Item
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gifts" className="space-y-4">
          <Card className="bg-white/90 border-4 border-pink-200 shadow-lg">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-violet-950 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-600" />
                    Gift Exchange
                  </h3>
                  <p className="text-sm text-slate-600">Max-merged Lv.8 items can be exchanged for gift requests.</p>
                </div>
                <Badge className="bg-pink-100 text-pink-800 border border-pink-200">{maxMergedItems.length} max items ready</Badge>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {GIFT_REWARDS.map((reward) => (
                  <div key={reward.id} className="rounded-2xl border-2 border-pink-100 bg-gradient-to-b from-pink-50 to-amber-50 p-4">
                    <div className="text-5xl mb-3">{reward.icon}</div>
                    <h4 className="font-bold text-violet-950">{reward.name}</h4>
                    <p className="text-xs text-pink-700 font-semibold mt-1">Cost: any Lv.8 item</p>
                    <p className="text-sm text-slate-600 mt-2 min-h-[42px]">{reward.detail}</p>
                    <Button
                      onClick={() => exchangeGift(reward.name)}
                      className="w-full mt-4 bg-pink-600 hover:bg-pink-700"
                      disabled={maxMergedItems.length === 0}
                    >
                      Exchange Gift
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
