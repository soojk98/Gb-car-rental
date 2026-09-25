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
- 100+ cars. **Stated as a fixed "100+", not a live count.** The table read 97
  on 2026-09-25; the owner asked for the rounded claim, so the stats band is
  hardcoded and must not be wired back to the database.
- Comprehensive insurance with **zero excess**
- **PSV licence paid for by GB** (not "arranged", not "assisted")
- Servicing, tyres, brake pads, battery, wipers, bulbs, road tax, PUSPAKOM, EVP
- **Deposit equals one week's rental** and is refundable: RM330 Saga, RM420
  Bezza, RM460 Alza. Day one therefore costs two weeks' rental. The owner
  chose to publish the deposit but *not* a bundled "total to drive away"
  figure, so state the deposit per car and leave the arithmetic to the reader.
- **Opening hours: 8:30am to 5:30pm, every day.**

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
- **Company registration / SSM number** — the owner asked for this to be off
  the page. Do not reinstate it.
- A street address. The location line says **"Klang Valley"** and nothing more,
  so the section heading must not promise "a real address" (it reads
  "Real people. Fast replies.").
- Live availability counts — currently zero cars are free; use
  "new cars arriving monthly" instead.

**Still unsupplied** (rendered as visible `.todo` badges in `index.html`):
minimum contract period,
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
| Deposit | **= 1 week** (RM330/420/460) | RM100 + variable | undisclosed | RM1,000 | RM500 + RM150 admin |

GB's Saga undercuts VisionCar by RM100/week. Lead with it.

## 5. Fleet imagery: line art, not photography

**There are no photographs on the landing page and there should not be.** The
three files that used to be there (`img/saga.jpg`, `img/bezza.jpg`,
`img/alza.jpg`) were other people's: a stranger's car with a legible plate, a
Perodua press photo and what looked like a video frame. They were replaced on
2026-09-25 with inline SVG side-profile drawings.

The drawings are generated by `tools/build-car-art.js`, which rewrites the
three `<svg class="car-art">` blocks in `index.html` in place. It is
idempotent — re-run it after any edit rather than hand-editing path data.

Rules the drawings follow, and that any replacement must keep:

- **One shared grid.** 800x400 viewBox, ground line y=348, rocker y=286,
  wheel centres x=170 and x=588 at r=56, arch radius 66. Three cars on one
  grid is what makes them a set; it is what the three photos never were.
- **The rocker sits above the axle centre** (286 vs 292), as on a real car.
  Drop it below and the body swallows the wheels and turns slab-sided.
- **The hood rises to meet the beltline at the cowl.** A step at the base of
  the windscreen is the single strongest 1980s cue.
- **Drawn to published dimensions**, not by eye — Saga 4331x1491mm,
  Bezza 4150x1510mm, Alza 4445x1630mm. The height/length ratio drives the
  roofline y: 104, 100 and 86 respectively.
- **Generic profiles.** A sedan and an MPV. They must never be presented as
  photographs of specific vehicles; the `<title>` on each says "line drawing
  of a four-door sedan", not "Proton Saga".
- Stroke colours come from the tokens: body and tyres `--fg`, rims and the
  ground line `--accent`, glass and panel lines `--fg-muted`. The body
  outline carries `pathLength="1"` so the scroll-driven draw-on animation
  needs no JS to measure it.

The old CSS photo treatment (grayscale grade, two-axis mask, radial vignette,
`.plate-mask`) is gone. Do not reintroduce it.

**If real photography ever replaces this**, the shot brief is: underground car
park at night or an empty industrial road at golden hour, one marked ground
position, every car shot from it, all facing the same direction at the same
distance and height. Phone is fine, landscape, portrait mode off. Consistency
beats equipment — it was the mismatch between the old three, not the
amateurism, that read cheap.

## 5a. Share card

`img/share-card.png` is the `og:image`. It is generated from
`tools/share-card.html`, which pulls the real `landing.css` tokens and the
real Saga drawing so it cannot drift from the site. Regeneration instructions
are in a comment at the top of that file. The current capture is 787x413 —
above the 600x315 minimum for a large card but short of the ideal 1200x630, so
re-render it bigger if you get the chance and update `og:image:width`/
`og:image:height` in `index.html` to match.

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

## 8. Closed: anon read access to `cars`

`schema.sql:523-525` used to grant `anon` `SELECT` on **all columns** of
`cars`, which with the published anon key exposed `purchase_price`,
`purchase_date`, `plate_number` and `notes` for all 97 vehicles.

Fixed by `sql/migration_cars_rls_hardening.sql`, applied to the live project
on 2026-09-25 and verified: `cars` returns `[]` to anon, and
`submit_public_payment()` no longer echoes the plate back on failure, which
had let an anonymous caller enumerate plate numbers one guess at a time.
Drivers keep a row-scoped read via `cars_driver_select` because
`driver/payments.html:95` needs it.

**If a public "cars available" count is ever wanted, do not reopen the table** —
expose a view with only safe columns, as documented at the foot of that
migration. Note the landing page deliberately does not use a live count:
utilisation is ~96%, so it would usually read 0.

## 9. Using the ui-ux-pro-max skill on this machine

Its documented command is broken: `${CLAUDE_PLUGIN_ROOT}` is unset for a
user-level skill, and bare `python` resolves to the Microsoft Store stub.
It runs via the absolute interpreter path:

```
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" "$env:USERPROFILE\.claude\skills\ui-ux-pro-max\scripts\search.py" "<query>" --domain <style|color|typography|ux|landing|gsap> -n 5 --full
```

The data is plain CSV under that skill's `data/` directory and can also be
read directly with grep or node, which is what this project did.
