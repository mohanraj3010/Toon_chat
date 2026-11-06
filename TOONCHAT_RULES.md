TOONCHAT — PERMANENT PROJECT RULES (read before every task)

PRODUCT
Name: ToonChat. Tagline: "Don't just text. Express yourself."
A premium cartoon social messaging platform: messaging + expressive avatars,
reactions, stickers, stories and a living cartoon world (Maple Park).
It is NOT: a generic SaaS dashboard, a WhatsApp/Discord clone, an AI dashboard,
a children's educational app.

VISUAL SOURCE OF TRUTH  (/references)
- ChatGPT master reference.png  -> overall brand, mood, palette, style (highest priority)
- desktop.jpg      -> desktop messenger layout
- mobile-home.jpg  -> mobile home / chat list
- mobile-chat.jpg  -> mobile conversation
- avatar.jpg       -> avatar creator direction
- toon-world.jpg   -> ToonChat World / Maple Park
Always re-open the relevant reference image before building a screen.
Extract real values from them (colors, radii, outline weight, shadow style,
spacing rhythm, character proportions). Understand the visual language; never
paste or trace them. Characters must be ORIGINAL.

VISUAL LANGUAGE (defaults until tokens are extracted from references)
- Warm, bright, friendly. Light-first. Soft cream/off-white surfaces, not pure white.
- Chunky rounded shapes (radius 16-28px), confident dark-ink outlines (2-3px) on
  key elements, soft offset "sticker" shadows, playful but readable.
- Rounded display font for headings (e.g. Fredoka / Baloo 2) + clean friendly body
  font (e.g. Nunito). Self-host via @fontsource. No CDN font links.
- Characters are part of the layout, not decoration pasted on top.
- BANNED: neon, cyberpunk, dark-first UI, heavy glassmorphism, gradient overload,
  purple-blue "AI" gradients, generic dashboard cards, stock icons everywhere,
  lorem ipsum, placeholder grey boxes.

TECH STACK
React + TypeScript (strict) + Vite. React Router. Server state: TanStack Query.
UI state: Zustand (small stores only). Animation: Motion (framer-motion) used
sparingly, CSS transitions first. Validation: Zod. Styling: CSS variables for
design tokens + CSS Modules (or one consistent approach chosen in Phase 0 and
never mixed). Icons: one icon set only. Avatars/characters: layered SVG.

ARCHITECTURE RULES
- Feature-based folders: src/app, src/features/<feature>, src/shared/{ui,hooks,lib,types},
  src/design-system (tokens, primitives), src/services (api, realtime), src/assets.
- UI components never call fetch/WebSocket directly. They use hooks -> services.
- All data access sits behind typed interfaces so mock data can be swapped for the
  real API without touching components.
- No giant files. Component files < ~250 lines. No duplicated components.
- No any, no ts-ignore, no unused code, no console.log left behind.
- Env config via import.meta.env + a typed env.ts. Never hardcode secrets or URLs.
- Never delete working features. Never rewrite unrelated code. Edit incrementally.
- Don't invent fake "backend" code before the backend phases. Demo data lives in
  one clearly-labelled mock layer (src/services/mock) that implements the same
  interfaces the real API will.

UX QUALITY BAR
- Every async surface has: idle, loading (skeleton, not spinner-only), success,
  error (with retry), empty (with a cartoon character + friendly copy).
- Every interactive element has hover, focus-visible, active, disabled states.
- Touch targets >= 44px on mobile. Respect prefers-reduced-motion.
- Accessibility: semantic HTML, labels, alt text, keyboard navigation, focus
  trapping in modals, aria-live for toasts/typing, contrast >= WCAG AA.
- Animations 120-300ms, transform/opacity only, never block interaction.
- Demo copy must be natural, short, human. Realistic names, times, previews.

DEFINITION OF DONE (every phase)
1. npx tsc --noEmit  -> zero errors
2. npm run lint      -> zero errors/warnings introduced
3. npm run build     -> succeeds
4. npm run dev       -> runs, zero console errors/warnings in browser
5. Visually verified at 1440px, 1024px, 768px, 390px, 360px
6. Compared side-by-side against the matching reference image
7. Report written (what was built, files changed, known gaps, screenshots listed)
8. STOP. Do not start the next phase.

HONESTY RULE
If something doesn't work, say so plainly in the report. Never claim a test
passed that you didn't run. Never say "done" without running the app.