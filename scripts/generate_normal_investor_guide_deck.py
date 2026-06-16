from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "investor-decks"
ASSETS = ROOT / "attached_assets"

BG = RGBColor(3, 21, 26)
PANEL = RGBColor(10, 42, 48)
PANEL_2 = RGBColor(13, 58, 65)
GOLD = RGBColor(248, 212, 119)
CYAN = RGBColor(34, 211, 238)
GREEN = RGBColor(52, 211, 153)
PINK = RGBColor(244, 114, 182)
VIOLET = RGBColor(167, 139, 250)
WHITE = RGBColor(255, 255, 255)
MUTED = RGBColor(185, 202, 207)
LINE = RGBColor(31, 82, 90)
FONT = "Aptos"

DISCLAIMER = (
    "Investment returns are projections, not guaranteed returns. Investors should review the "
    "agreement, business risk, local law, tax, and accounting advice before joining."
)

BUSINESS_ZONES = [
    ("1FA", "Kids Fun House", "S$63K setup", "Family traffic, games, birthdays"),
    ("1FB", "KTV Lounge", "S$126K setup", "Open singing and competitions"),
    ("2FA", "Beauty Salon", "S$56K setup", "Beauty appointments and event prep"),
    ("2FB", "Private KTV Rooms", "S$137K setup", "Four private rooms for groups"),
    ("3FA", "Beauty Salon", "S$56K setup", "Premium guest service add-on"),
    ("3FB", "VIP KTV Rooms", "S$155K setup", "VIP hosting and higher spend"),
    ("4F", "Pet Cafe", "S$180K setup", "Family, pets, cafe, blindbox tie-in"),
    ("5F", "Live House", "S$259K setup", "Band, events, dance floor, sea view"),
]


def tx(slide, text, x, y, w, h, size=18, color=WHITE, bold=False, align=None):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    p = tf.paragraphs[0]
    if align:
        p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def rect(slide, x, y, w, h, fill=PANEL, line=None, radius=True):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    shp = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.color.rgb = line or LINE
    shp.line.transparency = 22
    return shp


def image(slide, filename, x, y, w, h=None):
    path = ASSETS / filename
    if not path.exists():
        return
    if h:
        slide.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w), height=Inches(h))
    else:
        slide.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w))


def add_bg(slide):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = BG
    rect(slide, 10.55, -0.2, 2.4, 7.9, RGBColor(8, 55, 61), RGBColor(8, 55, 61), False)
    for i, color in enumerate([CYAN, GOLD, GREEN]):
        shp = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9.2 + i * 0.55), Inches(0.45 + i), Inches(2.3), Inches(2.3))
        shp.fill.solid()
        shp.fill.fore_color.rgb = color
        shp.fill.transparency = 83
        shp.line.transparency = 100


def footer(slide):
    tx(slide, "Reborn Wave Group | Normal Investor Guide | SGD model", 0.55, 7.05, 7.1, 0.2, 7, MUTED)
    tx(slide, "Projected returns only, not guaranteed.", 8.3, 6.95, 4.3, 0.24, 6, MUTED, align=PP_ALIGN.RIGHT)


def title(slide, heading, sub=None):
    tx(slide, "REBORN WAVE GROUP | NORMAL INVESTOR GUIDE", 0.55, 0.25, 4.8, 0.28, 9, MUTED, True)
    tx(slide, heading, 0.55, 0.62, 9.4, 0.72, 30, WHITE, True)
    if sub:
        tx(slide, sub, 0.58, 1.28, 9.2, 0.5, 12, MUTED)


def card(slide, x, y, w, h, heading, body, accent=CYAN, body_size=9):
    rect(slide, x, y, w, h, PANEL)
    tx(slide, heading, x + 0.18, y + 0.14, w - 0.36, 0.32, 13, accent, True)
    tx(slide, body, x + 0.18, y + 0.54, w - 0.36, h - 0.62, body_size, MUTED)


def metric(slide, x, y, w, label, value, accent=GOLD):
    rect(slide, x, y, w, 0.78, RGBColor(7, 39, 45), accent)
    tx(slide, value, x + 0.12, y + 0.12, w - 0.24, 0.28, 16, accent, True, PP_ALIGN.CENTER)
    tx(slide, label, x + 0.12, y + 0.45, w - 0.24, 0.2, 7, MUTED, False, PP_ALIGN.CENTER)


def cover(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    image(slide, "rwg-logo.png", 0.65, 0.42, 1.18)
    tx(slide, "Reborn Wave Group", 0.72, 1.65, 6.2, 0.7, 38, WHITE, True)
    tx(slide, "Normal Investor Account + Investment Guide", 0.76, 2.54, 6.35, 0.42, 18, GOLD, True)
    tx(slide, "How to set up an account, choose a business zone, invest part by part, and track returns through the investor portal.", 0.76, 3.25, 5.95, 1.0, 13, WHITE)
    rect(slide, 7.05, 0.9, 5.15, 5.6, PANEL_2)
    image(slide, "image_1764558901062.png", 7.38, 1.16, 4.45, 2.42)
    image(slide, "doluruu-blindbox-box.jpeg", 7.55, 3.88, 2.1, 1.22)
    image(slide, "doluruu-female-transparent.png", 10.0, 3.6, 1.12)
    tx(slide, "Investor portal: rebornwave.group/investor", 7.42, 5.55, 4.45, 0.35, 14, GOLD, True, PP_ALIGN.CENTER)
    footer(slide)


def investment_model(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "What The Investment Is", "A normal investor joins selected Reborn Wave business zones and tracks the investment through the portal.")
    card(slide, 0.72, 1.82, 3.55, 1.46, "Business-backed", "Investor funds are linked to real club business zones: KTV, beauty, kids fun house, pet cafe, and live house.", CYAN, 10)
    card(slide, 4.55, 1.82, 3.55, 1.46, "70/30 profit model", "Monthly net profit is split 70% to the operator/investor side and 30% to Reborn Wave Group.", GOLD, 10)
    card(slide, 8.38, 1.82, 3.55, 1.46, "6-month target", "Base case targets setup capital recovery in 6 months. Month 7 onward is projected profit.", GREEN, 10)
    metric(slide, 1.05, 4.0, 2.2, "Currency", "SGD", CYAN)
    metric(slide, 3.55, 4.0, 2.2, "Rental support", "$0 rent", GOLD)
    metric(slide, 6.05, 4.0, 2.2, "Rent-free period", "24 months", GREEN)
    metric(slide, 8.55, 4.0, 2.2, "Unit size", "75 sqm", PINK)
    card(slide, 1.05, 5.34, 9.7, 0.74, "Investor reminder", "Returns depend on actual sales, costs, reporting accuracy, and business performance. The numbers are projections, not promises.", VIOLET, 9)
    footer(slide)


def account_setup(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "How To Set Up An Account", "The portal keeps investor registration, dashboard access, wallet records, and investment tracking separate from normal club members.")
    steps = [
        ("1. Open portal", "Go to rebornwave.group/investor and choose Investor Login."),
        ("2. Register", "Create account with name, email, password, and referral code if someone invited you."),
        ("3. Verify", "Reborn Wave admin confirms your identity, contact details, and investment agreement before activation."),
        ("4. Dashboard", "After login, investors see packages, zones, wallet activity, tokens, QR spending, and payout status."),
    ]
    for i, (h, b) in enumerate(steps):
        card(slide, 0.72 + (i % 2) * 5.95, 1.8 + (i // 2) * 1.82, 5.45, 1.32, h, b, [CYAN, GOLD, GREEN, PINK][i], 10)
    card(slide, 0.72, 5.62, 11.4, 0.72, "Account links", "Investor home: rebornwave.group/investor   |   Login/Register: rebornwave.group/investor/login   |   Dashboard: rebornwave.group/investor/dashboard", VIOLET, 9)
    footer(slide)


def invest_step_by_step(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "How To Invest Step By Step", "A clear flow from interest to active investment.")
    steps = [
        ("Choose", "Select the business zone you want to join."),
        ("Review", "Check setup capital, monthly net projection, payback target, and risk note."),
        ("Allocate", "Choose full-zone or partial participation agreed with Reborn Wave."),
        ("Sign", "Sign agreement covering amount, term, reporting, payout, and exit rules."),
        ("Pay", "Submit payment proof and wait for admin confirmation."),
        ("Track", "Watch monthly reports, payouts, spending wallet, and token activity."),
    ]
    for i, (h, b) in enumerate(steps):
        x = 0.72 + (i % 3) * 4.05
        y = 1.75 + (i // 3) * 1.78
        card(slide, x, y, 3.55, 1.28, f"{i + 1}. {h}", b, [CYAN, GOLD, GREEN, PINK, VIOLET, CYAN][i], 9)
    card(slide, 0.72, 5.56, 11.25, 0.78, "Simple explanation for investors", "You do not need to fund the whole building. You can start with one selected zone, then add more zones after performance and reporting are proven.", GOLD, 9)
    footer(slide)


def part_by_part(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "Part-By-Part Investment Options", "Investors can compare business zones by floor, setup capital, and customer engine.")
    headers = ["Zone", "Business", "Setup", "Why customers come"]
    widths = [0.8, 2.45, 1.35, 6.65]
    x0, y0 = 0.7, 1.58
    x = x0
    for h, w in zip(headers, widths):
        rect(slide, x, y0, w, 0.42, RGBColor(8, 61, 68), CYAN, False)
        tx(slide, h, x + 0.05, y0 + 0.1, w - 0.1, 0.14, 7, WHITE, True, PP_ALIGN.CENTER)
        x += w
    for i, row in enumerate(BUSINESS_ZONES):
        y = y0 + 0.45 + i * 0.52
        x = x0
        for c, (val, w) in enumerate(zip(row, widths)):
            fill = RGBColor(7, 39, 45) if i % 2 == 0 else RGBColor(9, 48, 54)
            rect(slide, x, y, w, 0.5, fill, LINE, False)
            color = GOLD if c == 2 else WHITE if c in [0, 1] else MUTED
            tx(slide, val, x + 0.05, y + 0.12, w - 0.1, 0.16, 7, color, c in [0, 1, 2], PP_ALIGN.CENTER if c < 3 else None)
            x += w
    tx(slide, "All setup figures are SGD base-case estimates. Partial participation depends on signed agreement and available allocation.", 0.75, 6.42, 10.5, 0.26, 8, MUTED)
    footer(slide)


def dashboard_tracking(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "What Investors Track After Joining", "The dashboard should make investment performance simple to understand.")
    items = [
        ("Investment status", "Active zone, invested amount, activation date, and agreement reference."),
        ("Monthly report", "Revenue, operating costs, net profit, operator share, and Reborn share."),
        ("Payback tracker", "Capital recovery progress toward the 6-month target."),
        ("Wallet + QR", "Club spending wallet, QR payment history, and top-up records."),
        ("Tokens", "Daily token claims from eligible blindbox/pet ownership and reward activity."),
        ("Payouts", "Withdrawal request, approval status, and payout history."),
    ]
    for i, (h, b) in enumerate(items):
        card(slide, 0.72 + (i % 3) * 4.05, 1.75 + (i // 3) * 1.72, 3.55, 1.22, h, b, [CYAN, GOLD, GREEN, PINK, VIOLET, CYAN][i], 9)
    card(slide, 0.72, 5.48, 11.25, 0.78, "Admin verification", "Admin confirms payment, activates the investment, updates packages, checks monthly reports, and approves withdrawals.", GOLD, 9)
    footer(slide)


def blindbox_benefit(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "Investor Blindbox Benefit", "Normal investors also join the Doluruu pet ecosystem.")
    rect(slide, 0.78, 1.78, 4.1, 3.9, PANEL_2, CYAN)
    image(slide, "doluruu-blindbox-box.jpeg", 1.02, 2.02, 3.55, 2.05)
    image(slide, "doluruu-female-transparent.png", 1.55, 4.0, 1.05)
    image(slide, "Doluruu Boy_1749664545355.png", 2.85, 4.02, 1.0)
    card(slide, 5.25, 1.8, 3.05, 1.25, "Free blindbox", "Each investor receives one blindbox benefit when their investment is activated.", GOLD, 10)
    card(slide, 8.65, 1.8, 3.05, 1.25, "Daily care", "Feed and care for pets daily to collect tokens inside the ecosystem.", CYAN, 10)
    card(slide, 5.25, 3.45, 3.05, 1.25, "Male + female", "If the investor owns one male and one female, they can receive one baby pet.", PINK, 10)
    card(slide, 8.65, 3.45, 3.05, 1.25, "Token utility", "Tokens can be used for eligible exchange prizes, rewards, or campaigns.", GREEN, 10)
    card(slide, 5.25, 5.1, 6.45, 0.76, "Example", "Three pets can generate three daily token opportunities, subject to app rules and active campaign terms.", VIOLET, 9)
    footer(slide)


def payout_and_risk(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "Payouts, Documents, And Risk Controls", "A proper investor flow needs clear proof, reporting, and protections.")
    card(slide, 0.72, 1.78, 3.55, 1.35, "Documents", "Investor agreement, payment proof, allocation confirmation, and monthly report record.", CYAN, 10)
    card(slide, 4.55, 1.78, 3.55, 1.35, "Reports", "Shared POS or audited monthly report should verify sales, costs, and net profit.", GOLD, 10)
    card(slide, 8.38, 1.78, 3.55, 1.35, "Payout", "Profit share can be paid out, kept in wallet, spent in club, or reinvested by agreement.", GREEN, 10)
    card(slide, 0.72, 3.72, 5.45, 1.45, "Risk controls", "Minimum reporting standards, admin verification, operator review, and replacement rights for inactive/non-performing operators.", PINK, 10)
    card(slide, 6.48, 3.72, 5.45, 1.45, "Investor protection", "Do not rely only on projections. Review legal, tax, accounting, local licensing, and operational risk before investing.", VIOLET, 10)
    tx(slide, DISCLAIMER, 0.85, 5.72, 10.8, 0.48, 9, MUTED)
    footer(slide)


def next_steps(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    title(slide, "Next Steps For A New Investor", "Use this flow to move from interest to a confirmed account.")
    steps = [
        ("1. Visit investor page", "Open rebornwave.group/investor and read the available packages/zones."),
        ("2. Create account", "Register and save login details for the investor dashboard."),
        ("3. Contact Reborn Wave", "Ask admin to confirm the latest allocation, agreement, and payment method."),
        ("4. Choose investment part", "Select one business zone or agreed partial allocation."),
        ("5. Submit proof", "Send payment proof and wait for admin activation."),
        ("6. Track monthly", "Review dashboard, reports, payout status, and token activity."),
    ]
    for i, (h, b) in enumerate(steps):
        card(slide, 0.85, 1.34 + i * 0.78, 10.9, 0.58, h, b, [CYAN, GOLD, GREEN, PINK, VIOLET, CYAN][i], 8)
    tx(slide, DISCLAIMER, 0.85, 6.18, 10.8, 0.45, 8, MUTED)
    footer(slide)


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    cover(prs)
    investment_model(prs)
    account_setup(prs)
    invest_step_by_step(prs)
    part_by_part(prs)
    dashboard_tracking(prs)
    blindbox_benefit(prs)
    payout_and_risk(prs)
    next_steps(prs)
    OUT.mkdir(exist_ok=True)
    output = OUT / "Reborn-Wave-Normal-Investor-Guide-EN.pptx"
    prs.save(output)
    return output


if __name__ == "__main__":
    print(build())
