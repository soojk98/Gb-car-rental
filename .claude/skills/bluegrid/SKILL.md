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
| The software | **Blue Grid** | `login.html`, `admin/*` (14), `driver/*` (6) | Near-black, electric blue `#0080FF`, system stack, hard corners. |

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

Drivers get the identical dark styling but never see the words "Blue Grid".
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
or the attribute and the page is fully light, never half dark.

```
node tools/check-portals.js      # nav drift + literal colours + inline attrs
```

## 4. Tokens

Defined under `html[data-theme="bluegrid"]` in `css/bluegrid.css`. Ratios are
computed, not eyeballed.

```
--bg #0B0B0C   --surface #121316   --surface-2 #191A1E   --surface-3 #232429
--text #F2F4F7 (17.86)   --text-muted #9BA1AC (7.58)   --text-subtle #7D8490 (5.22)
--accent #0080FF (5.18)  --accent-bright #3B9BFF (6.86)  --accent-wash #0A1F33
--hairline #24262B       --hairline-strong #5D6069 (3.13)
--danger #FF6B6B  --success #4ADE80  --warning #FBBF24
--r-* all 0px  (--r-round 50% owns the avatar)
--track-label 0.14em     the wide uppercase micro-label, the signature
```

**Two rules that must not be broken:**

1. **Text on a blue fill must be near-black.** White on `#0080FF` is
   **3.80:1** and fails body text. So the primary button is a *white*
   rectangle with near-black text (17.86:1) and blue is reserved for borders
   and state. Active filter pills and tabs use accent text on `--accent-wash`,
   never a blue fill.
2. **Blue *text* uses `--accent-bright`.** `--accent` falls to 4.08:1 on a
   hovered row (`--surface-3`), which fails. `--accent-bright` holds 5.40:1.

**The `--dark-bg` trap.** All 25 uses of this legacy alias are `color:` on
headings and values — "dark" meant "the strong text colour". It therefore
maps to **`var(--text)`, i.e. white**. Mapping it to a dark value turns 25
headings invisible. The other live aliases: `--border` → `--hairline`,
`--light-bg` → `--surface-2`, `--primary-green` → `--accent`.

## 5. Things that will break if you forget them

- **`color-scheme: dark`** on the root. Without it the 16 date inputs, 22
  selects and 16 file inputs render as light OS widgets, and a `<select>`
  dropdown list is OS-drawn and cannot be styled any other way.
- **Chrome autofill** paints inputs near-white and ignores `background`. The
  only override is `-webkit-box-shadow: 0 0 0 1000px <colour> inset`.
- **`::-webkit-calendar-picker-indicator`** is a dark SVG and vanishes on a
  dark input; it needs `filter: invert(1)`.
- **`--focus-ring`** was `rgba(0,0,0,0.08)` — invisible on black. Keyboard
  focus disappears entirely if this is not redefined.
- **Print stays light.** `admin/help.html` is the one thing here that gets
  printed; a black page is unreadable and empties a toner cartridge.
- **`js/auth.js:151-246` rewrites the topbar at runtime** and writes inline
  styles. `.topbar-user`, `.avatar`, `.who`, `.name`, `.role` and `.signout`
  are a contract with that file — do not rename them.

## 6. No web font, on purpose

The portals use the system stack. These pages already blank until
`requireRole()` round-trips to Supabase, and a font swap on top of that is a
second flash which is *more* visible on black than on white. The character
comes from tracking, case, weight and rhythm.

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
