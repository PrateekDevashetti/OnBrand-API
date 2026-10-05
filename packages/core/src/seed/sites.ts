/**
 * Curated seed set for the Style Search index. Metadata is hand-written so the index
 * is useful even without an LLM; screenshots, palettes and type are crawled live.
 */
export type SeedSite = {
  url: string;
  name: string;
  label: string;
  styles: string[];
  websiteTypes: string[];
  industries: string[];
  layouts: string[];
  tags: string[];
  description: string;
  featured?: boolean;
};

const s = (
  url: string,
  name: string,
  label: string,
  styles: string,
  industries: string,
  layouts: string,
  tags: string,
  description: string,
  featured = false,
  websiteTypes = "Homepage",
): SeedSite => ({
  url,
  name,
  label,
  styles: styles.split(",").map((x) => x.trim()).filter(Boolean),
  websiteTypes: websiteTypes.split(",").map((x) => x.trim()),
  industries: industries.split(",").map((x) => x.trim()).filter(Boolean),
  layouts: layouts.split(",").map((x) => x.trim()).filter(Boolean),
  tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
  description,
  featured,
});

export const SEED_SITES: SeedSite[] = [
  s("https://studiodumbar.com", "studiodumbar", "Creative studio", "Bold, Typographic, Dark", "Agency", "Breathing, Asymmetric", "Agency/Studio, About/Team, Dark, Bold, Studio", "A Rotterdam design studio that leads with huge, tightly-kerned grotesk headlines on pure black. Motion-heavy case studies and a restrained monochrome palette let the work carry the colour — expressive typography as the brand.", true),
  s("https://mcarnolds.be", "mcarnolds", "Creative agency", "Bold, Playful, Editorial", "Agency", "Asymmetric, Breathing", "Agency/Creative Services, Agency/Studio, About/Team, Asymmetric", "A creative-studio identity built on gallery-grade black-and-white contrast, where photography becomes the only colour. Oversized fluid headlines, scattered asymmetric image grids and ghost CTAs read studio-craft rather than templated commerce.", true),
  s("https://wearefirma.com", "wearefirma", "Branding agency", "Editorial, Fun, Minimal", "Agency", "Breathing", "Agency/Creative Services, Abstract / Experimental, About/Team", "Serif-led branding agency with generous white space, playful hand-drawn illustration moments and a warm, confident voice. Editorial type sizes do the heavy lifting on an otherwise quiet white canvas."),
  s("https://www.pentagram.com", "pentagram", "Design partnership", "Minimal, Editorial", "Agency", "Grid, Medium", "Agency/Studio, Portfolio, Grid", "The archetypal design-partnership portfolio: a dense, disciplined image grid, neutral sans typography and almost no chrome. The work is the interface.", false, "Homepage, Portfolio"),
  s("https://locomotive.ca", "locomotive", "Digital agency", "Bold, Playful", "Agency", "Breathing, Asymmetric", "Agency/Studio, Smooth scroll, Bold", "Montreal digital agency famous for buttery smooth-scroll motion, huge display type and bold colour blocking. Every section is a staged scene with playful micro-interactions."),
  s("https://dogstudio.co", "dogstudio", "Creative studio", "Bold, Dark, Immersive", "Agency", "Breathing", "Agency/Studio, WebGL, Dark", "Dark, cinematic studio site with WebGL hero, condensed headlines and moody lighting. Feels like a film title sequence rather than a website."),
  s("https://buck.co", "buck", "Motion studio", "Bold, Fun, Playful", "Agency", "Grid, Tight", "Agency/Studio, Motion, Video-led", "A motion-design powerhouse whose homepage is a reel: autoplaying video tiles in a tight grid with minimal UI and bright, character-driven work."),
  s("https://www.hellomonday.com", "hellomonday", "Digital studio", "Playful, Fun, Minimal", "Agency", "Breathing", "Agency/Studio, Playful, Illustration", "Playful creative studio with bouncy interactions, pastel accents and friendly sans typography on airy layouts — whimsical but crisp."),
  s("https://www.basicagency.com", "basic/dept", "Branding agency", "Bold, Dark, Editorial", "Agency", "Breathing", "Agency/Creative Services, Dark, Case studies", "Big-brand agency site with full-bleed case-study imagery, cinematic dark sections and oversized serif/sans pairings that feel premium and editorial."),
  s("https://www.wearecollins.com", "collins", "Brand consultancy", "Bold, Editorial, Fun", "Agency", "Asymmetric, Breathing", "Agency/Studio, Brand strategy, Bold", "Collins pairs confident, chunky headlines with bright, unexpected colour and a loose editorial grid — strategic but irreverent."),
  s("https://www.instrument.com", "instrument", "Digital agency", "Minimal, Bold", "Agency", "Grid, Medium", "Agency/Studio, Case studies, Grid", "Portland agency with a crisp modular grid, large project imagery and restrained neutral type — clean, corporate-creative balance."),
  s("https://lusion.co", "lusion", "3D studio", "Bold, Immersive, Dark", "Agency", "Breathing", "Agency/Studio, WebGL, 3D", "Award-winning WebGL studio with real-time 3D scenes, liquid transitions and neon-on-dark accents. Technical virtuosity is the brand."),
  s("https://cuberto.com", "cuberto", "Design agency", "Bold, Playful", "Agency", "Breathing", "Agency/Studio, Cursor effects, Bold", "Design agency known for magnetic cursor effects, huge rounded headlines and bold black/white contrast with occasional saturated colour."),
  s("https://14islands.com", "14islands", "Creative studio", "Playful, Minimal", "Agency", "Breathing", "Agency/Studio, Interactive, Light", "A light, airy studio site with soft pastel colour, rounded type and delightful scroll-driven interactions."),
  s("https://tastelabs.com", "tastelabs", "Taste infra layer", "Technical, Dark, Bold", "AI", "Breathing, Medium", "SaaS / AI, Dark, Monospace accents", "Dark immersive interface with near-black surfaces and cream text, a 3D card carousel hero and mono labels. A technical aesthetic for AI infrastructure."),
  s("https://trycanopy.space", "trycanopy", "Creative AI canvas", "Technical, Minimal", "AI", "Breathing", "SaaS / AI, Creative tools, Green accent", "Canopy's creative intelligence canvas: dark-first, calm and technical, carried by a single Canopy-green accent and clear product UI."),
  s("https://linear.app", "linear", "Product tool", "Minimal, Technical, Dark", "SaaS", "Medium", "SaaS, Dark, Product UI", "The reference dark SaaS aesthetic: deep charcoal, precise Inter typography, subtle gradients and glowing product screenshots. Calm, fast, engineered.", true),
  s("https://stripe.com", "stripe", "Fintech platform", "Bold, Technical", "Fintech, SaaS", "Medium, Grid", "Fintech, Gradients, Developer", "Stripe's iconic animated mesh gradients, confident sans headlines and meticulous developer-focused layouts. Polished, colourful and trustworthy.", true),
  s("https://vercel.com", "vercel", "Developer platform", "Minimal, Technical, Dark", "SaaS", "Grid, Medium", "SaaS, Developer, Geist", "Geist typography, monochrome black-and-white with sharp grid lines and terminal-flavoured details. Minimal developer-first precision."),
  s("https://reducto.ai", "reducto", "AI document parsing", "Minimal, Technical", "AI, SaaS", "Medium", "SaaS / AI, Purple accent, Product", "Clean AI-infrastructure site with soft neutral surfaces, a deep purple accent and product-diagram illustrations."),
  s("https://modal.com", "modal", "AI compute", "Technical, Dark, Bold", "AI, SaaS", "Medium", "SaaS / AI, Developer, Green accent", "Dark developer platform with neon-green accents, code-forward sections and confident technical copy."),
  s("https://www.databricks.com", "databricks", "Data platform", "Corporate, Bold", "AI, SaaS", "Medium, Grid", "Enterprise, Data, Red accent", "Enterprise data/AI platform: bold red-orange accent, dense information architecture and corporate sans typography."),
  s("https://ramp.com", "ramp", "Fintech", "Bold, Minimal", "Fintech", "Medium", "Fintech, Yellow accent, Product UI", "Ramp pairs a lime/yellow accent with crisp black type and product screenshots — energetic, efficient finance."),
  s("https://www.notion.com", "notion", "Workspace tool", "Playful, Minimal", "SaaS", "Breathing", "SaaS, Illustration, Light", "Black line illustrations, warm off-white canvas and friendly serif/sans mix — playful productivity."),
  s("https://www.figma.com", "figma", "Design tool", "Bold, Playful, Fun", "SaaS", "Breathing", "SaaS, Colourful, Bold", "Figma uses saturated colour blocks, chunky headlines and playful shapes to celebrate making things together."),
  s("https://www.framer.com", "framer", "Website builder", "Bold, Dark, Technical", "SaaS", "Medium", "SaaS, Dark, Product UI", "Dark, glossy product marketing with blue accents, crisp motion and big product UI hero shots."),
  s("https://www.raycast.com", "raycast", "Productivity tool", "Dark, Technical, Bold", "SaaS", "Medium", "SaaS, Dark, Glow", "Glossy dark UI with red glows, glassy cards and keyboard-centric product storytelling."),
  s("https://www.anthropic.com", "anthropic", "AI lab", "Editorial, Minimal", "AI", "Breathing", "AI, Editorial, Warm neutrals", "Warm off-white canvas, editorial serif headlines and hand-drawn illustration — thoughtful, humane AI."),
  s("https://openai.com", "openai", "AI lab", "Minimal, Editorial", "AI", "Breathing", "AI, Minimal, Light", "Spare, editorial layouts with generous whitespace and a calm monochrome palette punctuated by soft gradient imagery."),
  s("https://www.perplexity.ai", "perplexity", "AI search", "Minimal, Technical", "AI", "Breathing", "AI, Teal accent, Search", "Teal-on-off-white answer-engine aesthetic: compact sans, soft surfaces and a focus on the search box."),
  s("https://mistral.ai", "mistral", "AI lab", "Bold, Fun", "AI", "Medium", "AI, Orange gradient, Pixel", "Mistral's warm orange-to-yellow gradients and pixelated motifs give a playful European edge to frontier AI."),
  s("https://runwayml.com", "runway", "Generative video", "Dark, Bold, Editorial", "AI", "Breathing", "AI, Video-led, Dark", "Cinematic, video-first generative-media brand with dark surfaces and editorial headlines."),
  s("https://supabase.com", "supabase", "Developer platform", "Technical, Dark", "SaaS", "Grid, Medium", "SaaS, Developer, Green accent", "Dark developer site with emerald accents, code snippets and a dense feature grid."),
  s("https://resend.com", "resend", "Email API", "Minimal, Dark, Technical", "SaaS", "Breathing", "SaaS, Developer, Dark", "Ultra-minimal dark developer brand with crisp type, subtle 3D imagery and code-first storytelling."),
  s("https://cal.com", "cal.com", "Scheduling", "Minimal", "SaaS", "Medium", "SaaS, Light, Product UI", "Light, neutral SaaS with Cal Sans headlines, rounded product cards and an open-source friendliness."),
  s("https://attio.com", "attio", "CRM", "Minimal, Technical", "SaaS", "Medium", "SaaS, Light, Product UI", "Precise light-mode CRM marketing with soft greys, crisp product UI and understated typography."),
  s("https://superhuman.com", "superhuman", "Email client", "Dark, Luxury, Bold", "SaaS", "Breathing", "SaaS, Dark, Premium", "Premium dark aesthetic with purple-blue gradients and confident, luxury product storytelling."),
  s("https://posthog.com", "posthog", "Product analytics", "Fun, Playful, Bold", "SaaS", "Tight", "SaaS, Illustration, Retro", "A deliberately quirky, retro-desktop inspired brand with hedgehog mascots and a dense, playful information style."),
  s("https://pitch.com", "pitch", "Presentation tool", "Bold, Playful", "SaaS", "Breathing", "SaaS, Colourful, Bold", "Pitch uses big type, vivid colour fields and product collage hero shots — a creative-tool energy."),
  s("https://www.apple.com", "apple", "Consumer tech", "Minimal, Luxury", "E-commerce", "Breathing", "Consumer, Product photography, Minimal", "Product-photography-led minimalism with SF Pro headlines, vast whitespace and stacked full-width tiles."),
  s("https://www.nike.com", "nike", "Sportswear", "Bold", "E-commerce, Fashion", "Tight, Grid", "E-commerce, Bold, Photography", "Bold, uppercase campaign headlines over full-bleed athletic photography and a tight product grid.", false, "Homepage, E-commerce"),
  s("https://www.aesop.com", "aesop", "Skincare", "Luxury, Editorial, Minimal", "E-commerce, Fashion", "Breathing", "Luxury, Editorial, Earthy", "Earth-toned luxury retail with serif typography, muted beige/brown surfaces and slow, considered pacing.", true),
  s("https://www.glossier.com", "glossier", "Beauty", "Minimal, Playful", "E-commerce, Fashion", "Breathing", "Beauty, Pink, Soft", "Millennial-pink soft palette, clean sans type and dewy product photography."),
  s("https://www.oatly.com", "oatly", "Food & drink", "Fun, Playful, Bold", "E-commerce", "Asymmetric", "Hand-drawn, Quirky, Copy-led", "Hand-drawn lettering, wobbly illustration and cheeky long-form copy — anti-corporate charm."),
  s("https://liquiddeath.com", "liquiddeath", "Beverage", "Bold, Fun", "E-commerce", "Tight", "Heavy metal, Bold, Humour", "Heavy-metal parody branding: black, gothic type and absurdist humour."),
  s("https://teenage.engineering", "teenage engineering", "Hardware", "Minimal, Technical, Brutalist", "E-commerce", "Grid, Tight", "Industrial, Monospace, Product", "Industrial-design product brand with mono type, grey surfaces and product-as-object photography."),
  s("https://mailchimp.com", "mailchimp", "Marketing platform", "Fun, Playful, Bold", "SaaS", "Breathing", "SaaS, Illustration, Yellow", "Cavendish-yellow, quirky illustration and friendly serif headlines."),
  s("https://www.duolingo.com", "duolingo", "Education", "Fun, Playful", "SaaS", "Breathing", "Education, Green, Mascot", "Owl-green, rounded type and mascot-driven playfulness."),
  s("https://www.airbnb.com", "airbnb", "Travel", "Minimal", "E-commerce", "Grid, Medium", "Travel, Photography, Rausch", "Photography-first travel marketplace with Rausch-pink accent and rounded Cereal type.", false, "Homepage, E-commerce"),
  s("https://gumroad.com", "gumroad", "Creator platform", "Brutalist, Fun, Bold", "E-commerce", "Tight", "Brutalist, Pink, Neo-brutalism", "Neo-brutalist creator platform: hard black borders, offset shadows and hot-pink accents.", true),
  s("https://readymag.com", "readymag", "Web publishing", "Editorial, Bold", "SaaS", "Asymmetric", "Editorial, Design tool, Bold", "Design-tool marketing with experimental editorial layouts and oversized type."),
  s("https://www.are.na", "are.na", "Research tool", "Minimal, Brutalist", "SaaS", "Tight", "Brutalist, Minimal, Typographic", "Spare, text-first brutalist minimalism with system type and grid of blocks."),
  s("https://www.zara.com", "zara", "Fashion retail", "Editorial, Minimal, Luxury", "Fashion, E-commerce", "Breathing", "Fashion, Editorial, Photography", "High-fashion editorial: huge condensed logotype, full-bleed photography and almost no UI chrome."),
  s("https://www.ycombinator.com", "ycombinator", "Accelerator", "Minimal", "SaaS", "Medium", "Orange accent, Community", "Utilitarian startup-accelerator site with an orange accent and dense, readable lists."),
];
