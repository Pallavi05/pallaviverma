#!/usr/bin/env node
/**
 * build.mjs — content/site.json  ->  index.html + work/<slug>/index.html + sitemap.xml
 * No dependencies. Run: node scripts/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(readFileSync(join(ROOT, "content/site.json"), "utf8"));

/* ---------- helpers ---------- */

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MINUTE_PX = 4; // the duration rule: 1 minute of running time = 4px of line

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`;

function head({ title, description, base = "", canonical = "", image = "", jsonld = null }) {
  const img = image ? `${site.meta.url.replace(/\/$/, "")}/${image}` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(site.meta.name)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.meta.name)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
${img ? `<meta property="og:image" content="${esc(img)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${img ? `<meta name="twitter:image" content="${esc(img)}">` : ""}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
${FONTS}
<link rel="stylesheet" href="${base}assets/css/styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

/* ---------- structured data ---------- */

function personLd() {
  const b = site.meta.url.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.meta.name,
    jobTitle: site.meta.role.split("·").map((r) => r.trim()),
    description: site.meta.description,
    url: b,
    image: `${b}/${site.about.portrait}`,
    email: `mailto:${site.contact.email}`,
    telephone: site.contact.phone,
    sameAs: [site.contact.instagram_url].filter(Boolean),
    address: { "@type": "PostalAddress", addressLocality: site.contact.location },
    alumniOf: site.education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.institution })),
    knowsAbout: [
      "Movement practice", "Movement direction", "Choreography",
      "Contemporary dance", "Kathak", "Physical theatre", "Somatics",
      "Improvisation", "Embodied practice", "Dance film", "Movement research",
    ],
  };
}

function workLd(item, section) {
  const b = site.meta.url.replace(/\/$/, "");
  const img = item.media?.type === "image" ? item.media.src : item.media?.poster || "";
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: item.title,
    url: `${b}/work/${item.slug}/`,
    genre: section.title,
    ...(item.year ? { dateCreated: String(item.year) } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(img ? { image: `${b}/${img}` } : {}),
    ...(item.duration_min ? { duration: `PT${item.duration_min}M` } : {}),
    creator: { "@type": "Person", name: site.meta.name, url: b },
  };
}

function foot() {
  return `<footer class="foot">
<span>© ${new Date().getFullYear()} ${esc(site.meta.name)}</span>
<span>${esc(site.contact.location)}</span>
</footer>
<script>
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var els = document.querySelectorAll(".reveal");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  els.forEach(function (el) { io.observe(el); });
})();
</script>
</body>
</html>`;
}

/* ---------- media ---------- */

function media(item, { base = "", lazy = true, autoplay = false } = {}) {
  const m = item.media || {};
  if (m.type === "youtube") {
    return `<iframe src="https://www.youtube-nocookie.com/embed/${esc(m.src)}" title="${esc(item.title)}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }
  if (m.type === "video") {
    const poster = m.poster ? ` poster="${base}${esc(m.poster)}"` : "";
    const auto = autoplay ? " autoplay loop muted playsinline" : " controls playsinline";
    return `<video src="${base}${esc(m.src)}"${poster} preload="metadata"${auto}></video>`;
  }
  if (m.type === "image") {
    return `<img src="${base}${esc(m.src)}" alt="${esc(item.title)}"${lazy ? ' loading="lazy" decoding="async"' : ""}>`;
  }
  return "";
}

/* the signature element */
function timeRule(item) {
  if (!item.duration_min) return "";
  return `<div class="work__time">
<span class="work__time-rule" style="--mins:${item.duration_min * MINUTE_PX}px"></span>
<span class="work__time-label">${item.duration_min} min</span>
</div>`;
}

/* ---------- cards ---------- */

function card(item) {
  const href = `work/${esc(item.slug)}/`;
  const hasPage = Boolean(item.description || item.venues?.length || item.credits?.length);
  const titleHtml = hasPage
    ? `<a href="${href}">${esc(item.title)}</a>`
    : esc(item.title);

  return `<article class="work reveal">
<div class="work__media">${media(item)}</div>
<div class="work__head">
<h3 class="work__title">${titleHtml}</h3>
${item.status ? `<span class="work__status">${esc(item.status)}</span>` : ""}
${item.year ? `<span class="work__year">${esc(item.year)}</span>` : ""}
</div>
${item.role ? `<p class="work__role">${esc(item.role)}</p>` : ""}
${item.description ? `<p class="work__desc">${esc(item.description)}</p>` : ""}
${
  item.venues?.length
    ? `<ul class="work__venues">${item.venues.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`
    : ""
}
${item.credits?.length ? `<p class="work__credit">${esc(item.credits.join(" · "))}</p>` : ""}
${timeRule(item)}
</article>`;
}

/* ---------- pages ---------- */

function indexPage() {
  const sections = site.sections
    .map((s) => {
      const items = s.items.filter((i) => i.published !== false);
      if (!items.length) return "";
      return `<section class="section reveal" id="${esc(s.id)}">
<div class="section__head">
<h2>${esc(s.title)}</h2>
${s.note ? `<p class="section__note">${esc(s.note)}</p>` : ""}
</div>
<div class="works">${items.map(card).join("")}</div>
</section>`;
    })
    .join("");

  return `${head({
    title: `${site.meta.name} — ${site.meta.role}`,
    description: site.meta.description,
    canonical: site.meta.url,
    image: site.hero.poster,
    jsonld: personLd(),
  })}

<main id="main">

<header class="hero">
<div class="hero__media">
<video src="${esc(site.hero.video)}" poster="${esc(site.hero.poster)}" autoplay loop muted playsinline preload="metadata"></video>
</div>
<div class="hero__text">
<h1>${esc(site.meta.name)}</h1>
<p class="hero__role">${esc(site.meta.role)}</p>
${site.hero.caption ? `<p class="hero__caption">${esc(site.hero.caption)}</p>` : ""}
</div>
</header>

<section class="section reveal" id="about">
<div class="section__head"><h2>About</h2></div>
<div class="about">
<div class="about__portrait"><img src="${esc(site.about.portrait)}" alt="${esc(site.meta.name)}" loading="lazy" decoding="async"></div>
<div class="about__body">
${site.about.body.map((p) => `<p>${esc(p)}</p>`).join("")}
<div class="edu">
${site.education
  .map(
    (e) => `<div class="edu__row">
<div class="edu__years">${esc(e.years)}</div>
<div>
<p class="edu__what">${esc(e.qualification)}</p>
<p class="edu__where">${esc(e.institution)}</p>
</div>
</div>`
  )
  .join("")}
</div>
</div>
</div>
</section>

${sections}

<section class="section reveal" id="stills">
<div class="section__head"><h2>Stills</h2></div>
<div class="stills">
${site.stills
  .map(
    (s, i) =>
      `<button class="still" type="button" aria-label="View photo ${i + 1} of ${site.stills.length} full screen"><img src="${esc(s.src)}" alt="${esc(s.alt)}" loading="lazy" decoding="async"></button>`
  )
  .join("")}
</div>
</section>

<section class="section reveal" id="contact">
<div class="section__head"><h2>Contact</h2></div>
<a class="contact__email" href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>
<dl class="contact__rest">
<div><dt>Phone</dt><dd><a href="tel:${esc(site.contact.phone.replace(/\s/g, ""))}">${esc(site.contact.phone)}</a></dd></div>
<div><dt>Instagram</dt><dd><a href="${esc(site.contact.instagram_url)}" rel="me noopener">${esc(site.contact.instagram_handle)}</a></dd></div>
<div><dt>Based in</dt><dd>${esc(site.contact.location)}</dd></div>
</dl>
</section>

</main>

<div class="lb" id="lb" hidden>
<button class="lb__close" type="button" aria-label="Close">Close ✕</button>
<button class="lb__prev" type="button" aria-label="Previous photo">←</button>
<img class="lb__img" id="lbImg" alt="">
<button class="lb__next" type="button" aria-label="Next photo">→</button>
<span class="lb__count" id="lbCount"></span>
</div>
<script>
(function () {
  var lb = document.getElementById("lb");
  var imgEl = document.getElementById("lbImg");
  var countEl = document.getElementById("lbCount");
  var thumbs = Array.prototype.slice.call(document.querySelectorAll(".still"));
  if (!lb || !thumbs.length) return;
  var cur = 0, lastFocus = null;
  function show(i) {
    cur = (i + thumbs.length) % thumbs.length;
    var im = thumbs[cur].querySelector("img");
    imgEl.src = im.currentSrc || im.src;
    imgEl.alt = im.alt;
    countEl.textContent = (cur + 1) + " / " + thumbs.length;
  }
  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb__close").focus();
  }
  function close() {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  thumbs.forEach(function (b, i) { b.addEventListener("click", function () { open(i); }); });
  lb.addEventListener("click", function (e) {
    if (e.target.closest(".lb__prev")) return show(cur - 1);
    if (e.target.closest(".lb__next")) return show(cur + 1);
    if (e.target === lb || e.target.closest(".lb__close")) return close();
  });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(cur - 1);
    else if (e.key === "ArrowRight") show(cur + 1);
  });
})();
</script>
${foot()}`;
}

function workPage(item, section) {
  const base = "../../";
  const meta = [item.year, item.role, item.duration_min ? `${item.duration_min} min` : "", item.status]
    .filter(Boolean)
    .map((x) => `<span>${esc(x)}</span>`)
    .join("");

  return `${head({
    title: `${item.title} — ${site.meta.name}`,
    description: item.description || `${item.title}, ${item.year}. ${site.meta.name}.`,
    base,
    canonical: `${site.meta.url.replace(/\/$/, "")}/work/${item.slug}/`,
    image: item.media?.type === "image" ? item.media.src : item.media?.poster || "",
    jsonld: workLd(item, section),
  })}
<main id="main" class="detail">
<a class="detail__back" href="${base}#${esc(section.id)}">← ${esc(section.title)}</a>
<h1>${esc(item.title)}</h1>
<div class="detail__meta">${meta}</div>
<div class="detail__media">${media(item, { base, lazy: false })}</div>
<div class="detail__body">
${item.description ? `<p>${esc(item.description)}</p>` : ""}
${
  item.credits?.length
    ? `<h2>Credits</h2>${item.credits.map((c) => `<p>${esc(c)}</p>`).join("")}`
    : ""
}
${
  item.venues?.length
    ? `<h2>Performed at</h2><ul class="work__venues">${item.venues.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`
    : ""
}
${timeRule(item)}
</div>
</main>
${foot()}`;
}

function sitemap(urls) {
  const b = site.meta.url.replace(/\/$/, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${b}${u}</loc></url>`).join("\n")}
</urlset>
`;
}

/* ---------- run ---------- */

if (existsSync(join(ROOT, "work"))) rmSync(join(ROOT, "work"), { recursive: true, force: true });

writeFileSync(join(ROOT, "index.html"), indexPage());

const urls = ["/"];
let n = 0;
for (const section of site.sections) {
  for (const item of section.items) {
    if (item.published === false) continue;
    if (!(item.description || item.venues?.length || item.credits?.length)) continue;
    const dir = join(ROOT, "work", item.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), workPage(item, section));
    urls.push(`/work/${item.slug}/`);
    n++;
  }
}

writeFileSync(join(ROOT, "sitemap.xml"), sitemap(urls));
writeFileSync(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${site.meta.url.replace(/\/$/, "")}/sitemap.xml\n`);

console.log(`built index.html + ${n} work pages + sitemap.xml`);
