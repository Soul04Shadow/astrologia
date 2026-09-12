---
name: Vedic AI Astrologer
description: A calibrated, scholarly Vedic consultation workstation pairing exact astronomical calculation with grounded AI interpretation.
colors:
  primary: "#ea580c"
  primary-hover: "#c2410c"
  primary-deep: "#9a3412"
  primary-surface: "#fff8e7"
  primary-highlight: "#fef3c7"
  accent-brass: "#c9a23f"
  accent-goldline: "#e0cb96"
  canvas: "#f7f1e1"
  surface: "#fffcf2"
  surface-base: "#f1e8d2"
  text-primary: "#292524"
  text-secondary: "#57534e"
  text-muted: "#78716c"
  text-inverse: "#ffffff"
typography:
  display:
    fontFamily: "Inter, Noto Sans Devanagari, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, Noto Sans Devanagari, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, Noto Sans Devanagari, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, Noto Sans Devanagari, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, Noto Sans Devanagari, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  card-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: Vedic AI Astrologer

## Overview

**Creative North Star: "The Astrolabe Atelier (Tempered by the Sidereal Sanctuary)"**

Vedic AI Astrologer is a modern professional consultation instrument, not a consumer horoscope toy. The interface channels the precision, craftsmanship, and geometric exactness of a finely calibrated astrolabe, tempered by the quiet restraint, dignity, and comfortable reading calm required in a serious practitioner consultation. It approaches Vedic astrology as a classical mathematical discipline, presenting astronomical chart coordinates, dasha sequences, and planetary dignities with uncompromising clarity.

The visual language completely rejects historical cosplay, pseudo-spiritual gimmickry, and faux-mysticism. There are no aged vellum textures, faux parchment stains, ornamental Sanskrit borders, decorative zodiac-wheel illustrations, or skeuomorphic brass hardware. It is a contemporary, clean web workstation whose dignity arises from structured typography, precise hairline boundaries, and harmonious tonal planes.

Every surface is calibrated for high information density without visual exhaustion. Astrologers and seekers can scan complex planetary tables, examine D1 and D9 divisional charts, and read in-depth multilingual consultations in English or Hindi with serene focus and zero decorative distraction.

**Key Characteristics:**
- **Calibrated Geometric Precision:** Clean 1px hairline rules, exact geometric chart diagrams, and tabular alignment.
- **Tonal Plane Architecture:** Soft transitions across Sandalwood Cream, Warm Ivory, and Sandalwood Base rather than floating card drop shadows.
- **Action-Confined Saffron:** Intense saffron accents reserved strictly for decisive actions, active states, and emphasis (≤10% visual surface).
- **Dual-Script Typographic Equilibrium:** Seamless harmony between Latin characters (Inter) and Devanagari script (Noto Sans Devanagari).
- **Context-Adaptive Density:** Tight, scan-efficient data tables alongside comfortable, tranquil reading prose.

## Colors

The palette is rooted in classical natural pigments—saffron flame, temple brass, sandalwood cream, and charcoal ink—disciplined into a strictly flat, non-gradient professional system.

### Primary
- **Saffron Ochre** (`#EA580C`): The primary interaction accent. Used with discipline for primary action buttons, active navigation markers, key chart indicators, and user consultation bubbles.
- **Saffron Ochre Deep** (`#C2410C`): Hover state for primary interactive elements and section overline titles.
- **Saffron Ochre Dark** (`#9A3412`): High-contrast textual emphasis, app branding title, and active chart hover indicators.
- **Saffron Tint** (`#FEF3C7`): Subtle focus rings, active session row highlights, and informational pill backgrounds.
- **Saffron Wash** (`#FFF8E7`): Gentle notification banner backgrounds and highlighted chart placements.

### Secondary (Accent)
- **Temple Brass** (`#C9A23F`): Secondary accent used for chart accent lines, dashed empty-state borders, and highlighted astrological flags.
- **Goldline Rule** (`#E0CB96`): Structural boundary color. Used for delicate 1px container dividers, card borders, and table line separators.

### Neutral
- **Sandalwood Cream** (`#F7F1E1`): The global page canvas background. Provides warm, glare-free comfort during extended consultation sessions.
- **Warm Ivory Panel** (`#FFFCF2`): Elevated surface for data cards, form fields, consultation chat panels, and chart containers.
- **Sandalwood Base** (`#F1E8D2`): Supporting structural surface used for the persistent navigation sidebar and drawer backgrounds.
- **Charcoal Ink** (`#292524`): Primary typography color. A rich, deep charcoal offering superior reading comfort compared to harsh absolute black.
- **Stone Muted** (`#57534E`): Secondary metadata, subtitles, timestamps, planetary coordinates, and helper text.
- **Stone Muted Light** (`#78716C`): Captions, inactive icons, and subtle table indicators.
- **Pure White** (`#FFFFFF`): High-contrast button labels, inverted chat text, and chart canvas centers.

### Named Rules
**The Ten Percent Saffron Rule.** Primary Saffron is an instrument of action and emphasis; it must cover ≤10% of any viewport. It never floods background canvases or large panels. Its authority depends on its rarity.

**The No-Cosplay Rule.** Avoid parchment textures, faux-aged paper, ornamental manuscript filigree, skeuomorphic brass bezels, glowing astrology symbols, and historical cosplay. The product is a modern scientific instrument informed by classical tradition.

**The True Flat Rule.** No gradients, no glassmorphism, no neon glows. Depth is created strictly by planar tonal contrast and precise hairline boundaries.

## Typography

**Display Font:** Inter (Latin) / Noto Sans Devanagari (Devanagari)  
**Body Font:** Inter / Noto Sans Devanagari  
**Label / Mono Font:** Inter with `tabular-nums` for coordinates, dates, degrees, and astronomical numbers.

**Character:** Scholarly, lucid, and balanced. The pairing provides crisp geometric clarity for technical astronomical charts while honoring the fluid, lyrical proportions of the Devanagari script for Hindi consultations.

### Hierarchy
- **Display** (Bold 700, 24px / 1.5rem, line-height 1.2, letter-spacing -0.02em): App header branding, high-level client consultation titles.
- **Headline** (Bold 700, 18px / 1.125rem, line-height 1.3, letter-spacing -0.01em): Section headers, modal titles, person profile headers.
- **Title** (Semibold 600 / Bold 700, 15px / 0.9375rem, line-height 1.4): Navigation links, client profile list items, tab buttons.
- **Body** (Regular 400 / Medium 500, 14px / 0.875rem, line-height 1.6): Consultation chat responses, interpretive notes, form input text. Line length kept within 65–75ch for optimal reading ease.
- **Small / Metadata** (Medium 500 / Semibold 600, 12px / 0.75rem, line-height 1.4): Table secondary rows, timestamps, planetary nakshatra/pada subtitles.
- **Label** (Bold 700, 11px / 0.6875rem, line-height 1.2, letter-spacing 0.1em, uppercase): Section overlines, card category badges, table column headers.

### Named Rules
**The Dual-Script Harmony Rule.** English labels and Devanagari script must maintain optical balance. Hindi text is rendered in Noto Sans Devanagari with tailored vertical alignment and matched line-heights to eliminate baseline jitter during language switching.

**The Tabular Precision Rule.** All degrees, houses, timestamps, and planetary coordinates must use `tabular-nums` to preserve exact vertical alignment in data tables and divisional chart summaries.

## Layout

The application utilizes an instrument-console spatial model:
- **Persistent Sidebar Navigation:** Fixed 240px (`w-60`) expanded width, collapsible to 68px (`w-[68px]`) for maximum chart canvas area. Encased in Sandalwood Base (`#F1E8D2`) with a single hairline Goldline border (`#E0CB96`).
- **Main Viewport Canvas:** Floated on Sandalwood Cream (`#F7F1E1`) with sticky header controls that maintain position during long consultation review.
- **Standard Layout Constraints:**
  - Consultation Chat & Chart Workstation: `max-w-6xl` with two-column split layout (session list / conversation or chart / interpretive tabs).
  - Profile Forms & Auth: `max-w-md` centered column for focused data entry.
  - People Grid: Multi-column responsive grid (1 column on mobile, 2 columns on tablet, 3 columns on desktop).
- **Spacing Scale:** Standard 4px base (`xs: 4px`, `sm: 8px`, `md: 12px`, `lg: 16px`, `xl: 24px`, `2xl: 32px`).

### Named Rules
**The Context-Adaptive Density Rule.** Density is dictated by user cognitive load:
- *Astronomical Data & Charts:* High density, compact padding (6–8px), and tabular scanability.
- *Consultation & Chat:* Comfortable reading density, 16–24px container padding, relaxed leading (1.6), and 65–75ch line length.
- *Input Forms:* Moderate spaciousness (10–12px padding) to minimize data entry errors.

## Elevation & Depth

Surfaces are planar and flat at rest. Depth is established through tonal stacking:
1. Base Layer: Sandalwood Cream (`#F7F1E1`) global canvas.
2. Structural Base: Sandalwood Base (`#F1E8D2`) sidebar navigation and subtle icon badges.
3. Content Plane: Warm Ivory (`#FFFCF2`) for cards, panels, chat messages, and table containers.
4. Boundaries: Crisp 1px hairline rules (`#E0CB96`) delineate adjacent planes without drop shadows.

### Shadow Vocabulary
- **At-Rest Surfaces:** `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04)` (subtle grounding, flat-by-default).
- **Transient Overlays:** `box-shadow: 0 4px 12px -2px rgba(41, 37, 36, 0.08), 0 2px 6px -1px rgba(41, 37, 36, 0.04)` — strictly reserved for floating transient UI (dropdown menus, date pickers, language selectors, modal dialogs) to prevent merging into underlying content.

### Named Rules
**The Planar Stacking Rule.** Surfaces never float on decorative drop shadows. Elevation is conveyed through tonal planar shifts and 1px hairline rules.

**The Calm State Rule.** Hover and focus states shift border tint (Goldline `#E0CB96` → Temple Brass `#C9A23F`) or background warmth; controls never physically lift with simulated 3D motion.

## Shapes

- **Controls & Buttons:** 8px radius (`rounded-lg`) for buttons, text inputs, and select menus.
- **Containers & Panels:** 12px radius (`rounded-xl`) for primary content cards, chart frames, and side panels.
- **Compact Badges & Tags:** 4px radius (`rounded-sm`) for compact planetary status tags and coordinate indicators.
- **Pills & Status Dots:** 9999px radius (`rounded-full`) for date indicators and active indicator dots.
- **Consultation Chat Bubbles:** 16px radius (`rounded-2xl`) with tailored anchor corners (`rounded-br-sm` on user bubbles, `rounded-tl-sm` on assistant bubbles) to indicate conversational origin.
- **Hairline Borders:** Standard 1px solid stroke in `#E0CB96`.

## Components

### Buttons
- **Shape:** 8px radius (`rounded-lg`), bold medium weight.
- **Primary Action:** Solid Saffron Ochre (`#EA580C`), white text, 8px 16px padding. Hover shifts smoothly to `#C2410C` without scale transforms. Focus displays a crisp 2px `#FEF3C7` ring.
- **Secondary Outline:** Warm Ivory background, 1px Saffron Ochre border, Saffron Ochre text (`#C2410C`), hover background `#FFF8E7`.
- **Panel / Utility Button:** Warm Ivory background, 1px Goldline border (`#E0CB96`), text Charcoal Ink, hover background `#FEF3C7`.
- **Icon Action:** Minimal 6px padding, Goldline border, muted stone icon, hover background `#FFF8E7`.

### Cards & Panels
- **Standard Panel:** Warm Ivory background (`#FFFCF2`), 12px radius (`rounded-xl`), 1px Goldline border (`#E0CB96`), 16px padding. Hover transitions border to Temple Brass (`#C9A23F`).
- **Empty State Card:** Warm Ivory background, dashed Temple Brass border (`#C9A23F`), 24–32px padding, centered iconography.

### Form Inputs & Fields
- **Input Field:** Warm Ivory surface, 1px Goldline border (`#E0CB96`), 8px radius, 10px 12px padding, 14px text. Focus transitions border to Saffron Ochre (`#EA580C`) with a subtle `#FEF3C7` focus ring.
- **Field Label:** 11px uppercase, bold 700, 0.1em tracking, Saffron Ochre Deep (`#C2410C`).

### Consultation Chat Bubbles
- **User Speech Bubble:** Solid Saffron Ochre (`#EA580C`), crisp white text, 16px radius with flat bottom-right anchor (`rounded-br-sm`), relaxed line height.
- **Assistant Speech Bubble:** Warm Ivory surface (`#FFFCF2`), 1px Goldline border (`#E0CB96`), Charcoal Ink text (`#292524`), 16px radius with flat top-left anchor (`rounded-tl-sm`), 16px internal padding. Markdown rendered with clean semantic hierarchy.
- **Tool-Calling Indicator:** Inline pill with 9999px radius, Temple Brass border, Sandalwood wash background, 11px semibold text.

### Kundli Chart (Signature Component)
- **Geometry:** Exact North Indian diamond-square chart generated via vector SVG (`#fffdf6` surface).
- **Strokes:** Outer perimeter 3px Saffron Ochre (`#EA580C`), inner diamond and diagonals 1.4px Saffron Flame (`#F97316`).
- **House Interaction:** On house hover, an interactive coordinate circle (`r=28`, fill `rgba(251,146,60,0.10)`) highlights the hovered bhava, triggering an exact astronomical tooltip.

## Do's and Don'ts

### Do:
- **Do** maintain a strict 10% ceiling on primary saffron usage across any screen.
- **Do** use `tabular-nums` for all planetary degrees, house numbers, and timestamps.
- **Do** separate planar surfaces using 1px Goldline borders (`#E0CB96`) and tonal shifts rather than heavy drop shadows.
- **Do** ensure all text in both English and Hindi satisfies WCAG AA contrast against its respective surface.
- **Do** keep transitions fast and unobtrusive (120–180ms) with zero spring or bounce physics.
- **Do** provide comfortable 65–75ch line lengths for consultation reading text.

### Don't:
- **Don't** use gradients anywhere in the application. All backgrounds, borders, and buttons are solid flat colors.
- **Don't** add parchment stains, paper grain textures, manuscript flourishes, or skeuomorphic brass textures.
- **Don't** use dark space themes, purple/indigo neon hues, or glowing mystical orb effects.
- **Don't** render decorative zodiac-wheel clip art or cartoonish astrological icons.
- **Don't** apply floating drop shadows to standard cards or content panels.
- **Don't** add decorative entry animations, staggered card reveals, or bouncy buttons that delay the practitioner's workflow.
