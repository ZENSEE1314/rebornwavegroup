# POS playbook: the whole Reborn Wave POS system

One playbook for the POS from opening the day to closing it. It covers who does what, the steps in order, the money rules, and what "done" looks like. It is written for the venue (cashiers, managers, the main admin) first, with a short section at the end for whoever maintains the system.

## 1. The task

The POS takes orders for tables and counter sales, sends food and drink to the kitchen and bar, takes payment, prints receipts, keeps stock and accounts right, and closes the day.

It works with these other parts of the system:

| Part | What it does for the POS |
|---|---|
| Member app | Members scan the table QR, order food and drinks, request songs, pay with RP credits. Their orders land on the table's bill. |
| Kitchen / bar screen (`/kitchen`) | Prints dockets, shows what to make, marks items Ready. |
| Customer screen (`/customer`) | The second monitor facing the customer: bill lines, total, event posters. |
| Inventory and Products | Items, prices, stock, bundles, packages, happy hour, ticks for discounts and commission. |
| Accounting and Payroll | Every paid bill becomes income; costs, commission and staff pay are booked from it. |
| Karaoke bridge and TV screens | Song queue and gifts. They share the table check-in, not the bill. |

## 2. The goal

- Every customer is served quickly and charged the right amount.
- Every bill is traceable: who ordered what, who made it, who collected it, who was paid.
- Stock counts and costs are right, so profit is real.
- The day closes with numbers that match the cash drawer and the card terminal.
- The POS keeps selling when the internet drops (Quick sale), and nothing is lost or counted twice afterwards.

## 3. Who does what

| Role | Can do |
|---|---|
| **Cashier / staff** | Open and add to table bills, Quick sale, take payment, print receipts and bills, keep bottles, put a bill on account, pick who earns an item's commission, use staff price, upload receipts and expenses, run the kitchen screen. |
| **Manager** (staff account with company role manager) | Everything a cashier does, plus: lower a line's price or sell at cost, daily sales, close the POS day, edit items and stock, happy hour, bulk ticks, mark supplier bills paid, void expenses. |
| **Main admin** | Everything, plus settings (tax and service fee rates, commission types, receipt QR, referral, app discount), payroll, accounting, resets, keys. Protected actions ask for the main-admin password. |
| **Kitchen / bar** | Sees accepted items of open bills, prints dockets, taps Ready. |
| **Member** | Orders from the app at a table they scanned; sees what is preparing / ready. |

The main admin can hide individual tabs from one person (Users › Which buttons can they see?). That hides buttons only; the server still decides by role.

## 4. The steps in order: a venue day

### A. Before opening

1. The POS PC / tablet is signed in with a staff account. The POS has been opened once online on each device (needed for offline mode).
2. Kitchen / bar screen is open (`/kitchen`) on its own device, printer set to print without a dialog.
3. Receipt paper is set for this PC (POS › Receipt paper: width 58 / 80 mm, shift, copies). Print the test slip if the printer changed.
4. Check the settings the day depends on (main admin or manager):
   - Tax and service fee (Admin › Accounting › Tax and service fee). A bill keeps the rates it was opened with.
   - Items: prices above 0, stock counted, sold-out items hidden. Items with price 0 or no stock do not appear.
   - Happy hour windows and weekdays, and which items are in them.
   - Commission types for bills (agents, drivers), and item commission rules (ladies drinks).
   - App-order discount and referral settings, and the per-item ticks that exclude items from them.
5. Customer screen is open on the second monitor if used.
6. Cash drawer and card terminal are ready; staff know the day runs from 08:00 to 08:00.

### B. Opening a bill

1. **Table bill:** POS › Tables › pick or type the table. One open bill per table. A table opened by a member scanning the QR already has a bill and a checked-in guest.
2. **Quick sale:** for counter sales with no table. Works offline.
3. **Tag the member** if known (search by name or phone). Needed for RP credits, packages, perks and referral.
4. **Booking guests:** a confirmed table booking checks the member in at that table; "✓ Arrived" marks them seated.

### C. Adding items

1. Open the item picker. Groups, top to bottom: 🍹 Happy hour (while a window is on), ⭐ Recommended, 📦 Packages, then categories.
2. Tap items. What the picker does for you:
   - Hides sold-out items, items with no price, and happy-hour-only items outside their hours.
   - Uses the happy hour price inside the window, and splits "buy X get Y free" into a paid line and a "(free)" line at 0.
   - "Pack ×N" adds a whole pack at the unit price. Bundles ("6 x Beer") are their own item with their own price.
   - Services (corkage, room fee) have no stock.
3. Each line records who ordered it and when ("ordered by Wati · 21:14").
4. For an item with a staff commission rule (ladies drink): pick **Commission to** on the line. With no pick it goes to the person who ordered it; if the item is limited to chosen staff, only they can be picked.
5. Correct mistakes on the line:
   - **Edit:** price of one, quantity, discount (% or amount), or sell at cost. Raising a price or changing quantity is for staff; lowering a price is for managers and the main admin.
   - **Move** to another table, **Remove**, or **Lost** (spilled or broken: leaves the bill, stock stays gone, a loss at cost is booked, and it can be charged to a staff member).
6. Member app orders arrive on the same bill. By default they are accepted at once. If the counter must accept first, tap Accept or Reject (with a reason).

### D. Kitchen and bar

1. The kitchen screen takes dockets (each item is handed out once, so two screens never print the same one) and prints one docket per order, with a beep.
2. Tabs: All · Food · Drinks · Dessert. Orders turn amber after 10 minutes and red after 20.
3. The cook taps **Ready**. Every staff device then vibrates and beeps every 3 seconds until someone taps **Collected** (the item becomes served and the member is told).
4. Service calls from a table: every staff screen alerts until someone accepts. A manager can assign a person. Done closes it.

### E. Bill and payment

1. **Check the bill.** The quote shows exactly what the server will charge: subtotal, discount, member perk, app-order discount, package credit, service fee, tax, total.
2. **Print the bill for the customer** before payment if asked (titled "BILL — please pay", no payment lines).
3. **Discounts and special prices** (only when allowed):
   - Manual discount on the bill, or per line (manager).
   - **Staff price:** 50% off, or every item at cost; no service fee, tax or member perk. The bill records whose it is.
   - **Sell at cost** (manager or main admin).
4. **Choose how it is paid:**
   - Cash (enter cash received; change is shown), card (reference), RP credits (member needed, balance checked), package credit (only items allowed for package credit), or **Split** (RP credits + card + cash together; the rest is cash).
   - **Commission box** (optional): an agent or driver, a % or fixed amount, never added to what the customer pays and never printed on the customer's copy.
   - **Keep an unfinished bottle** with this checkout (own bottle + corkage if needed).
5. **Not paid by closing time:** "Not paid: keep on account". Ask who owes it. The bill prints as "ON ACCOUNT, NOT PAID YET", the table is freed, and the bill carries over to the next day until it is paid.
6. **Pay.** The receipt prints: number within the venue day (No. 001), copies as set, optional QR (Wi-Fi, review link or other). A bill with a commission always prints the sales copy that shows the commission.
7. After payment: stock is already counted, the table's booking is marked completed when the last bill is paid, the member earns points, referral commission is paid to the referrer (if on and past the hold), staff item commission is booked.

### F. When the internet is down

1. The POS still opens and sells. Use **Quick sale** only: cash or card.
2. The sale is saved in the browser with the time the customer paid and a receipt prints from the screen's numbers.
3. When the connection returns the queue is sent in order, once each. A sale the server refuses stays in a red list with Try again / Delete.
4. Not available offline: table bills, member lookup, RP credits, packages, kitchen dockets for new orders.

### G. Refunds

1. Admin › Accounting › the bill › Refund (with a reason).
2. A refund puts stock back, returns RP credits and package credit, takes back the referral commission, cancels staff item commission not yet paid in payroll, and books the refund and any bill commission as reversed.

### H. Closing the day

1. Settle or put on account every open bill. Check tables with ready items nobody collected.
2. **Close POS day** (manager or main admin). This clears the song queue and starts a new venue day at 08:00. Open bills are not closed by it; on-account bills stay.
3. Read the closing report: cash, card, credits, package credit, commission, sales before tax, profit, and the "Not paid, carried over" list. Print it.
4. Count the cash drawer against the cash line; match the card terminal total.
5. Upload any supplier receipts or expenses the same night (Admin › Expenses; goods go to stock).

## 5. How the money is booked

| Event | What it does |
|---|---|
| Bill paid | One income entry for what was paid (credits-paid bills too). A top-up of RP credits is not income. |
| Item sold | Stock goes down (a bundle takes its units off the item). Cost uses the oldest stock first. |
| Delivery / receipt | Stock goes up at the delivery cost; one purchase expense is booked; unpaid supplier bills are tracked until paid. |
| Lost item | Leaves the bill; a loss expense at cost; optional charge to a staff member (settled in payroll). |
| Bill commission (agent, driver) | One expense; reversed on refund. |
| Referral commission | RP credits to the referrer on the paid, eligible part of a referred member's bill; held for the first hours of a new referral; reversed on refund. |
| Staff item commission (ladies drinks) | Added to that person's commission in Payroll for the month the bill is paid; settled when the pay is recorded. |
| Refund | Reverses the above as listed in step G. |

## 6. The rules

**For cashiers**
- One open bill per table. Always tag the member before paying with credits or packages.
- Do not lower a price yourself; ask a manager.
- Never delete a mistake: use Remove (before it is made), Lost (after), or ask for a refund (after payment).
- Print the bill before payment only as a courtesy; the receipt is the proof after payment.
- At closing, nothing stays open without a name: put it on account.

**For managers and the main admin**
- Price changes, staff price and at-cost sales are logged with who and why.
- Changing tax or service fee rates only affects bills opened afterwards.
- Settings that move money (resets, tax rates, commission types, keys) ask for the main-admin password or are main-admin only.
- A reset of numbers never touches sales history, accounting, bottles, packages or game ranks.

**For the system**
- Prices and discounts are worked out by the server, never trusted from the screen. The quote the POS shows is the server's answer.
- A sale made offline is booked once, at the time the customer paid.
- Every visible text exists in English, 中文 and Bahasa Indonesia.
- A new route needs a login or role guard and acts for the logged-in user only.
- Tests run on spare ports and never touch the live database.

## 7. Setting up a new venue or company

1. Create the company in BridgeX (country sets the currency and statutory rates). It gets its own data space.
2. Set tables or booking areas, receipt details (name, logo, footer, QR), tax and service fee.
3. Add products (Excel import fills inventory), stock, suppliers, prices, bundles and packages.
4. Add staff, give each a role and, where needed, payroll profile and commission rules.
5. Connect printers (receipt printer, kitchen printer), the customer screen and, if used, the karaoke bridge and TV screens.
6. Do a test day: open a table, order, kitchen Ready and Collected, pay by each method, print, refund, close the day.

## 8. When something goes wrong

| What the cashier sees | Likely cause | What to do |
|---|---|---|
| "Failed to fetch" / "No internet" | Connection to the server dropped | Use Quick sale; check Wi-Fi and the internet; the queue sends itself later. |
| "Staff only" | Signed in with a non-staff account | Sign out and use a staff account. |
| "Order not open" | The bill was already paid or cancelled on another screen | Refresh; check Sales for the paid bill. |
| Item not in the picker | Sold out, price 0, or a happy-hour-only item outside its hours | Check stock, price and the item's happy hour. |
| Receipt prints off the paper | Roll width or shift wrong | POS › Receipt paper › print the ruler slip and set width and shift. |
| A bill's total looks different | Rates are the bill's own; a perk, app discount or staff price applied | Open the quote lines; check the discount reason on the bill. |
| An expense or stock save "did not show" | Saved under another month, or it is a stock delivery | Check "saved recently" and stock deliveries in Admin › Expenses. |

The main admin reads **Admin › Errors** for the full list (grouped by area and message, kept 30 days).

## 9. What "done" looks like

**End of a good night**
- [ ] No open bills except named on-account ones.
- [ ] The POS day is closed and the closing report is printed.
- [ ] Cash and card totals match the drawer and the terminal.
- [ ] No ready items left uncollected; no service calls open.
- [ ] Every offline sale has been sent (the queue is empty).
- [ ] Supplier receipts and expenses of the day are uploaded; unpaid bills are listed with due dates.
- [ ] Admin › Errors has nothing new that is not a known network drop.

**The POS is working properly when**
- [ ] A table order from the app reaches the kitchen, the cook marks it Ready, staff collect it, and the member sees it served.
- [ ] Each payment method (cash, card, credits, package, split) pays a bill once and the receipt matches the quote.
- [ ] A refund puts stock, credits and commissions back.
- [ ] The POS sells offline and the sale arrives once when the connection returns.
- [ ] Daily sales, accounting and payroll show the same numbers the bills show.

## 10. For whoever maintains it

- Rules and the reason behind each feature are in `CLAUDE.md` (one note per feature). Safety and what to rotate after a leak are in `SECURITY.md`. The way changes are made and shipped is in `PLAYBOOK.md`.
- Code: server routes in `server/rebornGame.ts`, quote and package logic in `server/memberPackages.ts`, shared rules in `shared/`, POS screens in `client/src/pages/reborn-pos.tsx`, kitchen in `reborn-kitchen.tsx`, receipts in `client/src/lib/receipt.ts`.
- Tests: unit tests next to the code (`npx tsx --test <file>`), end-to-end scripts in `scripts/e2e/`. Run them on spare ports only.
- Before any push: build, then test. A push to `main` is a deploy to the venue.
