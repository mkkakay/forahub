# ForaHub Claude Code Standards

## Core principle
A passing build alone does not mean a task is complete. Every task must meet technical, visual, semantic, and UX quality standards before being marked done.

## Required workflow for every task

### 1. Understand the intended outcome
Before writing any code understand the intended visual result, UX behavior, branding direction, and platform feel. Do not only interpret the technical instruction literally.

### 2. Implement cleanly
Make production-quality changes aligned with the ForaHub design system: dark navy #0f2a4a, accent blue #3b82f6, white backgrounds, Inter font, rounded-2xl cards, subtle shadows.

### 3. Technical validation
- npm run build passes with zero errors
- No console errors, hydration issues, or runtime errors
- No broken images, logos, or assets
- No failed network requests
- No performance regressions from oversized assets

### 4. Visual QA
After implementation inspect the actual rendered UI critically:
- Spacing, hierarchy, typography feel intentional not default
- Components match ForaHub visual identity
- Nothing looks placeholder, generic, or unfinished
- Hover states work correctly
- Animations are smooth and not distracting
- Mobile layout is clean and usable
- Sticky and floating elements do not obstruct content
- Images load correctly and are not blurry or broken

### 5. Content and semantic QA
- Logos belong to the correct organizations
- Images match the actual topic, event, or organization
- Hero imagery is contextually accurate
- Global South representation is visible, not just Western institutions
- No misleading, irrelevant, or generic stock imagery

### 6. Self-critique before finishing
Ask before marking complete:
- Would this feel polished on a real UN, WEF, or World Bank platform?
- Would a WHO professional trust this immediately?
- Does anything still look broken, blurry, placeholder, or unfinished?
- Would I confidently ship this to production?

If the answer to any of these is no, continue refining.

## Visual and design direction
ForaHub must feel like a premium global institutional platform combining the credibility of WHO, World Bank, and WEF with the discovery experience of Luma and the editorial quality of Bloomberg Live.

Avoid: demo-app styling, placeholder aesthetics, generic Tailwind layouts, random stock imagery, broken logos, initials as primary branding, low-resolution assets, Western-centric imagery.

## Organization ecosystem requirements
The logo strip and featured calendars must represent a globally diverse multi-sectoral ecosystem including UN agencies, NGOs, development banks, foundations, think tanks, humanitarian organizations, universities, regional bodies, and climate institutions. Never let it feel UN-only.

Universities to include across all regions:
- North America: Harvard, Johns Hopkins, Stanford, MIT
- Europe: Oxford, Cambridge, Karolinska, LSHTM
- Africa: UCT, Makerere, University of Ghana
- Asia: NUS, University of Tokyo, Tsinghua
- Middle East: Aga Khan University, AUB
- Latin America: USP, Tec de Monterrey

## Logo standards
- If a high quality official logo cannot be sourced reliably do not add that organization to the logo strip at all. A missing organization is always better than a broken, blurry, low-resolution, or placeholder logo.
- Only add organizations where a crisp real logo can be confirmed working.
- When in doubt leave it out.
- Real official SVG logos wherever possible
- UI Avatars only as absolute last resort and only when explicitly approved
- Never display broken image icons under any circumstances
- object-fit: contain on all logos
- No grayscale, no opacity reduction, no blur
- Crisp retina-quality rendering
- Consistent logo container sizing with balanced spacing

## Hero and event imagery standards
Priority order for image sourcing:
1. Official event website images
2. Official organization media assets
3. Official conference banners or photography
4. Editorial or newsroom imagery
5. Stock imagery only as absolute last resort

Never use: random laptops, boardrooms, unrelated lifestyle imagery, food images for climate events, generic handshakes, Western-centric stock photography, AI-generated imagery.

Hero slides must be contextually accurate:
- WHA slide must show WHO or World Health Assembly imagery
- COP slide must show climate summit or renewable energy imagery
- UN SDG slide must show UN assembly or sustainability imagery
- Global South slides must show authentic African, Asian, Latin American, or Middle Eastern settings

## Final response format
Every completed task must include:
1. What was changed and why
2. What was visually verified in the rendered UI
3. Any additional fixes made after initial review
4. Any remaining concerns or known limitations

A task is only complete when it works technically, looks visually correct, feels polished, and matches the intended global institutional quality of ForaHub.
