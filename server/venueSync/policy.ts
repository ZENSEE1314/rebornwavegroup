// Which tables the venue server and the cloud keep in step, and how.
//
// Every change to these tables is logged by a database trigger (infra.ts) and replayed on the other side (apply.ts):
//  - a new row is inserted (never overwritten), a deleted row is deleted;
//  - an updated row sends only the columns that changed, so two sides changing different columns of one row (a phone changes a name in the cloud, the
//    venue spends credits) never undo each other; the same column changed on both sides while apart: the later change that arrives wins;
//  - a "counter" column (credits, stock, points…) sends the difference, not the new number, so a sale at the venue and a top-up in the cloud both count.
// Not replicated: investor, toy / collection / marketplace, star and tournament tables, push subscriptions, sessions, error logs, WhatsApp CRM.

export type Scope = "all" | "company" | "companyRow" | "users";

export interface TableSpec { tbl: string; counters?: string[]; scope?: Scope }

const t = (tbl: string, counters: string[] = [], scope: Scope = "all"): TableSpec => ({ tbl, counters, scope });

export const REPLICATED_TABLES: TableSpec[] = [
  // people and company
  t("users", ["credits", "loyalty_points", "lifetime_points", "tokens", "kgold", "referral_earnings", "mpoint"], "users"),
  t("bridge_companies", [], "companyRow"),
  t("bridge_branches", [], "company"),
  t("bridge_company_modules", [], "company"),
  t("bridge_positions", [], "company"),
  t("bridge_company_members", [], "company"),
  t("bridge_staff_profiles", [], "company"),
  t("bridge_staff_reviews", [], "company"),
  t("bridge_payments", [], "company"),
  t("app_settings"),
  // POS, stock, money
  t("pos_products", ["stock"], "company"),
  t("pos_tickets", [], "company"),
  t("pos_ticket_items"),
  t("pos_orders"),
  t("pos_order_items"),
  t("stock_movements", [], "company"),
  t("ledger_entries", [], "company"),
  t("expense_uploads", [], "company"),
  t("expense_vendors", [], "company"),
  t("receipt_memory", [], "company"),
  t("payslips", [], "company"),
  t("staff_contracts", [], "company"),
  t("staff_attendance", [], "company"),
  t("worker_shifts", [], "company"),
  t("leave_requests", [], "company"),
  t("bottle_keeps", ["quantity"]),
  t("member_packages", ["uses_left", "credit_left"], "company"),
  t("member_package_uses"),
  t("topup_requests"),
  t("payment_methods"),
  t("admin_logs"),
  // the member app at the venue
  t("venue_checkins", [], "company"),
  t("member_wallet_transactions"),
  t("credit_history"),
  t("points_history"),
  t("token_transactions"),
  t("commission_history"),
  t("referrals"),
  t("daily_checkins"),
  t("spin_prizes", [], "company"),
  t("spin_results", [], "company"),
  t("kos_gift_types", [], "company"),
  t("kos_gifts", [], "company"),
  t("songs", ["request_count"], "company"),
  t("song_requests", [], "company"),
  t("events", [], "company"),
  t("faq_items"),
  t("promotion_banners"),
  t("game_ranks"),
  t("pvp_game_scores", [], "company"),
  t("game_scores"),
  t("friendships"),
  t("chat_messages"),
  t("support_tickets"),
  t("support_messages"),
  t("appointments", [], "company"),
  t("appointment_events"),
  t("pets", ["total_tokens_earned", "pills_used"]),
  t("pet_care_activities"),
  t("daily_care_status"),
  t("activation_codes"),
  t("pet_pills"),
];

/** New ids made on the venue PC start here, so they can never equal an id made in the cloud (ids there stay far below). */
export const VENUE_ID_START = 1_000_000_000;
export const SYNC_BATCH_ROWS = 300;
export const SYNC_BATCH_BYTES = 2_000_000;
export const SYNC_EVERY_MS = 10_000;
export const SYNC_LOG_KEEP_DAYS = 7;
