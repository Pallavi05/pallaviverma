# pallaviverma

Static portfolio site. Content lives in `content/site.json`; a Node script turns it into
static HTML; a GitHub Action runs the script on every commit. No server, no build tools
on your machine, no framework.

## One-time setup

**1. Get the media off Canva.** The images and video still live on Canva's CDN and will
vanish if that site is unpublished. Run this first, while it's still up:

```bash
node scripts/fetch-media.mjs
```

It reads `content/media.json`, downloads all 16 files, and writes each one to the exact
path `content/site.json` already points at — `assets/img/geetanjali.jpg`,
`assets/video/wildflower.mp4`, and so on. Nothing to wire up afterwards; the site picks
them up as they land. Re-run it any time (it skips what's already there), or
`node scripts/fetch-media.mjs --force` to pull everything again. It exits non-zero and
tells you exactly which URLs failed if Canva has gone dark.

**2. Create the repo and push.**

```bash
git init && git add -A && git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

**3. Turn on Pages.** Repo → Settings → Pages → Source: **GitHub Actions**.

**4. Set the real URL.** Edit `meta.url` in `content/site.json` to the address Pages gives
you. It's used for canonical links, `sitemap.xml` and social preview cards.

## Editing without touching code

Go to `https://USERNAME.github.io/REPO/admin/`.

It asks for a **fine-grained personal access token**, once:
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained →
*Only select repositories* → this repo → Repository permissions → **Contents: Read and write**.

Paste it in. The editor loads the content, lets you add and reorder works, upload images,
and hit **Publish changes**. That writes a commit; the Action rebuilds; the site is live in
about a minute.

The token is stored in your browser's local storage on that device only. Anyone with the
token can write to this repo, so don't use the editor on a shared machine, and revoke the
token in GitHub if you lose the laptop. The `/admin/` page itself is public — that's fine,
it's useless without a token.

## Editing by hand

Change `content/site.json`, commit, done. To preview locally:

```bash
node scripts/build.mjs
python3 -m http.server 8000
```

## How it fits together

```
content/site.json        the only file that holds content
content/media.json       remote asset -> local path, for the downloader
scripts/fetch-media.mjs  pulls all media off Canva into assets/
scripts/build.mjs        site.json -> index.html, work/<slug>/index.html, sitemap.xml
assets/css/styles.css    all styling
admin/index.html         the editor (talks to the GitHub API directly)
.github/workflows/       rebuilds and deploys on push
index.html, work/        GENERATED — don't edit, your changes get overwritten
```

## About the design

Carried over from the Canva original: the charcoal ground (`#2b2b2b`), the off-white text
(`#edf0f2`), and the periwinkle (`#96aaff`) that was already sitting on the contact icons.
Type is Libre Franklin, the open-source revival of the ITC Franklin Gothic the original
used, with IBM Plex Mono for metadata.

No navigation. The hero is a full viewport of video with her name on it and nothing else;
you scroll or you don't. Section headings are demoted to small monospace labels above a
hairline, so the loudest type on any screen is the name of a work, never the name of a
category. Everything is spaced on a single scale (`--s-1` through `--s-7` in the CSS) —
nothing is nudged by eye. Work cards sit in two columns with the right-hand one dropped by
6rem, so the eye travels diagonally down the page instead of scanning in rows.

The one deliberate flourish: works with a stated running time get a hairline rule beneath
them whose **length is the duration** — 4px per minute. Geetanjali's line is longer than
Terms and Conditions Apply's because the piece is longer. It's ornament made of data, and
it only appears where the data exists.
