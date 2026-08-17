# Infrastructure Lab website

This repository contains the Infrastructure Lab website as a static **Astro** site with a Git-backed **Pages CMS** editing layer.

The public site is generated from structured content in the repository. Editing content through Pages CMS creates normal Git commits; pushes to `main` trigger GitHub Actions and redeploy the site to GitHub Pages.

## Editing the site

1. Open `https://app.pagescms.org`.
2. Sign in with GitHub.
3. Install/authorize the Pages CMS GitHub App for `justinmkollar/infrastructurelab`.
4. Open this repository.
5. Edit **Site settings**, **Research**, **Publications**, **People**, or **Additional pages**.

The editor is configured by `.pages.yml`.

### Site settings

Site settings control the Infrastructure Lab title and description, footer, homepage About text, splash images and timing, navigation, and the global light/dark color scheme.

### Research

Each Research record includes title, contributors, display date, expandable description, funding and duration, optional project page, project-specific light/dark colors, project hero, and modular project-page blocks. If **Create a project page** is enabled, the project is generated at `/projects/<entry-filename>/`.

### Publications

Publication records include authors, title, publication details, type, date, abstract, keywords, and an optional publication URL.

### People

People records include name, position, institution, portrait, bio, email, uploaded CV or external CV URL, and additional links.

### Additional pages

Create arbitrary additional pages using the modular block system. Add `/pages/<entry-filename>/` to **Site settings → Navigation** if the page should appear in the header.

## Page modules

Research project pages and additional pages support reusable Text, Image, Image gallery, Links, Expandable sections, Numbered steps, and Updates/timeline modules. This keeps page composition flexible without duplicating HTML.

## Media

Pages CMS uploads media to `public/uploads/images/` and `public/uploads/files/`. Images can be used in homepage splashes, portraits, project pages, and page modules.

## Local development

Requires Node.js 24.

```bash
npm install
npm run dev
```

Production build: `npm run build`.

## GitHub Pages deployment

`.github/workflows/deploy.yml` builds and deploys the site on every push to `main`.

One repository setting must be enabled manually: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

The default Pages deployment is configured for `https://justinmkollar.github.io/infrastructurelab/`.

### Custom domain

When the final domain is known: configure it in GitHub Pages; add `public/CNAME`; set repository Actions variable `SITE_URL` to the full origin; set `BASE_PATH` to `/`; and configure DNS as directed by GitHub Pages.

## Architecture

- `src/data/site.json` — global editable settings
- `src/content/research/` — research/project records
- `src/content/publications/` — publications
- `src/content/people/` — people
- `src/content/pages/` — arbitrary pages
- `src/components/` — shared presentation components
- `src/layouts/` — shared layouts
- `src/styles/global.css` — global design system
- `public/uploads/` — CMS-managed images and files
- `.pages.yml` — CMS schema and editor configuration
- `.github/workflows/deploy.yml` — GitHub Pages deployment

The Atlas of Data Center Politics is migrated as a Research record and uses the same project-page system, with its orthographic globe retained as a specialized hero component.
