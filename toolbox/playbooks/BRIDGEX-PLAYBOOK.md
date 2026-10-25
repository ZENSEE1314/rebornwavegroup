# BridgeX playbook: the whole BridgeX / BridgeXPOS system

BridgeX is the platform underneath Reborn Wave. It lets one server run many separate businesses ("companies"), each with its own POS, member app, brand, data and logins. Reborn Wave Group is the first company and the home company. This playbook covers the task, the goal, the steps in order, the rules, and what "done" looks like for running BridgeX, onboarding a company and keeping companies apart.

## 1. The task

Run a white-label business platform:

- Sell BridgeXPOS to other businesses (restaurant, beauty, retail, spa, KTV and others) from the BridgeXPOS homepage.
- Create each business as a company with its own data space, brand, app, tables, staff, products and WhatsApp.
- Give every company the same system (POS, kitchen, inventory, accounting, payroll, bookings, member app) switched on or off by what it needs.
- Keep the platform team's console separate from every company's own admin.

## 2. The goal

- A new company can be live in a day: created, branded, staffed, stocked and trading.
- No company can ever see or change another company's data, logins or settings.
- Each company looks and feels like its own product (name, logo, colours, design, pet name, language), not like Reborn.
- Money, tax, payroll and currency follow the company's country.
- The platform team manages everyone from one console without logging in as them.

## 3. The pieces

| Piece | What it is |
|---|---|
| **BridgeX host** | The address that shows BridgeXPOS (the sales homepage, apply, login, console). On it a browser is either inside a company (opened with `/t/<slug>`) or on BridgeX itself. |
| **BridgeX console** (`/bridgex`) | For the platform team only. Companies, applications, App functions, White label, Admins of each company's app. A company owner is not let in (on Reborn's own site, Reborn staff still open it for Reborn). |
| **Company** (`bridge_companies`) | One business: slug, name, app name, industry, country, currency, brand theme, plan, status, data mode. |
| **Data space** | Where its data lives (below). |
| **Company admin** | The company's own admin panel inside its app, with its own users and roles. |
| **Home company** | Reborn Wave Group. Its data stays in the platform's own tables. |
| **BridgeXPOS homepage** | A standalone sales page shown to visitors not signed in, in English, 中文 and Bahasa Indonesia. |

## 4. How a company's data is kept apart

Each company has a data mode (`bridge_companies.data_mode`):

| Mode | Where the data is | Used for |
|---|---|---|
| `schema` (default for new companies) | Its own Postgres schema `tenant_<id>` on the same server | Almost every company |
| `dedicated` | Its own server and its own database (`server_url`) | A company that needs a server of its own |
| `shared` | The platform's own tables | Only Reborn (the home company) |

How a request finds its company:

1. Its own domain, else the `X-Tenant-Slug` header or the `bx_tenant` cookie on the platform host. The page address carries `?tenant=<slug>` on the shared host.
2. The platform host, `/api/v1/*` and the `/bridgex` console are always platform data.
3. The request then runs inside that company's space; `db` talks to that schema only.

What a company's schema holds: a copy of every table except `bridge_*` (those are shared and shown as views) and `sessions`. New tables and columns in `public` are copied across at start-up. A column type change needs its own per-company step.

Logins are per space: each company has its own users and its own session cookie (`reborn.sid` for the platform, `reborn.sid.tenant_<id>` for a company), so tabs in different companies never overwrite each other's login.

## 5. The steps in order

### A. A company joins

1. **Apply or be created.** A business applies on the BridgeX host (merchant application), or the platform team creates it in the console. Choose country (sets currency, tax habits, payroll rates), industry, and slug.
2. **Review and approve** the application in the console (Applications). The owner is copied in as the company's main admin.
3. **Data space is made.** New companies get `schema` mode: an empty copy of the tables. Starter content that describes Reborn (FAQ, club name, address, download link) is not copied.
4. **Brand it** (BridgeX › White label, or the company's main admin in Admin › Settings › App design):
   - Name, app name, logo, tab icon and share picture (`pageBrand`), custom domain.
   - A design (ten dark looks, five light business styles), a colour palette or own colours, a font. The pet name and pet pictures (Admin › Pet).
   - Built-in texts say "Reborn" and "Doluruu"; they are swapped for the company's name automatically as long as texts are written through `t()` / `tr()` / `pick()`.
5. **Choose its functions.** Industry sets the starting modules. Then switch member-app features per company: BridgeX › App functions, or the company's own Admin › App features. List its industries (BridgeX › App functions › "Industries of …"); until saved, the list is the industry it was set up with.
6. **Set up the business:** tables and booking areas, tax and service fee, receipt details, payroll rules (starts from the country's statutory rates), currency display.
7. **Add the people:** the company's app admins are created and reset from the console (Companies › "Admins of the … app"). They add staff and managers themselves.
8. **Fill it:** products, stock, suppliers (Excel import), bundles, packages, happy hour.
9. **Connect channels:** WhatsApp (the company's own number: phone number ID and token in Admin › CRM, or Connect with Meta), Facebook Messenger and Instagram, Telegram bot. Each company's own settings; Meta posts every company to the platform webhook and each entry goes to the company whose page / number it names.
10. **Venue hardware** if used: receipt printer, kitchen screen, customer screen, TV screens, karaoke bridge (the setup file carries the company's address, token and slug), cameras, lights.
11. **Test day:** order, kitchen, pay by each method, refund, close the day, read the accounting and payroll pages. Then go live.

### B. Running companies day to day

1. Watch the console: applications waiting, companies by status and plan, subscription state.
2. Support a company by its slug: open `/t/<slug>` to see what it sees; never log in as its owner.
3. Reset a company admin's access from the console, not by touching its database.
4. For a platform-wide change (new feature, fix): build it once for all companies (see section 7), roll it out, then check one non-Reborn company, not only Reborn.
5. Timers (reminders, pet decay, daily tokens, error clean-up) run once per company. Wrap any new timer in `inEveryDataSpace()`.

### C. A company leaves or changes

1. Change its plan or status in the console (subscription statuses: trialing, active, and so on).
2. To move a company to its own server: switch to `dedicated` with a `server_url`, with the data copied across first. A dedicated server sets `DEFAULT_COMPANY_SLUG` (and name) so the app runs as that company.
3. Never delete a company's data without the owner's written word and a backup.

## 6. The rules

**Isolation (never break)**
- Never write `public.` in a query, and never read `platformDb` from member-app code. `db` is the company's space.
- Use `homeCompanySlug()` instead of the literal `"reborn-wave-group"`. Module-level caches and in-memory state are keyed by company.
- Only the home company stays in the platform's tables. A non-home company still `shared` is moved to its own space at start-up.
- A company's owner never enters the BridgeX console. The console is for the platform team (`canUseBridgeXConsole`).
- The BridgeX host never opens the Reborn member app; opening `/bridgex*` leaves the company.
- WhatsApp numbers, Meta tokens and the QR-linked number belong to one company; the `WHATSAPP_*` env values and the QR-linked number belong to the platform company only.

**Building for all companies**
- Every new function is built for all companies: store data through `db` / `appSettings` (per company), no module gate unless it truly needs one, and make any public page or address work for a company on the shared host (`?tenant=<slug>`).
- A new member feature needs a key in both app-feature lists so it can be switched off per company.
- Every visible text exists in English, 中文 and Bahasa Indonesia. Show money with `money()` and round with `roundMoney`; never write "RP " by hand.
- A light business design must use `var(--sk-a)` for accents and never a fixed colour; a dark design builds from `--pc-*` palette variables. Check a new design beside the others in one colour.
- Payroll rates change yearly: update the country defaults when governments do.

**Safety**
- Keys and tokens live in Admin › Settings › Keys or the host's variables, never in the repository or chat. After a leak follow `SECURITY.md`.
- Test on spare ports and an empty scratch database (`scripts/tenant-isolation-test.mts` checks isolation). Never test against the live database.
- A push to `main` is a deploy to every company.

## 7. How to change BridgeX safely (the short loop)

1. Find the real data and the cause first.
2. Make the change once, for all companies.
3. Add a unit test and an end-to-end test; run them on spare ports; include a non-Reborn company in the check when data is involved.
4. Add the note to `CLAUDE.md`.
5. Build, commit, push; update the PC copy; report what was and was not tested.

## 8. When something goes wrong

| Symptom | Likely cause | What to do |
|---|---|---|
| A company sees Reborn text, name or pet | A text not written through `t()` / `tr()` / `pick()` | Fix the text; check `brandText()` / `inBrandVoice()`. |
| A company's data shows up in Reborn, or the reverse | A query used `public.` or `platformDb`, or a cache not keyed by company | Fix the query / key; run the isolation test. |
| A company's login logs out another | Shared cookie name | Check `multiAuth` cookie per space. |
| A page opens the wrong company | Missing `?tenant=<slug>` or cookie on the shared host | Check `rememberedTenantSlug` and the address. |
| A new table or column is missing in a company | Mirror at start-up did not run, or a type change | Restart; for a type change add a per-company step. |
| WhatsApp messages go to the wrong company | Meta page / phone ID not saved on the right company | Check the company's `metaPageId` / `waPhoneId`; call `forgetMetaRoutes()` after changes. |
| A company owner cannot open the console | By design | Use the company's own admin; the platform team uses the console. |

## 9. What "done" looks like

**A company is live when**
- [ ] It exists with the right country, currency, industry and slug, in `schema` mode (or `dedicated` by decision).
- [ ] Its brand is set: name, logo, icon, design, colours, domain, pet name.
- [ ] Its functions and industries are chosen.
- [ ] Its admin can log in; staff and managers exist with the right roles.
- [ ] Tables, tax and service fee, receipt details and payroll rules are set.
- [ ] Products, stock and suppliers are loaded.
- [ ] A test day ran cleanly: order, kitchen, pay (each method), refund, close day, accounting and payroll read correctly.
- [ ] Its WhatsApp / channels answer from its own number.
- [ ] Nothing of Reborn shows in its screens, receipts, messages or emails.

**The platform is healthy when**
- [ ] The isolation test passes and no company can read another's data.
- [ ] Every timer runs once per company.
- [ ] The console shows every company with status and plan; applications are answered.
- [ ] Backups run nightly and one restore has been tried.
- [ ] Admin › Errors has nothing new that is not a known network drop.

## 10. For whoever maintains it

- Tenancy: `server/tenantContext.ts`, `server/tenantSpace.ts`, `server/multiAuth.ts`. BridgeX console and company records: `server/bridgeX.ts`. Page branding: `server/pageBrand.ts`. Skins and palettes: `shared/appSkins.ts`, `client/src/skins.css`, `components/AppSkinPicker.tsx`. Countries and money: `shared/countries.ts`, `server/companyMoney.ts`, `client/src/lib/money.ts`. Payroll rules: `shared/payrollRules.ts`. Meta and social channels: `server/metaConnect.ts`, `server/socialChat.ts`. The sales homepage: `client/public/bridgexpos-home`.
- Rules and reasons are in `CLAUDE.md`. Safety is in `SECURITY.md`. The change loop is in `PLAYBOOK.md`. The POS is in `POS-PLAYBOOK.md`.
