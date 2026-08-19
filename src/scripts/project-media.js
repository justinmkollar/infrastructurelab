const galleries = [...document.querySelectorAll('[data-project-gallery]')];

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

function setGalleryIndex(gallery, nextIndex) {
  const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
  if (!slides.length) return;
  const index = wrapIndex(nextIndex, slides.length);
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === index;
    slide.classList.toggle('is-active', active);
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
  gallery.dataset.galleryIndex = String(index);
}

galleries.forEach((gallery) => {
  const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
  if (!slides.length) return;

  const initial = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
  gallery.dataset.galleryIndex = String(initial);

  gallery.addEventListener('click', (event) => {
    const previous = event.target.closest('[data-gallery-prev]');
    const next = event.target.closest('[data-gallery-next]');
    if (!previous && !next) return;
    event.preventDefault();
    event.stopPropagation();
    const current = Number(gallery.dataset.galleryIndex || 0);
    setGalleryIndex(gallery, current + (next ? 1 : -1));
  });

  let touchX = 0;
  let touchY = 0;
  gallery.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
    gallery.dataset.gallerySwiped = 'false';
  }, { passive: true });

  gallery.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchX;
    const dy = touch.clientY - touchY;
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    gallery.dataset.gallerySwiped = 'true';
    const current = Number(gallery.dataset.galleryIndex || 0);
    setGalleryIndex(gallery, current + (dx < 0 ? 1 : -1));
    setTimeout(() => { gallery.dataset.gallerySwiped = 'false'; }, 350);
  }, { passive: true });
});

let lightbox;
let lightboxImage;
let lightboxCaption;
let lightboxPrevious;
let lightboxNext;
let lightboxMedia;
let lightboxItems = [];
let lightboxIndex = 0;

function ensureLightbox() {
  if (lightbox) return lightbox;

  lightbox = document.createElement('dialog');
  lightbox.className = 'project-lightbox';
  lightbox.setAttribute('aria-label', 'Image viewer');
  lightbox.innerHTML = `
    <div class="lightbox-shell">
      <button class="lightbox-close" type="button" aria-label="Close image viewer">×</button>
      <div class="lightbox-media">
        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image"><span aria-hidden="true">←</span></button>
        <img class="lightbox-image" alt="" />
        <button class="lightbox-nav lightbox-next" type="button" aria-label="Next image"><span aria-hidden="true">→</span></button>
      </div>
      <div class="lightbox-caption"></div>
    </div>
  `;
  document.body.appendChild(lightbox);

  lightboxImage = lightbox.querySelector('.lightbox-image');
  lightboxCaption = lightbox.querySelector('.lightbox-caption');
  lightboxPrevious = lightbox.querySelector('.lightbox-prev');
  lightboxNext = lightbox.querySelector('.lightbox-next');
  lightboxMedia = lightbox.querySelector('.lightbox-media');

  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightboxPrevious.addEventListener('click', () => moveLightbox(-1));
  lightboxNext.addEventListener('click', () => moveLightbox(1));

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) lightbox.close();
  });

  lightbox.addEventListener('close', () => {
    document.body.classList.remove('media-lightbox-open');
  });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.open) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveLightbox(1);
    }
  });

  let lightboxTouchX = 0;
  let lightboxTouchY = 0;
  lightboxMedia.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    lightboxTouchX = touch.clientX;
    lightboxTouchY = touch.clientY;
  }, { passive: true });

  lightboxMedia.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - lightboxTouchX;
    const dy = touch.clientY - lightboxTouchY;
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    moveLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });

  return lightbox;
}

function renderLightbox() {
  if (!lightboxItems.length) return;
  const item = lightboxItems[lightboxIndex];
  const sourceImage = item.querySelector('img');
  const src = item.dataset.src || sourceImage?.currentSrc || sourceImage?.src || '';
  const alt = item.dataset.alt || sourceImage?.alt || '';
  const caption = item.dataset.caption || '';

  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightboxCaption.textContent = caption;
  lightboxCaption.hidden = !caption;

  const multiple = lightboxItems.length > 1;
  lightboxPrevious.hidden = !multiple;
  lightboxNext.hidden = !multiple;
}

function moveLightbox(direction) {
  if (lightboxItems.length < 2) return;
  lightboxIndex = wrapIndex(lightboxIndex + direction, lightboxItems.length);
  renderLightbox();
}

function contextItems(trigger) {
  const gallery = trigger.closest('[data-project-gallery]');
  if (gallery) return [...gallery.querySelectorAll('[data-project-media]')];

  const module = trigger.closest('[data-module-type]');
  if (module) {
    const items = [...module.querySelectorAll('[data-project-media]')];
    if (items.length) return items;
  }

  return [trigger];
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-project-media]');
  if (!trigger) return;

  const gallery = trigger.closest('[data-project-gallery]');
  if (gallery?.dataset.gallerySwiped === 'true') {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  lightboxItems = contextItems(trigger);
  lightboxIndex = Math.max(0, lightboxItems.indexOf(trigger));
  ensureLightbox();
  renderLightbox();
  document.body.classList.add('media-lightbox-open');

  if (typeof lightbox.showModal === 'function') {
    lightbox.showModal();
  } else {
    lightbox.setAttribute('open', '');
  }
});
