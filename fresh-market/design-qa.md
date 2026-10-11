# Design QA

Source visual truth: selected option 2, `C:/Users/Administrator/.codex/generated_images/01a1244d-5b4f-7761-87f0-33e6d75eb970/exec-f4151a73-575e-4aaa-b662-8f365b0691b7.png`.

Implementation: `artifacts/qa-home-before.png`; checkout `artifacts/10-checkout.png`; profile `artifacts/15-mine.png`.

Viewport: browser 1400 x 1200; device screen verified 393 x 852 CSS pixels, deviceScaleFactor 1. Source is 853 x 1844 pixels; reference proportions normalized to device width. The reference excludes device chrome; the protected runtime includes the status bar, camera and home indicator. These system elements are intentionally retained.

State: homepage, all categories, two items in cart, guest. The reference and captured homepage were opened together in one image comparison input. Checkout and profile were inspected in that same review. Fine text and price/button regions were readable at the original screenshot dimensions.

## Findings — first review

- P2: Product content remains visible below the fixed bottom navigation in the home-indicator region. The app footer must extend its opaque cream surface through its own lower safe area without replacing the runtime indicator.
- P2: Homepage heading-to-photo spacing is larger than the normalized reference. Reduce the heading padding and short-rule margins to recover the reference's vertical rhythm.
- P2: Screenshot evidence contains transient toast messages and pointer hover effects. Move the pointer outside the device and wait for status messages to finish before recapturing.
- P2: Browser reports a missing favicon. Supply a real image favicon and repeat the console check.
- P2: An overstock cart created by guest/account merging cannot decrement one step while still above the available stock. Permit downward correction while continuing to block checkout until the quantity is valid.

## Required fidelity surfaces

- Typography: Noto Serif SC used for editorial headings; neutral sans-serif used for controls and body copy. Source's custom wordmark is represented by the same app name in the editorial font; the tiny ornamental leaf is a minor remaining difference.
- Spacing/layout: source hierarchy and flat product presentation retained; heading spacing and bottom safe-area coverage require the fixes above.
- Colors: warm cream, dark olive text and orange actions match the selected direction.
- Imagery: individually generated warm natural-light tomato, apple, egg, greens, milk and salmon photos; no placeholders or handcrafted product drawings.
- Copy: PRD constraints retained, including demo-only notices, zero delivery fee, fixed specifications and no payment. Additional pages inherit the selected visual system; the source specifies only the homepage.

## Interaction evidence

The first browser run navigated 25 screenshots and completed guest add-to-cart, login, address creation, checkout, success, cancellation, persisted reload, identity separation, sample read-only, out-of-range address saving, sold-out and low-stock checks. The run ended at the console assertion because favicon.ico returned 404; it is not recorded as a passing run.

## Implementation checklist

- Apply the recorded fixes.
- Recapture at the same viewport and compare again.
- Repeat end-to-end checks including merged overstock correction and expiry reset.
- Inspect all page screenshots, then update this report with final evidence.

## Final verification

All P2 findings above are resolved. The footer now paints through the device bottom safe area; the homepage heading spacing is reduced; screenshots dismiss transient status messages; the favicon loads; merged quantities can be reduced until they match stock. A further P2 was discovered in the expiry state: the initially open sheet mounted outside the device before its portal was ready. Mounting that sheet after the screen reference is ready fixes it. Its final measured width is 393 pixels and its bounds remain within the device.

Reference `artifacts/reference.png` and final `artifacts/01-home.png` were opened together and compared at normalized device width. The cream/olive/orange palette, editorial type hierarchy, full-width tomato photo, product pricing and compact navigation are retained. The system status bar and home indicator reduce the visible content area; the second product remains scrollable. The wordmark's ornamental leaf and small type/crop differences are P3 polish, not blockers.

All 13 primary pages and 14 supplemental states were inspected, including the corrected `artifacts/27-expired.png`. The gallery at `screens.html` contains all 27 captures and every image was verified loaded. At browser widths 1400, 800 and 390 the protected phone scales within the viewport without horizontal overflow; screenshot evidence is in `artifacts/viewport-800.png` and `artifacts/viewport-390.png`. The mobile-sized browser preview uses the template's scaled phone rather than a fullscreen native app.

The latest full browser run passed all 15 checked flows in `artifacts/interaction-results.json`, with no console or page errors. This includes checkout, cancellation, account isolation, one-time cart merge, overstock correction and seven-day expiry reset. A separate real-browser geometry assertion confirmed the expiry sheet is contained within the phone. `npm run build` passed TypeScript, Vite and integrity checks for all 28 protected runtime files. The build has a nonblocking bundle-size advisory.

Accessibility review: inputs have labels, product images have text alternatives, icon-only primary controls have accessible labels, focus outlines are visible, and selected/disabled/error states have textual cues. Small secondary text and some compact auxiliary targets can be enlarged in a later accessibility refinement. No claim of full WCAG conformance is made.

final result: passed
