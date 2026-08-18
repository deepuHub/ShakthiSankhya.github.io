/**
 * Builds shareable social-media cards of the Sri Gnana Peetam timeline.
 *
 *   node tools/build-social-cards.mjs
 *
 * Renders the hero moments below into social/*.png at four aspect ratios,
 * using the same maroon-and-gold palette as sgp-timeline.html so a post and
 * the site read as one brand.
 *
 * Edit MOMENTS to change what the cards say, then re-run.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'social');

/* ===================== CONTENT ===================== */

const MOMENTS = [
  { mon: 'AUG', yr: '2006', title: 'Guidance from Kanchi Jagadguru',
    detail: 'Blessings received in Kancheepuram to establish the foundation' },
  { mon: 'AUG', yr: '2008', title: 'SCSGP Foundation Day',
    detail: 'Official founding on 18 August 2008' },
  { mon: 'DEC', yr: '2014', title: 'Annual Yagams Begin',
    detail: 'Initiated with Srividhya Mahayagam — now a yearly tradition' },
  { mon: 'AUG', yr: '2018', title: '10th Anniversary',
    detail: 'Artists from diverse art forms felicitated' },
  { mon: 'OCT', yr: '2022', title: 'Monthly Narayana Seva',
    detail: 'Bi-monthly annadaanam sustained across trust programs' },
  { mon: 'FEB', yr: '2025', title: 'Mahakumbh Camp, Prayagraj',
    detail: 'Participation in the once-in-144-years event' },
  { mon: 'DEC', yr: '2025', title: 'Shakti Sankhya App',
    detail: 'Guru-led energy tracking — ancient wisdom, modern design' },
];

const FOOTER = 'SRI GNANA PEETAM &middot; 2006&ndash;2026 &middot; A SACRED MISSION OF SERVICE';

/* ===================== FONTS ===================== */

// Google Fonts serves woff2 only to browser-ish user agents; with the default
// Node UA it hands back bulky ttf. The local font set has neither Cormorant nor
// Poppins, so without embedding these the render silently falls back to DejaVu.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Cormorant+Garamond:wght@600;700&family=Poppins:wght@300;400;600' +
  '&display=swap';

// Keep latin for the copy and devanagari so ॐ renders in Poppins rather than
// falling through to FreeSerif. Cyrillic/vietnamese subsets are dead weight.
const WANTED_SUBSETS = new Set(['latin', 'latin-ext', 'devanagari']);

// curl, not fetch: outbound HTTPS goes through the agent proxy, which curl
// honours via the environment and undici does not.
const curl = (url, extraArgs = []) =>
  execFileSync('curl', ['-sSL', '--max-time', '30', '-A', UA, ...extraArgs, url],
    { maxBuffer: 64 * 1024 * 1024 });

function buildFontFaces() {
  const css = curl(FONT_CSS_URL).toString('utf8');

  // The Google CSS labels each @font-face with a /* subset */ comment, so
  // splitting on the comment yields [subset, block, subset, block, ...].
  const parts = css.split(/\/\*\s*([\w-]+)\s*\*\//).slice(1);
  const out = [];

  for (let i = 0; i < parts.length; i += 2) {
    const subset = parts[i];
    const block = parts[i + 1];
    if (!WANTED_SUBSETS.has(subset)) continue;

    const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!url) continue;

    const b64 = curl(url).toString('base64');
    out.push(block.replace(/url\(https:\/\/[^)]+\.woff2\)/,
      `url(data:font/woff2;base64,${b64})`));
  }

  if (!out.length) throw new Error('No @font-face blocks recovered from Google Fonts');
  console.log(`  embedded ${out.length} font faces`);
  return out.join('\n');
}

/* ===================== LAYOUT PROFILES ===================== */

const PROFILES = {
  portrait: {
    w: 1080, h: 1350, layout: 'v',
    vars: {
      '--pad': '66px', '--head-pad': '46px', '--when-w': '150px', '--gutter': '30px',
      '--om': '46px', '--h1': '52px', '--sub': '15px',
      '--yr': '54px', '--mon': '17px', '--title': '30px', '--detail': '18px',
      '--dot': '18px', '--dot-nudge': '48px', '--foot': '14px',
    },
  },
  story: {
    w: 1080, h: 1920, layout: 'v',
    vars: {
      '--pad': '72px', '--head-pad': '96px', '--when-w': '176px', '--gutter': '36px',
      '--om': '58px', '--h1': '64px', '--sub': '18px',
      '--yr': '66px', '--mon': '20px', '--title': '37px', '--detail': '22px',
      '--dot': '22px', '--dot-nudge': '57px', '--foot': '16px',
    },
  },
  square: {
    w: 1080, h: 1080, layout: 'v',
    vars: {
      '--pad': '56px', '--head-pad': '30px', '--when-w': '128px', '--gutter': '26px',
      '--om': '36px', '--h1': '42px', '--sub': '13px',
      '--yr': '44px', '--mon': '14px', '--title': '25px', '--detail': '15px',
      '--dot': '15px', '--dot-nudge': '39px', '--foot': '12px',
    },
  },
  landscape: {
    w: 1200, h: 630, layout: 'h',
    vars: {
      '--pad': '46px', '--head-pad': '20px',
      '--om': '27px', '--h1': '33px', '--sub': '12px',
      '--yr': '39px', '--mon': '13px', '--title': '15px',
      '--dot': '15px', '--foot': '11px',
    },
  },
};

/* ===================== TEMPLATE ===================== */

const MANDALA = `
<svg class="mandala" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g fill="none" stroke="#EFD98C" stroke-width="0.5">
    <circle cx="100" cy="100" r="94"/><circle cx="100" cy="100" r="76"/>
    <circle cx="100" cy="100" r="58"/><circle cx="100" cy="100" r="40"/>
    <circle cx="100" cy="100" r="22"/>
    ${Array.from({ length: 24 }, (_, i) =>
      `<line x1="100" y1="6" x2="100" y2="30" transform="rotate(${i * 15} 100 100)"/>`).join('')}
  </g>
</svg>`;

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const verticalBody = () => `
<main class="timeline">
  ${MOMENTS.map((m) => `
  <div class="moment">
    <div class="when"><span class="mon">${esc(m.mon)}</span><span class="yr">${esc(m.yr)}</span></div>
    <span class="dot"></span>
    <div class="what">
      <h2>${esc(m.title)}</h2>
      <p>${esc(m.detail)}</p>
    </div>
  </div>`).join('')}
</main>`;

const horizontalBody = () => `
<main class="hrail">
  ${MOMENTS.map((m, i) => `
  <div class="hnode ${i % 2 === 0 ? 'up' : 'down'}">
    <div class="hwhat">
      <span class="mon">${esc(m.mon)}</span>
      <span class="yr">${esc(m.yr)}</span>
      <h2>${esc(m.title)}</h2>
    </div>
    <span class="dot"></span>
  </div>`).join('')}
</main>`;

function buildHtml(profile, fontFaces) {
  const vars = Object.entries(profile.vars).map(([k, v]) => `${k}:${v};`).join('');
  const vertical = profile.layout === 'v';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
${fontFaces}

:root{
  --accent:#FF7A45; --accent-light:#FFA36B;
  --maroon:#7A1B34; --maroon-dark:#4E0F20;
  --gold:#C9A227; --gold-light:#EFD98C;
  --bg-dark:#1C0C13; --bg-dark2:#33121E;
  --text:#F6EDE1; --text-muted:#C7AF9C;
  ${vars}
}
*{box-sizing:border-box;margin:0;padding:0;}
body{
  width:${profile.w}px; height:${profile.h}px;
  display:flex; flex-direction:column;
  font-family:'Poppins',sans-serif;
  color:var(--text);
  background:
    radial-gradient(circle at 12% 2%, rgba(201,162,39,0.13), transparent 42%),
    radial-gradient(circle at 92% 34%, rgba(255,122,69,0.09), transparent 46%),
    linear-gradient(180deg, var(--bg-dark) 0%, var(--bg-dark2) 48%, var(--bg-dark) 100%);
  overflow:hidden;
}

/* ---------- header ---------- */
header{
  position:relative; overflow:hidden; flex:0 0 auto;
  padding:var(--head-pad) var(--pad);
  text-align:center;
  background:linear-gradient(120deg, var(--maroon) 0%, var(--maroon-dark) 100%);
  border-bottom:3px solid var(--gold);
}
.mandala{
  position:absolute; top:50%; left:50%;
  width:${vertical ? 900 : 620}px; height:${vertical ? 900 : 620}px;
  transform:translate(-50%,-50%);
  opacity:0.10; pointer-events:none;
}
header .inner{position:relative; z-index:2;}
.om{
  display:block; font-size:var(--om); line-height:1;
  color:var(--gold-light); margin-bottom:.18em;
  text-shadow:0 0 22px rgba(239,217,140,0.5);
}
h1{
  font-family:'Cormorant Garamond',serif; font-weight:700;
  font-size:var(--h1); line-height:1.04; letter-spacing:.055em;
  text-transform:uppercase; color:#fff;
}
.sub{
  margin-top:.65em; font-size:var(--sub); font-weight:300;
  letter-spacing:.24em; color:var(--gold-light);
}
.divider{display:flex; align-items:center; justify-content:center; gap:12px; margin-top:1.1em;}
.divider i{display:block; width:${vertical ? 88 : 56}px; height:1.5px;}
.divider i:first-child{background:linear-gradient(90deg, transparent, var(--gold));}
.divider i:last-child{background:linear-gradient(270deg, transparent, var(--gold));}
.divider b{
  width:9px; height:9px; background:var(--gold);
  transform:rotate(45deg); border-radius:1px;
}

/* ---------- shared marks ---------- */
.dot{
  display:block; flex:0 0 var(--dot);
  width:var(--dot); height:var(--dot);
  background:var(--gold-light); border-radius:50%;
  box-shadow:0 0 0 4px var(--bg-dark), 0 0 16px rgba(201,162,39,0.75);
}
.mon{
  display:block; font-size:var(--mon); font-weight:600;
  letter-spacing:.2em; color:var(--gold);
}
.yr{
  display:block; font-family:'Cormorant Garamond',serif; font-weight:700;
  font-size:var(--yr); line-height:1; color:var(--accent);
}
/* Cormorant ships old-style figures by default, which set "10TH" as short
   text figures in an all-caps line and read as "ıoTH". Force lining figures. */
.yr, .what h2{font-variant-numeric:lining-nums; font-feature-settings:"lnum" 1;}

/* ---------- vertical timeline ---------- */
.timeline{
  position:relative; flex:1 1 auto; min-height:0;
  display:flex; flex-direction:column; justify-content:space-around;
  padding:var(--pad) var(--pad) calc(var(--pad) * .6);
}
.timeline::before{
  content:''; position:absolute; z-index:0;
  /* Rail runs between the year column and the copy, so each dot reads as
     joined to its moment rather than stranded at the far edge. */
  left:calc(var(--pad) + var(--when-w) + var(--gutter) + var(--dot) / 2); width:2px;
  top:calc(var(--pad) * .55); bottom:calc(var(--pad) * .35);
  transform:translateX(-50%);
  background:linear-gradient(180deg, transparent, var(--gold) 7%, var(--gold) 93%, transparent);
}
.moment{position:relative; z-index:1; display:flex; align-items:flex-start; gap:var(--gutter);}
.moment .dot{margin-top:var(--dot-nudge);}
.when{flex:0 0 var(--when-w); text-align:right; padding-top:.1em;}
.when .mon{margin-bottom:.15em;}
.what{flex:1 1 auto; min-width:0; padding-top:.35em;}
.what h2{
  font-family:'Cormorant Garamond',serif; font-weight:700;
  font-size:var(--title); line-height:1.16; letter-spacing:.028em;
  text-transform:uppercase; color:var(--text);
}
.what p{
  margin-top:.42em; font-size:var(--detail); font-weight:300;
  line-height:1.45; color:var(--text-muted);
}

/* ---------- horizontal timeline ---------- */
.hrail{
  position:relative; flex:1 1 auto; min-height:0;
  display:flex; align-items:stretch;
  /* Node labels are centred on their dot and run wider than the 1/7 column,
     so the outer two need real side padding to clear the canvas edge. */
  padding:calc(var(--pad) * .5) var(--pad);
}
.hrail::before{
  content:''; position:absolute; z-index:0;
  top:50%; height:2px; transform:translateY(-50%);
  left:var(--pad); right:var(--pad);
  background:linear-gradient(90deg, transparent, var(--gold) 6%, var(--gold) 94%, transparent);
}
.hnode{
  position:relative; z-index:1; flex:1 1 0; min-width:0;
  display:flex; align-items:center; justify-content:center;
}
.hwhat{
  position:absolute; left:0; right:0;
  padding:0 7px; text-align:center;
}
.hnode.up .hwhat{bottom:calc(50% + 20px);}
.hnode.down .hwhat{top:calc(50% + 20px);}
.hnode.down .hwhat{display:flex; flex-direction:column-reverse;}
.hwhat h2{
  font-family:'Poppins',sans-serif; font-weight:600;
  font-size:var(--title); line-height:1.32; letter-spacing:.05em;
  text-transform:uppercase; color:var(--text);
  margin-top:.35em;
}
.hnode.down .hwhat h2{margin-top:0; margin-bottom:.35em;}
.hwhat .mon{font-size:var(--mon); letter-spacing:.16em;}

/* ---------- footer ---------- */
footer{
  flex:0 0 auto; text-align:center;
  padding:calc(var(--pad) * .42) var(--pad) calc(var(--pad) * .6);
  font-size:var(--foot); font-weight:400; letter-spacing:.19em;
  color:var(--gold); border-top:1px solid rgba(201,162,39,0.26);
}
</style></head>
<body>
<header>
  ${MANDALA}
  <div class="inner">
    <span class="om">&#2384;</span>
    <h1>Our Sacred Journey</h1>
    <div class="sub">MILESTONES OF SRI GNANA PEETAM</div>
    <div class="divider"><i></i><b></b><i></i></div>
  </div>
</header>
${vertical ? verticalBody() : horizontalBody()}
<footer>${FOOTER}</footer>
</body></html>`;
}

/* ===================== RENDER ===================== */

async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    // playwright is installed globally in this environment, and NODE_PATH does
    // not apply to ESM resolution — reach for the global root explicitly.
    const globalRoot = execFileSync('npm', ['root', '-g']).toString().trim();
    return createRequire(import.meta.url)(join(globalRoot, 'playwright')).chromium;
  }
}

async function main() {
  console.log('Fetching + embedding brand fonts...');
  const fontFaces = buildFontFaces();

  mkdirSync(OUT_DIR, { recursive: true });

  const chromium = await loadChromium();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  try {
    for (const [name, profile] of Object.entries(PROFILES)) {
      const html = buildHtml(profile, fontFaces);
      const page = await browser.newPage({
        viewport: { width: profile.w, height: profile.h },
        deviceScaleFactor: 2,
      });

      await page.setContent(html, { waitUntil: 'load' });
      // Without this the shot can land on a frame still using fallback metrics.
      await page.evaluate(() => document.fonts.ready);

      const file = join(OUT_DIR, `sgp-timeline-${name}.png`);
      await page.screenshot({ path: file });
      await page.close();

      console.log(`  ${name.padEnd(10)} ${profile.w}x${profile.h} -> ${file}`);
    }
  } finally {
    await browser.close();
  }

  console.log('Done.');
}

await main();
