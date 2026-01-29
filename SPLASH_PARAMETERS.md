# Splash screen — adjustable parameters

Reference for all tunable values: **range** (min ↔ max or options) and **current value**.

---

## Layout (grid)

| Parameter | Where | Range | Current |
|-----------|--------|--------|---------|
| **Column ratio** (video : photo : text) | `.splash-content` `grid-template-columns` | e.g. `1fr 1fr 1fr` (equal) or `0.5fr 2fr 1fr` | `minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)` — middle (photo) is 2× the sides |
| **Gap between blocks** | `.splash-content` `gap` | `clamp(min, preferred, max)` — min ~0.5rem, max ~4rem | `clamp(1rem, 3vw, 2.5rem)` → ~16px–40px |
| **Padding around content** | `.splash-content` `padding` | `clamp(min, preferred, max)` — e.g. 0.5rem–4rem | `clamp(1rem, 4vw, 3rem)` → ~16px–48px |

---

## Video block

| Parameter | Where | Range | Current |
|-----------|--------|--------|---------|
| **Max height** | `.splash-video-container` `max-height` | e.g. 50vh–90vh | `70vh` (70% of viewport height) |
| **Aspect ratio** | `.splash-video-container` `aspect-ratio` | e.g. `1` (square), `16/9`, `4/3`, `auto` | `1` (square) |
| **Video opacity** | `.splash-video` `opacity` | 0–1 | `0.7` |

---

## Photo block

| Parameter | Where | Range | Current |
|-----------|--------|--------|---------|
| **Max height** | `.splash-photo img` `max-height` | e.g. 50vh–90vh | `70vh` |
| **Border radius** | `.splash-photo img` `border-radius` | 0–2rem | `0.5rem` (~8px) |
| **Shadow** | `.splash-photo img` `box-shadow` | any CSS shadow | `0 0.625rem 2.5rem rgba(0,0,0,0.5)` |

---

## Description (text + button)

| Parameter | Where | Range | Current |
|-----------|--------|--------|---------|
| **Text font size** | `.splash-description p` `font-size` | clamp: min ~0.75rem, max ~1.5rem | `clamp(0.9rem, 1.15em, 1.25rem)` |
| **Text color** | `.splash-description p` `color` | any hex/rgb | `#7CBFD6` |
| **Text weight** | `.splash-description p` `font-weight` | 100–900 | `300` |
| **Line height** | `.splash-description p` `line-height` | 1.2–2 | `1.6` |
| **Gap (paragraph ↔ button)** | `.splash-description` `gap` | clamp: ~0.5rem–2rem | `clamp(0.75rem, 2vh, 1.25rem)` |
| **Button padding** | `.splash-telegram-btn` `padding` | vertical: 0.25rem–1rem; horizontal: 0.5rem–2.5rem | `clamp(0.5rem,1.5vh,0.75rem) clamp(1rem,3vw,1.875rem)` |
| **Button border radius** | `.splash-telegram-btn` `border-radius` | 0.5rem–3rem | `1.5625rem` (pill) |
| **Button background** | `.splash-telegram-btn` `background-color` | rgba(255,255,255, 0–0.3) | `rgba(255,255,255,0.1)` |
| **Button hover scale** | `.splash-telegram-btn:hover` `transform` | scale(1)–scale(1.2) | `scale(1.05)` |

---

## Hint (“Кликните по экрану…”)

| Parameter | Where | Range | Current |
|-----------|--------|--------|---------|
| **Font size** | `.splash-hint p` `font-size` | clamp: ~0.7rem–1.2rem | `clamp(0.8rem, 1vw + 0.5rem, 1rem)` |
| **Color** | `.splash-hint p` `color` | any | `#7CBFD6` |
| **Bottom padding** | `.splash-hint` `padding-bottom` | clamp: 0.5rem–5rem | `clamp(1rem, 5vh, 3rem)` |
| **Letter spacing** | `.splash-hint p` `letter-spacing` | 0–0.15em | `0.05em` |

---

## Background

| Parameter | Where | Range | Current |
|-----------|--------|--------|---------|
| **Screen background** | `.splash-screen` `background-color` | any | `#000000` |

---

## Media queries (breakpoints)

| Parameter | Where | Range | Current |
|-----------|--------|--------|---------|
| **Tablet** | `@media (max-width: 1024px) and (min-width: 769px)` | e.g. 768–1280 | 769px–1024px |
| **Mobile** | `@media (max-width: 768px)` | e.g. 480–900 | ≤768px |
| **Small mobile** | `@media (max-width: 480px)` | e.g. 320–600 | ≤480px |
| **Landscape mobile** | `@media (max-width: 768px) and (orientation: landscape)` | — | ≤768px + landscape |

---

**File to edit:** `styles.css` — search for `splash` to find these selectors.
