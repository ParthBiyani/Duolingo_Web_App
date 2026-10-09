# ADR 0008: Design tokens and assets

- Status: accepted (revised 2026-10-09: Duolingo's own fonts, artwork and animations replaced most
  of the original drawings)
- Date: 2026-10-08

## Context
The clone must look like Duolingo's web app. Its colours, type, icons and animations are a large part
of that look, and near-miss substitutes were noticeably off.

## Decision
- **Design tokens:**
  - Colour, radius, shadow and motion values were measured from the live web app.
  - They are defined once as CSS variables for light and dark themes, then mapped into Tailwind v4 with
    `@theme inline`.
  - Components use the tokens, not raw hex values. The exceptions are the fills inside SVG drawings.
- **Fonts:** Duolingo's own typefaces, so text renders exactly as on the original: Duolingo Sans
  (a variable font, weights 100-900, upright and italic) for all UI text and Feather Bold for the
  wordmark. They are self-hosted with `next/font/local` from `frontend/src/app/fonts`.
- **Icons and artwork:** Duolingo's own SVG files (logo, navigation, top bar, path nodes, chests,
  league badges, shop, quests and profile art, lesson controls), served from `frontend/public/duo`
  and rendered by `DuoImage`. The remaining icons, the owl's poses (empty states, interstitials,
  modals, lesson complete) and the lesson characters beside speech bubbles are original SVG
  components.
- **Animations:** Duolingo's Lottie files from `frontend/public/duo`, played with `lottie-web`: the
  characters beside the learning path (with still, grey SVGs for locked units) and the dancing owl on
  the lesson loading screen, in light and dark versions. They hold still when the system asks for
  reduced motion.
- **Picture cards:** use the platform's native emoji glyphs instead of image files.
- **Sound effects:** synthesised at runtime with the Web Audio API. There are no audio files.
- **Text-to-speech:** the browser's Speech Synthesis API.

## Consequences
- The whole visual language can be changed from one stylesheet, and dark mode is a variable swap.
- Duolingo's fonts, artwork and animations remain Duolingo's property; they are used only to reproduce
  the look in this educational clone, and the README says so.
- **Accepted contrast deviations:** some of the original's exact colour pairs fall below WCAG AA, for
  example white text on the brand green. These are recorded deviations. Mitigations are bold text at
  15 px or more, visible focus rings and accessible labels.
