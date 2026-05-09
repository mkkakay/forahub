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

Include balanced representation across:
- UN agencies: WHO, UNICEF, WFP, UNDP, UNAIDS, UNEP, UNESCO, FAO, IOM, UNHCR, ILO, UN Women
- Development banks: World Bank, African Development Bank, Asian Development Bank, IADB, IsDB
- Global health: Gavi, Global Fund, PAHO, Africa CDC
- Foundations: Gates Foundation, Wellcome Trust, Rockefeller Foundation
- INGOs: MSF, Oxfam, Save the Children, CARE, ICRC, BRAC
- Regional bodies: African Union, ASEAN, ECOWAS, SADC, EAC, IGAD, CARICOM, SAARC
- Forums and think tanks: WEF, OECD, Chatham House, Brookings, ODI
- Climate: UNFCCC, UNEP, Green Climate Fund
- South South donors: JICA, KOICA, QFFD, ADFD
- Universities Global South: UCT, Makerere, University of Ghana, Aga Khan University, AUB, USP, Tec de Monterrey, icddr b, Jimma University
- Universities Global North: Harvard, Johns Hopkins, Stanford, MIT, Oxford, Cambridge, Karolinska Institutet, LSHTM, NUS, University of Tokyo

## Logo standards - CRITICAL RULES
- If a high quality official logo cannot be sourced reliably DO NOT add that organization to the logo strip at all
- A missing organization is always better than a broken, blurry, low-resolution, or placeholder logo
- Only add organizations where a crisp real logo is confirmed working
- When in doubt leave it out
- Real official SVG logos wherever possible
- UI Avatars only as absolute last resort and only when explicitly approved by the user
- Never display broken image icons under any circumstances

## Logo sizing and spacing - CRITICAL RULES
- Every logo must appear visually the same size regardless of the original file dimensions
- Use a fixed container for every logo: height 32px, width 120px, display flex, align items center, justify content center
- Inside the container: max-height 28px, max-width 100px, object-fit contain
- This ensures tall logos like WHO and wide logos like World Bank all appear balanced and uniform
- Never let one logo appear dramatically larger or smaller than another
- Spacing between logos must be perfectly even: margin left and right 24px on each logo container
- No logo should be cut off at the edges of its container
- All logos must be vertically centered within their containers
- On the scrolling strip the rhythm must feel consistent: equal gaps, equal visual weight, no crowding
- Test visually: step back and check that no single logo dominates or disappears
- object-fit: contain on all logos
- No grayscale, no opacity reduction, no blur
- Crisp retina-quality rendering

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
- Global South slides must show authentic African, Asian, Latin American, or Pacific imagery

## Homepage spacing standards
The four core content sections must flow as one continuous content block with no dead zones between them. These sections are: Happening This Week, Upcoming Events, Featured Calendars, Browse by SDG Category.

Rules that must be verified before marking any spacing task complete:
- Section wrapper padding: py-3 maximum on these four sections
- Gap between section heading and cards below: mt-2 maximum
- Gap between end of one section and start of next section heading: 16px maximum
- Use border-t border-gray-100 as visual divider instead of padding
- Section heading size: text-xl font-bold not text-2xl
- No mb- or mt- margins larger than 8px between these four sections
- After any spacing change visually verify: a user scrolling should move smoothly through all four sections without any visible dead zone or large gap
- Reference check: does this feel like a news feed or product listing page? If sections feel isolated the spacing is still too large.

All other sections: py-5 maximum, no section should have more than 32px total vertical space above and below it combined.

## Search and floating UI standards
The floating search bar must feel like a premium discovery tool:
- Visually prominent with white background and strong shadow
- Modern clean styling aligned with ForaHub brand
- Smooth sticky behavior that does not obstruct content
- Responsive and usable on all screen sizes
- Never intrusive or blocking

## Final response format
Every completed task must report:
1. What was changed
2. What was visually verified after implementation
3. Any additional fixes made after QA review
4. Any remaining concerns or known limitations

A task is only complete when it works technically, looks visually correct, feels polished, and matches the intended global institutional quality of ForaHub.

## Scraper and AI cost decisions

### Scraper decisions
- Scraper uses Claude Haiku: claude-haiku-4-5-20251001
- ANTHROPIC_API_KEY is in Vercel and .env.local
- Monthly AI budget: $5 maximum
- Do NOT use Groq, it has unreliable rate limits and decommissions models
- Full scrape runs from forahub.org/admin clicking Run Full Scrape button
- Automated 6 hour cron job to be set up in next session via Supabase Edge Function
- Batch size: 5 sources per batch with 5 second delay between batches
- Admin key: forahub_admin_2026
