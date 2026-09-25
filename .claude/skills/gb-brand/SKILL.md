---
name: gb-brand
description: Brand, design system, copy rules and competitive research for the GB Car Rental public website. Use whenever editing index.html, css/landing.css, css/tokens.css, js/i18n.js, or writing any customer-facing copy, claims or imagery for GB Car Rental. Contains the verified competitor pricing table, the claims policy for what must never be repeated, the photography standard, and the bilingual copy voice.
---

# GB Car Rental — brand and design system

Research date: **2026-09-25**. Re-verify competitor pricing before quoting it.

## 1. The business

Long-term car rental to e-hailing (Grab) drivers in Klang Valley, Malaysia.
Audience: majority male, 30-49, SPM/STPM education, RM2,000-5,000/month, most
driving for supplementary income. Mobile-first, WhatsApp-native (90.7% of
Malaysian internet users). The emotional job is "will this cost me money
before it makes me money?" — not aspiration.

Verified from the live `cars` table on 2026-09-25: **97 cars**, 93 rented,
2 maintenance, 2 retired (96% utilisation). Fleet mix Bezza 55, Alza 31,
Saga 7, plus Aruz, Vios, Axia, X90. Average age 3.5 years.

## 2. Design tokens

Defined in `css/landing.css` under `:root`. **They deliberately override
`css/tokens.css` and are scoped to the landing page only** — `landing.css`
is linked by `index.html` and nothing else, so the admin and driver portals
keep their separate monochrome system. Do not move these into `tokens.css`.

```
--bg        #0A0A0A    --surface     #FAFAFA   --surface-2 #141414
--line      #262626    --line-light  #E3E3E3
--fg        #FAFAFA    --fg-muted    #9A9A9A   --fg-on-light #0A0A0A
--accent    #FF3D00    --accent-fg   #0A0A0A   --accent-surface #FFFFFF
--accent-dim #CC3100
--font-display 'Space Grotesk'   --font-body 'Inter'
--r 0px  (hard corners everywhere, enforced by a !important reset)
```

**Contrast rules, already measured:**

| Use | Ratio | Rule |
|---|---|---|
| `#FAFAFA` on `#0A0A0A` | 18.97:1 | body text |
| `#FF3D00` on `#0A0A0A` | 5.58:1 | fine for text and UI on dark |
| `#0A0A0A` on `#FF3D00` | 5.58:1 | **text on vermillion must be near-black, never white** (white is only 3.55:1) |
| `#CC3100` on `#FAFAFA` | 5.02:1 | **vermillion on a light panel must use `--accent-dim`** (raw accent is 3.40:1) |
| `#9A9A9A` on `#0A0A0A` | 7.04:1 | muted text |

Never reduce opacity on near-black over vermillion below ~0.9; it eats the headroom.

Style basis: the `bold-typography-mobile-poster` profile from the
`ui-ux-pro-max` skill. H1 at 4-5x body, tracking `-0.03em`, 0px radius,
200ms transitions with no bounce, accent for emphasis and interaction only,
never as a large background wash except the one calculator panel.

## 3. Claims policy

**Verified by the owner, safe to state prominently:**
- 100+ cars (the table says 97 — prefer the exact number, it is more credible)
- Comprehensive insurance with **zero excess**
- **PSV licence paid for by GB** (not "arranged", not "assisted")
- Servicing, tyres, brake pads, battery, wipers, bulbs, road tax, PUSPAKOM, EVP

**Never state:**
- **"Earn up to RM1,400/week."** This is Grab's own marketing claim, copied
  verbatim by VisionCar and others. Third-party data puts real Malaysian Grab
  pay nearer RM2,135/month (about RM490-535/week). Repeating it is both
  derivative and unsubstantiable. The break-even calculator exists precisely
  to replace it.
- **Any Grab partnership or "authorised agent" badge.** Competitors assert it;
  no public Grab Malaysia partner list exists to verify against. Use checkable
  facts instead: PSV arranged, active EVP, e-hailing insurance, PUSPAKOM handled.
- Fleet-age claims — the owner chose not to publish these.
- Live availability counts — currently zero cars are free; use
  "new cars arriving monthly" instead.

**Still unsupplied** (rendered as visible `.todo` badges in `index.html`):
deposit per car, SSM number, address, opening hours, minimum contract period,
WhatsApp reply time, testimonials, and the accident / breakdown / mileage /
early-termination policies. The real contract is a per-driver PDF in a private
Supabase bucket, not in this repo. **Do not invent these answers.**

## 4. What the category does, and what we do instead

Surveyed 2026-09-25: Grab Rental, VisionCar, KiniXpress, Alpianza, Le Maju,
Flyt, Drivor, JRV, Rent N Drive, GoCar, Trevo.

**Conventions to avoid** — every one of these marks a site as generic:
blue/teal/green on white (universal; *no operator is black or vermillion*);
one car per card each shot in different light at a different angle; hero promo
carousels; the six-icon "why choose us" grid; the 1-2-3-4 step diagram; emoji
in H1s; dead adjectives (hassle-free, seamless, worry-free); "Starting From
RM__/Day" with no deposit and no total; WordPress blog furniture.

**Category-first moves we make:**
1. A break-even calculator using the driver's own takings, not a promise.
2. Deposit shown per car on the page.
3. Weekly **and** daily price (drivers divide by 7 to compare against a day's work).
4. Inclusions itemised to the part — "brake pads", not "maintenance included".
5. Per-car prefilled WhatsApp deep links.
6. A sticky WhatsApp bar in the thumb zone, not a dismissible green bubble.

**Competitor weekly pricing, retrieved 2026-09-25 — re-verify before quoting:**

| | GB | VisionCar | KiniXpress | Alpianza | Grab |
|---|---|---|---|---|---|
| Saga | **RM330** | RM430 | — | RM400 | — |
| Bezza | RM420 | RM430 | RM380 | — | — |
| Alza | RM460 | — | RM450 | RM500 | — |
| Deposit | per car | RM100 + variable | undisclosed | RM1,000 | RM500 + RM150 admin |

GB's Saga undercuts VisionCar by RM100/week. Lead with it.

## 5. Photography standard

The three files in `img/` are **borrowed, not GB's**, and must be replaced:
`saga.jpg` is a stranger's car with plate VV 7935 legible; `bezza.jpg` is a
Perodua motor-show press photo; `alza.jpg` looks like a video frame with the
plate crudely whited out. `index.html` masks the visible plates with
`.plate-mask` as a stopgap only.

**Shot brief for replacements:** underground car park at night or an empty
industrial road at golden hour. Mark **one** ground position and shoot every
car from it. Phone is fine, portrait mode off, landscape. Per car: 3/4 front
with wheels turned, straight side profile, front three-quarter low, wheel
detail, interior from the driver's door. All cars facing the **same
direction**, same distance, same height. Consistency beats equipment — it is
the mismatch between the current three, not the amateurism, that reads cheap.

Fallback if a reshoot slips: cutouts via Pixian.ai (about $0.05/image) onto a
flat field with a synthetic contact shadow. Does not fix the licensing problem.

## 6. Copy voice

English default, Bahasa Malaysia one tap away. Strings live in `js/i18n.js`
as a flat key dictionary; `data-i18n` on the element, `data-i18n-attr` for
attributes. **Both blocks must have identical key sets.** Verify with:

```
node -e 'const fs=require("fs");const window={};eval(fs.readFileSync("js/i18n.js","utf8"));const en=Object.keys(window.GB_I18N.en),ms=Object.keys(window.GB_I18N.ms);console.log(en.length,ms.length,en.filter(k=>!ms.includes(k)));'
```

Voice: short declaratives. Name the mechanism instead of asserting a benefit
("bring the car to our panel workshop", not "hassle-free servicing"). State
exclusions plainly rather than burying them. No emoji, no exclamation marks.

The Malay reads naturally, but **a native speaker should review it before
launch** — machine-sounding BM is worse than English for this audience.

## 7. Known constraints

- No build step, no npm, no framework. Vanilla files plus CDN scripts only.
- Existing CDNs: jsDelivr (Supabase, xlsx), Google Fonts.
- **Lead form contract:** ids `lead-form`, `lead-name`, `lead-whatsapp`,
  `lead-email`, `lead-car`, `lead-submit`, `lead-feedback`; `preferred_car`
  option values exactly `saga`/`bezza`/`alza` — `admin/leads.html` maps these
  slugs to labels and to the Excel export. Script order must stay
  Supabase CDN, then `js/supabase.js`, then `js/i18n.js`, then the page script.
- Grid and flex children need `min-width: 0` or long strings blow out the
  mobile layout. There is a safety-net rule at the end of `landing.css`.
- Touch targets 44px minimum.

## 8. Open security issue

`sql/schema.sql:523-525` grants anon `SELECT` on **all columns** of `cars`:

```sql
CREATE POLICY cars_public_select ON public.cars
    FOR SELECT TO anon, authenticated USING (true);
```

With the anon key published in `js/supabase.js`, anyone can read
`cars.purchase_price`, `purchase_date`, `plate_number` and `notes` — what the
owner paid for every vehicle. Narrow this to a view exposing only
`model, weekly_rate, status`. Unrelated to the redesign; still outstanding.

## 9. Using the ui-ux-pro-max skill on this machine

Its documented command is broken: `${CLAUDE_PLUGIN_ROOT}` is unset for a
user-level skill, and bare `python` resolves to the Microsoft Store stub.
It runs via the absolute interpreter path:

```
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" "$env:USERPROFILE\.claude\skills\ui-ux-pro-max\scripts\search.py" "<query>" --domain <style|color|typography|ux|landing|gsap> -n 5 --full
```

The data is plain CSV under that skill's `data/` directory and can also be
read directly with grep or node, which is what this project did.
