# ADR 0008: Design tokens and original assets

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
- **Font:** Nunito, an open-licence rounded typeface loaded through `next/font`, stands in for the
  proprietary one.
- **Icons, mascot and characters:** hand-written SVG React components drawn for this project. The
  mascot is an original green owl.
- **Picture cards:** use the platform's native emoji glyphs instead of image files.
- **Sound effects:** synthesised at runtime with the Web Audio API. There are no audio files.
- **Text-to-speech:** the browser's Speech Synthesis API.

## Consequences
- The whole visual language can be changed from one stylesheet, and dark mode is a variable swap.
- **Accepted contrast deviations:** some of the original's exact colour pairs fall below WCAG AA, for
  example white text on the brand green. These are recorded deviations. Mitigations are bold text at
  15 px or more, visible focus rings and accessible labels.
