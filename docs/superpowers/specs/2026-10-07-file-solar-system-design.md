# File Solar System: hero, How it syncs, login

Date: 2026-10-07
Status: approved in brainstorming, pending spec review
Scope: `apps/web` only. No API, schema, or extension change.

## Goal

Replace the encryption-focused orbit visuals with one plain-language "solar system of files" that:

1. On the landing hero, shows ten Cursor setup items orbiting a planet. Each item is clickable and explains itself.
2. Continues by scroll into How it syncs, where the same planet becomes machine 01 and rockets carry copies to a cloud station and then to machine 02.
3. On the auth pages, spins as a visual only, then expands to the center after a successful sign-in or sign-up and shows a recovery-key warning.

Non-goals: technical crypto explanations, new dependencies, changing how keys are created or stored.

## Decisions

| Topic | Decision |
| --- | --- |
| Architecture | Approach A: one shared file-orbit module, thin per-page scenes. |
| Passphrase on login | The website never shows a key. It says the extension shows the recovery key once. Zero-knowledge stays true (`db/init/004_e2e_keys.sql` stores only wrapped keys). |
| Orbit items | All ten items in the table below. |
| Hero layout | Centered stack: headline, sub line, and buttons on top; planet system large and centered below. `CursorWindowMock` is deleted. |
| Hero click | Orbits ease to a stop, the camera flies to the item, other items dim, and a side card shows the explanation. |
| Hero to story | One pinned journey on one canvas: hero, then handoff, then steps 01 to 04. |
| Story driver | Scroll pin kept. Step clicks scroll to timeline labels. Autoplay scrolls the page and stops on any user input. |
| Login success | Manual "Continue in Cursor" button. No auto-redirect. |
| Dependencies | None added. `ScrollToPlugin` and `Flip` ship in the installed `gsap` 3.15. |

## Orbit items (`apps/web/src/lib/syncedFiles.ts`)

One data module. Every scene and card reads it. Each entry has `id`, `label`, `kind: "file" | "folder"`, `whatItIs`, `howItHelps`.

| Label | Kind | What it is | How it helps you |
| --- | --- | --- | --- |
| `settings.json` | file | Your editor preferences: theme, font, tab size. | Every computer looks and feels the same. |
| `keybindings.json` | file | Your keyboard shortcuts. | Your hands do not relearn anything. |
| `rules/` | folder | Instructions that tell the AI how you like to work. | The AI follows your style on every computer. |
| `skills/` | folder | Step-by-step playbooks the AI agent can use. | Your agent knows the same tricks everywhere. |
| `mcp.json` | file | The list of outside tools your AI can use. | You set them up once; every computer has them. |
| `extensions` | file | The list of extensions you have installed. | A new computer gets the same add-ons. |
| `snippets/` | folder | Short code templates you type often. | Your shortcuts for common code come with you. |
| `AGENTS.md` | file | Project notes the AI reads before it starts. | The AI gets the same briefing on every computer. |
| `hooks.json` | file | Small automatic actions around the AI's work. | Your safety checks run everywhere. |
| `commands/` | folder | Your custom slash commands. | Your own commands work on every computer. |

The copy is final unless the spec review changes it.

## Module layout

All scene modules follow `.cursor/rules/threejs-scenes.mdc`: plain TS, `create<Name>Scene(host, state)` returns `{ state, dispose }` or `null`, mounted with `useLazyScene`, disposables registered on the stage.

| File | Status | Job |
| --- | --- | --- |
| `scenes/fileSystemOrbits.ts` | new | Builds the ten items on about four tilted orbit planes with mixed direction and speed, seeded. Owns item meshes (document card or folder tab), labels, hit spheres, hover glow, dimming, and `focus(id) / release()` targets. Exposes `update(deltaSeconds, motionScale)`, `pickables`, `itemWorldPosition(id)`. |
| `scenes/landingJourneyScene.ts` | new | Hero plus story in one scene: bergamot planet (machine 01), cloud station, obsidian planet (machine 02), camera shots, focus fly-to, raycast picking. Reads a `JourneyState` by reference. |
| `scenes/syncRockets.ts` | new | Pool of ten small rockets (lathe body, nose, three fins), file-name label sprites, analytic arc paths for leg 1 (machine 01 to station) and leg 2 (station to machine 02), fading trail, exhaust sprite. |
| `components/FileFocusCard.tsx` | new | The side card in the hero focus mode: name, what it is, how it helps you, close, previous, next. Styles live in `LandingPage.css`. |
| `components/HowItSyncsSection.tsx` | edit | Becomes the story overlay inside the journey stage: title, clickable steps 01 to 04, rail, play/pause, note. |
| `pages/LandingPage.tsx` (+ `.css`) | edit | One pinned journey stage with the canvas, hero copy, and story overlay. Hash `#how-it-syncs` scrolls to the end of the handoff. |
| `scenes/authOrbitScene.ts` | new | Obsidian planet with the shared orbits, no picking, `expand` state for the success moment. |
| `components/AuthLayout.tsx` (+ `.css`) | edit | Swaps to `authOrbitScene`, removes the terminal card, accepts a `connected` flag that runs the Flip expansion. |
| `pages/AuthForm.tsx` | edit | After `saveToken`, switches to a connected view instead of navigating. "Continue in Cursor" navigates to `continuePath`. |
| `scenes/syncStoryProps.ts` | edit | Keeps the passphrase key; the relay becomes the cloud station; unused parts are removed. |
| `scenes/planetOrbitScene.ts` | delete | Removed after the last import is gone. |
| `scenes/orbitFileLabel.ts` | edit | `sealed` tone removed when unused. |

Each new file stays at or under 300 lines. If a file would pass that, split it by job.

## Section 1: hero

- Layout: centered stack. The canvas fills the pinned stage. The planet sits centered under the copy.
- Copy: no encryption words. Title "Your Cursor setup, in orbit." Sub line "Settings, rules, and skills follow you to every computer."
- Orbits: about four planes with different tilt, radius, direction, and mean motion. One seed fixes the layout. Motion uses `deltaSeconds`. Item orientation follows the existing travel-forward plus planet-radial-up frame with `slerp` and `1 - exp(-lambda * dt)`. Labels keep the existing clearance rule.
- Hover: raycast against hit spheres; cursor becomes a pointer; the hovered item glows a little.
- Focus:
  - Click starts a GSAP tween on `focus` from 0 to 1 over about 1.2 s.
  - Orbit speed scales by `1 - focus` and reaches 0 in about 0.4 s.
  - The camera interpolates from the hero shot to a shot derived from the item's size and position. Position uses `lerp`, view direction uses `slerp`, in one stage with no second smoother.
  - Other items dim to about 30 percent.
  - `FileFocusCard` appears beside the item, placed from its projected screen position and clamped to the viewport.
- Leave focus: close button, Esc, click on empty space, or any scroll. Previous/next moves to the adjacent item without a full release.
- Accessibility: canvas stays `aria-hidden`. A visually hidden list of ten buttons, shown on keyboard focus, drives the same focus API. The card is a labelled region; Esc closes it; focus returns to the button that opened it.
- Reduced motion: orbits frozen; focus cuts instead of flying.

## Section 2: hero to How it syncs

### Scroll structure

One ScrollTrigger timeline pins the journey stage from the top of the page.

| Segment | Approx. length | What happens |
| --- | --- | --- |
| Hero | 0.4 viewport | Hero is interactive. Scrolling out of it releases any focus. |
| Handoff | 1 viewport | Hero copy fades up. The camera pulls back. The planet glides left and becomes machine 01 with its items still orbiting. Station and machine 02 fade in. Story title and steps fade in. Picking turns off. |
| Steps 01 to 04 | 3.4 viewports | Scroll-scrubbed story. Timeline labels `step1` to `step4`. |

`#how-it-syncs` and the nav link scroll to the handoff end with `ScrollToPlugin`, using the trigger's computed position. Maker section and footer follow the pin unchanged.

### Step copy

| Step | Title | Detail |
| --- | --- | --- |
| 01 | Install | Add Cursor Sync to Cursor. Your setup is the little world of files around your computer. |
| 02 | Secret word | Pick a passphrase. Only you know it, and every copy is locked with it. |
| 03 | Copy up | Cursor Sync sends copies to a safe spot in the cloud. Your originals stay right where they are. |
| 04 | Copy down | Your other computer uses the same passphrase to get the copies. Now both match. |

Note line: "Nothing moves. Everything is copied. Only your passphrase opens the copies." The telemetry line with AES, R2, and ciphertext is removed.

### Visuals per step

- 01: machine 01 framed with its ten items orbiting.
- 02: the passphrase key appears over machine 01; a soft lock ring pulses once around the planet.
- 03: ten rockets launch from machine 01 with a stagger, each labelled with its item. The original item pulses as its copy leaves and stays in orbit. Rockets dock at the station; the station glows and keeps a small ring of copies.
- 04: rockets launch from the station to machine 02. Each copy joins machine 02's own orbit. End state: both planets show the same ten items.

### Rocket motion

- Per-rocket leg progress is a pure function of story progress, item index, and stagger. Scrubbing backward reverses cleanly. No time-based state in the travel.
- Paths are arcs (quadratic or cubic Bezier) from the planet surface to the station and from the station to machine 02.
- Orientation comes from the path tangent with the arc normal as up; exhaust flicker uses elapsed time inside a bounded envelope.
- The trail samples the path behind the rocket and fades by a normalized lifetime curve. The pool is allocated once.

### Camera

Authored shots per step, blended by story progress: 01 and 02 frame machine 01, 03 widens to the station, 04 is the wide shot with all three bodies. The existing narrow-aspect fit stays.

### Clickable steps and autoplay

- Click on a step: `gsap.to(window, { scrollTo: trigger.labelToScroll("stepN"), duration: 1.4, ease: "power2.inOut", autoKill: true })`.
- Autoplay states: `idle`, `waiting`, `playing`, `stopped`.
  - `waiting` starts when the story segment is active and there has been no scroll for 2 s.
  - `playing` holds each step about 5 s, then scrolls to the next label. It stops at 04 with no loop.
  - Any `wheel`, `touchstart`, `keydown`, or `pointerdown` from the user, or an `autoKill`, moves to `stopped`.
  - Hidden tab pauses autoplay. Leaving the story segment resets it to `idle`.
- A play/pause button next to the rail shows the state and can restart from the current step.
- Reduced motion: autoplay never starts by itself; step clicks jump without smooth scroll.

## Section 3: login

- All auth pages: the visual panel shows `authOrbitScene` (obsidian planet, ten items, spinning, no picking). The `$ cursor-sync status` terminal card is removed.
- Success in `AuthForm` (sign in and sign up):
  1. Save the token as today. Set view to `connected`.
  2. `AuthLayout` runs GSAP `Flip`: the visual panel grows from the left column to the center; the form card fades out.
  3. Scene `expand` tween from 0 to 1: the planet scales up and centers; orbits widen; one halo pulse shifts from cyan to bergamot orange.
  4. Success panel fades in over the planet:
     - Title: "You're connected."
     - Body: "Your recovery key appears once, in the Cursor Sync extension, right after you continue."
     - Warning: "Save it somewhere safe, like a password manager. This is the only time it is shown. If you lose it, you'll need to restart syncing, and some files may be missing afterwards."
     - Button: "Continue in Cursor", which navigates to the existing `continuePath`.
- Reduced motion or WebGL off: no expansion; the success panel replaces the form card directly.
- Error paths are unchanged: a failed sign-in keeps the form and shows the existing errors.

## Error handling

- WebGL unavailable: `useLazyScene` sets `data-webgl="off"`. Each host keeps a CSS gradient fallback. Hero item explanations stay reachable through the button list; the card then shows centered without a fly-to.
- Label font load failure: labels fall back to the system monospace font (current `loadLabelFont` behavior).
- Scroll plugin tween killed by the user: autoplay goes to `stopped`; no retry.
- Scene disposal: all tweens and ScrollTriggers sit in `gsap.context()` and are reverted; window listeners are removed through stage disposables.

## Testing and verification

Vitest (`npm test -w @cursor-sync/web`):

- Seeded orbit placement: same seed, same positions; every item stays outside the planet radius plus label clearance.
- Rocket leg progress: monotonic in story progress, 0 before the leg, 1 after, staggered per index.
- Step label mapping and autoplay transitions, including the stop on user input.

Build: `npm run build -w @cursor-sync/web` must exit 0.

Browser, driven path, with screenshots:

- Hero at rest, hero with one item focused (card visible), Esc release.
- Mid-handoff, then steps 01 to 04, one capture each.
- Step click scrolls to the right step; autoplay starts after idle and stops on wheel.
- Sign-in success against the local API: expansion, success panel, Continue navigates to `/auth/continue`. If the local API is not running, this is reported as an unverified gap.

Gap: no React component test library exists in `apps/web`; the connected view is verified in the browser only.

## Delivery

Per-turn limits (at most 200 production lines, 6 files, 2 new production files) split the build into about four stops, each verified:

1. `syncedFiles.ts`, `fileSystemOrbits.ts`, plus tests.
2. `landingJourneyScene.ts`, hero layout, focus card, picking.
3. `syncRockets.ts`, handoff and story steps, clickable steps, autoplay.
4. `authOrbitScene.ts`, auth layout and success flow, cleanup, rule update.

The spec is not committed. Commits need explicit user permission.
