---
name: bluegrid
description: Design system, branding boundary and white-label rules for Blue Grid, the car rental management system behind the sign-in. Use whenever editing login.html, admin/*.html, driver/*.html, css/bluegrid.css, css/app.css or tools/portal-gallery.html, or writing any copy that appears inside the portals. The public landing page is a different product with its own skill (gb-brand).
---

# Blue Grid — Car Rental Management System

Established 2026-09-25. Branch `bluegrid-portal`.

## 1. Two products, one repo

| | Product | Pages | Identity |
|---|---|---|---|
| Shopfront | **GB Car Rental** | `index.html`, `public-pay.html` | Vermillion `#FF3D00` on black, Space Grotesk. See the `gb-brand` skill. |
| The software | **Blue Grid** | `login.html`, `admin/*` (14), `driver/*` (6) | Light field, blue `#0063CC`, system stack, hard corners. |

**Do not let them touch.** `css/landing.css` is loaded only by `index.html`;
`css/bluegrid.css` only by the 21 portal pages. `css/tokens.css` and
`css/app.css` are shared by both, so **any edit to those two must be checked
against the landing page.** `app.css` currently only lends `index.html` its
`.btn`, `.btn-primary` and `.form-group` rules — everything else in it is
portal-only and safe to change.

## 2. The branding boundary

The rule is **who is looking at the screen**: Blue Grid is what the staff
operate, GB Car Rental is what the customer rents from.

| Surface | Brand |
|---|---|
| `login.html` | **Blue Grid** — the platform's front door, shared by both roles |
| `admin/*` — titles, sidebar, favicon, touch icon | **Blue Grid** |
| `driver/*` — titles, sidebar, favicon, touch icon | **GB Car Rental** |
| The 3 WhatsApp message templates | **GB** — they are sent to real drivers |
| `admin/help.html` prose | Blue Grid as the system, GB as the operator |
| `admin/help.html` sign-in domain | **GB** — a deployment fact, not branding |
| `public-pay.html`, `index.html` | **GB**, and both are out of scope |

Drivers get the identical styling but never see the words "Blue Grid".
They are GB's customers, nobody sold them Blue Grid, and a driver who signs in
to an unfamiliar brand has no way to tell it is not a phishing page. That
split is also the first proof the white-label works: one design system, two
names.

**Acceptance greps, run after any copy change:**

```
grep -rn "Blue Grid" driver/          # must return nothing
grep -rn "GB Car Rental" admin/       # only the 3 templates + help.html
```

## 3. Scoping — how the theme cannot leak

Every rule in `css/bluegrid.css` is scoped to `html[data-theme="bluegrid"]`,
and the 21 portal pages carry that attribute on `<html>`. This does two jobs:

1. **It cannot leak.** `index.html` and `public-pay.html` have no
   `data-theme`, so even linking the file into them matches nothing.
2. **It wins the cascade.** `html[data-theme] .modal` is (0,2,1); the
   page-local `<style>` blocks are (0,1,0) and load later. Without the
   attribute every rule would need `!important`.

The failure mode is therefore **all-or-nothing per page** — miss the `<link>`
or the attribute and the page is unstyled, never half themed.

```
node tools/check-portals.js      # nav drift + literal colours + inline attrs
```

## 4. Tokens

Defined under `html[data-theme="bluegrid"]` in `css/bluegrid.css`. **There is
one theme and it is light.** An earlier draft was dark; it read as "dark mode"
rather than as a product, and these are tools people use in daylight. The
Swiss/technical character is carried by hard corners, wide-tracked uppercase
micro-labels, hairline rules and a single blue — not by the background being
black.

Ratios are computed, not eyeballed, against `--surface` (#FFFFFF).

```
--bg #F7F8FA   --surface #FFFFFF   --surface-2 #F0F2F6   --surface-3 #E6E9EF
--text #0D0F12 (19.19)   --text-muted #565C66 (6.73)   --text-subtle #626973 (5.54)
--accent #0063CC (5.74)  --accent-bright #0058BD   --accent-wash #E8F0FC
--hairline #E2E5EA       --hairline-strong #8E949E (3.05)
--danger #C8102E (5.88)  --success #1D7A3E (5.38)  --warning #8A6D00 (4.92)
--r-* all 0px            (--r-round 50% owns the avatar)
--track-label 0.14em     the wide uppercase micro-label, the signature
```

**The contrast rule that shapes the palette.** `--accent` is `#0063CC`, not the
`#0080FF` this started as. On white, #0080FF is **3.80:1** and fails both as
text *and* as a fill behind white text. #0063CC clears **5.74:1 in both
directions**, which is why one value serves as link colour, focus ring and
button fill. If you ever lighten the accent, re-check both directions.

**`--hairline-strong` is for input borders**, not `--hairline`. At 1.26:1 the
decorative hairline does not meet WCAG 1.4.11's 3:1 for a control boundary;
`#8E949E` gives 3.05:1.

**The `--dark-bg` trap.** All 25 uses of this legacy alias are `color:` on
headings and values — "dark" meant "the strong text colour". It maps to
`var(--text)`, never to a background. The other live aliases: `--border` →
`--hairline`, `--light-bg` → `--surface-2`, `--primary-green` → `--accent`.

## 5. Things that will break if you forget them

- **`color-scheme: light`** on the root. It is explicit rather than omitted so
  the 16 date inputs, 22 selects and 16 file inputs stay light even for a
  viewer whose OS is set to dark. A `<select>` dropdown list is OS-drawn and
  this is the only lever over it.
- **An SVG used as a `background-image` cannot inherit CSS custom properties.**
  `img/bluegrid-car.svg` therefore hardcodes its strokes. If the palette
  moves, that file moves with it.
- **XML comments may not contain a double hyphen.** A `--token` name inside an
  SVG comment makes the file invalid, and an invalid SVG is silently not
  painted — no console error, no broken-image icon, nothing. This cost a
  debugging round on `img/bluegrid-car.svg`.
- **`js/auth.js:151-246` rewrites the topbar at runtime** and writes inline
  styles. `.topbar-user`, `.avatar`, `.who`, `.name`, `.role` and `.signout`
  are a contract with that file — do not rename them.
- **`--focus-ring`** must stay visible. It is a blue halo, not the
  `rgba(0,0,0,0.08)` the base tokens ship.

## 6. No web font, on purpose

The portals use the system stack. These pages already blank until
`requireRole()` round-trips to Supabase, and a font swap on top of that is a
second flash. The character comes from tracking, case, weight and rhythm.

If it ever reads too plain, the upgrade is **IBM Plex Sans** — not Inter,
which belongs to the landing page. `--font-mono` is defined for plates, IDs
and money; `font-variant-numeric: tabular-nums` is already on table cells and
KPI values.

## 7. Reviewing the design without credentials

The portals sit behind `requireRole()`, so they cannot be opened — let alone
screenshotted — without a login. **`tools/portal-gallery.html`** renders every
component on the real stylesheets with no Supabase and no auth. Serve the repo
over http and open it. Keep it in sync when adding a component.

## 8. White-label: what to change for operator #2

Branding is not yet in a single config — the sidebars are hand-edited markup
in 20 files. Deliberate: nav is the one thing that must work even if a script
fails, and `js/auth.js` already mutates the shell at runtime. The swap points
are therefore:

1. **`driver/*.html` (6 files)** — `<title>` and `.bg-word` carry the operator
   name. This is the only per-operator *wording* in the portal.
2. **The 3 WhatsApp templates** — `admin/drivers.html`, `admin/leads.html`,
   `admin/payment-link.html`.
3. **`login.html`** — the driver hint names the operator, and the back-link
   points at their site. An operator with no marketing site should have the
   link removed.
4. **`admin/help.html`** — the sign-in domain.
5. **`favicon.svg` and `apple-touch-icon.png`** are the *operator* icon slot;
   `favicon-bluegrid.svg` and `apple-touch-icon-bluegrid.png` are the
   *product* slot and never change. Regenerate the PNG with
   `node tools/make-touch-icon.js`.

Everything else — palette, components, nav, the product name — stays.

## 9. Known, not fixed

- **`login.html` tells drivers their password is their IC number.**
  Predictable credentials derived from a semi-public identifier, stated openly
  on the sign-in page. This wants dealing with.
- `.active` is overloaded across `.sidebar-nav a`, `.filter-bar button` and
  `.tab-bar button`. Referenced inside JS template strings, so renaming it
  means editing JS.
- No pagination anywhere; every table renders every row. Fine at 97 cars.
- 135 lines of page-local `<style>` remain across 13 files. All genuinely
  page-specific (`.photos`, `.car-header`, `.doc-slot`, `.guide`), but they
  still win the cascade over `app.css`.
