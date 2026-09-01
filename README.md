# Uttam IT Support — Website

A static, responsive website for Uttam IT Support (computer & laptop repair,
refurbished computers, accessories, and business IT solutions).

No build step, no backend, no dependencies beyond Google Fonts — just plain
HTML/CSS/JS, so it deploys as-is to GitHub Pages, Netlify, Vercel, or any
static host.

## Files

- `index.html` — the full site (all sections)
- `styles.css` — all styling
- `script.js` — mobile menu, refurbished-product data/filters/modal, enquiry form → WhatsApp handoff
- `privacy.html`, `terms.html` — footer legal pages
- `robots.txt`, `sitemap.xml` — SEO basics

## Before you deploy — replace placeholders

1. **Domain**: `robots.txt`, `sitemap.xml`, and the `<link rel="canonical">` /
   Open Graph tags in `index.html` use `https://uttamitsupport.example.com/`.
   Replace with your real domain once you have one (or your
   `https://<username>.github.io/<repo>/` URL).
2. **Refurbished product listings**: `script.js` has sample placeholder
   products (Dell/HP/Lenovo laptops & desktops) clearly marked as examples.
   Replace the `PRODUCTS` array with your actual current stock, specs and
   "Contact for Price" or real prices as you decide.
3. **Map**: the Contact section has a placeholder instead of an embedded map,
   since no business address was provided. Add a Google Maps embed `<iframe>`
   there once you have an address you want public.

## Deploy to GitHub Pages (free hosting)

You'll need a free [GitHub](https://github.com) account. From a terminal on
your own computer, with this folder's contents:

```bash
# 1. Create a new repo on GitHub first (e.g. "uttam-it-support"),
#    then in this folder:

git init                              # skip if already a git repo
git add .
git commit -m "Uttam IT Support website"
git branch -M main
git remote add origin https://github.com/<your-username>/uttam-it-support.git
git push -u origin main
```

Then on GitHub:
1. Go to your repo → **Settings** → **Pages**
2. Under "Build and deployment", set **Source** to `Deploy from a branch`
3. Set **Branch** to `main` and folder to `/ (root)`, then **Save**
4. GitHub will publish it at `https://<your-username>.github.io/uttam-it-support/`
   within a minute or two.

## Deploy on your own domain

Any static host works (Netlify, Vercel, Cloudflare Pages, cPanel, etc.) — just
upload these files as-is. If you want `uttamitsupport.com` (or similar)
pointing at GitHub Pages, add a `CNAME` file with your domain name and set the
DNS records per [GitHub's custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Notes on content

Per the brand brief, no fake reviews, ratings, addresses, certifications,
awards, stock counts, warranty terms, or prices were invented. Anywhere real
data wasn't provided, the site says "Contact for Price" or "Check
Availability" and routes the visitor to phone/WhatsApp/email instead.
