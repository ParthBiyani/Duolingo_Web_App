# ADR 0008: Design tokens and assets

- Status: accepted
- Date: 2026-10-08

## Context
The clone must look like Duolingo's web app while containing no copied code, fonts, logos,
illustrations or sounds.

## Decision
- **Design tokens:**
  - Colour, radius, shadow and motion values were measured from the live web app.
  - They are defined once as CSS variables for light and dark themes, then mapped into Tailwind v4 with
    `@theme inline`.
  - Components never use raw hex values.
- **Fonts:** Duolingo's own typefaces, so text renders exactly as on the original: Duolingo Sans
  (a variable font, weights 100-900, upright and italic) for all UI text and Feather Bold for the
  wordmark. They are self-hosted with `next/font/local` from `frontend/src/app/fonts`.
- **Icons and artwork:** Duolingo's own SVG files (navigation, top bar, path nodes, chests, league
  badges, shop and profile art), served from `frontend/public/duo` and rendered by `DuoImage`.
  The remaining icons, the mascot poses and the lesson characters are drawn as SVG components.
- **Picture cards:** use the platform's native emoji glyphs instead of image files.
- **Sound effects:** synthesised at runtime with the Web Audio API. There are no audio files.
- **Text-to-speech:** the browser's Speech Synthesis API.

## Consequences
- The whole visual language can be changed from one stylesheet, and dark mode is a variable swap.
- **Accepted contrast deviations:** some of the original's exact colour pairs fall below WCAG AA, for
  example white text on the brand green. These are recorded deviations. Mitigations are bold text at
  15 px or more, visible focus rings and accessible labels.
