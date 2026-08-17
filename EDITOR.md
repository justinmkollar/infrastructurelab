# Editor workflow

Pages CMS is the normal editing interface. Direct code edits are only necessary when creating a new reusable component or changing the site-wide design system.

## Common tasks

### Add a research project
Create a new Research entry. Fill in the index fields and expandable description. Enable **Create a project page** only if the project needs a dedicated page. Project pages can use their own light/dark color palette and modular blocks.

### Add a publication
Create a Publication entry. The right-arrow button appears automatically when a Publication URL is supplied.

### Add a person
Create a People entry and upload a portrait. Add a CV as an uploaded document or external URL.

### Add a new page
Create an Additional page. The filename becomes the URL slug. Add `/pages/<slug>/` to Site settings → Navigation if it should appear in the header.

### Add homepage splash images
Open Site settings → Home → Splash images. Upload, delete, and reorder images. Initial load is immediate; the fade setting only applies between images.

## Publishing
Saving through Pages CMS commits directly to GitHub. The GitHub Pages workflow runs automatically. Git history is the revision history and rollback mechanism.
