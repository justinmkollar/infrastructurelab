const mediaSelector = '[data-project-media], [data-inline-project-media]';
const galleries = [...document.querySelectorAll('[data-project-gallery]')];

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

function imageReady(image) {
  if (!image) return Promise.resolve();
  image.loading = 'eager';

  const decode = () => {
    if (typeof image.decode !== 'function') return Promise.resolve();
    return image.decode().catch(() => undefined);
  };

  if (image.complete) return decode();

  return new Promise((resolve) => {
    const done = () => {
      image.removeEventListener('load', done);
      image.removeEventListener('error', done);
      decode().finally(resolve);
    };
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
  });
}

function preloadGallery(gallery) {
  const images = [...gallery.querySelectorAll('[data-gallery-slide] img')];
  images.forEach((image) => {
    image.loading = 'eager';
    imageReady(image);
  });
}

async function setGalleryIndex(gallery, nextIndex) {
  const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
  if (!slides.length || gallery.dataset.galleryBusy === 'true') return;

  const index = wrapIndex(nextIndex, slides.length);
  const current = Number(gallery.dataset.galleryIndex || 0);
  if (index === current) return;

  const targetSlide = slides[index];
  const targetImage = targetSlide.querySelector('img');
  const activeElement = document.activeElement;
  const restoreFocus = activeElement?.closest?.('[data-gallery-prev]')
    ? '[data-gallery-prev]'
    : activeElement?.closest?.('[data-gallery-next]')
      ? '[data-gallery-next]'
      : null;

  gallery.dataset.galleryBusy = 'true';

  // Do not remove the current slide until the destination image has loaded and
  // decoded. This prevents the carousel from briefly collapsing in height.
  await imageReady(targetImage);

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === index;
    slide.classList.toggle('is-active', active);
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
  gallery.dataset.galleryIndex = String(index);

  // The clicked arrow lives inside the outgoing slide. Move focus to the same
  // control in the incoming slide without allowing the browser to scroll it
  // into view, then restore the exact viewport position after layout settles.
  if (restoreFocus) {
    targetSlide.querySelector(restoreFocus)?.focus({ preventScroll: true });
  }

  window.scrollTo(scrollX, scrollY);
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
    gallery.dataset.galleryBusy = 'false';
  });
}

galleries.forEach((gallery) => {
  const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
  if (!slides.length) return;

  const initial = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
  gallery.dataset.galleryIndex = String(initial);
  gallery.dataset.galleryBusy = 'false';
  preloadGallery(gallery);

  gallery.addEventListener('click', async (event) => {
    const previous = event.target.closest('[data-gallery-prev]');
    const next = event.target.closest('[data-gallery-next]');
    if (!previous && !next) return;
    event.preventDefault();
    event.stopPropagation();
    const current = Number(gallery.dataset.galleryIndex || 0);
    await setGalleryIndex(gallery, current + (next ? 1 : -1));
  });

  let touchX = 0;
  let touchY = 0;
  gallery.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
    gallery.dataset.gallerySwiped = 'false';
  }, { passive: true });

  gallery.addEventListener('touchend', async (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchX;
    const dy = touch.clientY - touchY;
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    gallery.dataset.gallerySwiped = 'true';
    const current = Number(gallery.dataset.galleryIndex || 0);
    await setGalleryIndex(gallery, current + (dx < 0 ? 1 : -1));
    setTimeout(() => { gallery.dataset.gallerySwiped = 'false'; }, 350);
  }, { passive: true });
});

/* Images inserted directly inside a Pages CMS rich-text body are enhanced into
   the same viewer as structured image fields. Structured fields remain the
   preferred option when an explicit caption is needed. */
document.querySelectorAll('.project-page [data-module-type="text"] .rich-text img').forEach((img) => {
  img.setAttribute('data-inline-project-media', '');
  img.setAttribute('role', 'button');
  img.setAttribute('tabindex', '0');
  img.setAttribute('aria-label', 'View image full screen');
  img.dataset.src = img.currentSrc || img.src || '';
  img.dataset.alt = img.alt || '';
  const figureCaption = img.closest('figure')?.querySelector('figcaption')?.textContent?.trim();
  img.dataset.caption = figureCaption || img.getAttribute('title') || '';
});

let lightbox;
let lightboxImage;
let lightboxCaption;
let lightboxPrevious;
let lightboxNext;
let lightboxMedia;
let lightboxItems = [];
let lightboxIndex = 0;
let lightboxScrollX = 0;
let lightboxScrollY = 0;

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
    window.scrollTo(lightboxScrollX, lightboxScrollY);
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

function sourceImage(item) {
  return item.matches?.('img') ? item : item.querySelector('img');
}

function preloadLightboxItems(items) {
  items.forEach((item) => {
    const image = sourceImage(item);
    const src = item.dataset.src || image?.currentSrc || image?.src || '';
    if (!src) return;
    const preload = new Image();
    preload.src = src;
  });
}

function renderLightbox() {
  if (!lightboxItems.length) return;
  const item = lightboxItems[lightboxIndex];
  const image = sourceImage(item);
  const src = item.dataset.src || image?.currentSrc || image?.src || '';
  const alt = item.dataset.alt || image?.alt || '';
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
  if (gallery) return [...gallery.querySelectorAll(mediaSelector)];

  const module = trigger.closest('[data-module-type]');
  if (module) {
    const items = [...module.querySelectorAll(mediaSelector)];
    if (items.length) return items;
  }

  return [trigger];
}

function openMedia(trigger, event) {
  const gallery = trigger.closest('[data-project-gallery]');
  if (gallery?.dataset.gallerySwiped === 'true') {
    event?.preventDefault();
    return;
  }

  event?.preventDefault();
  lightboxItems = contextItems(trigger);
  lightboxIndex = Math.max(0, lightboxItems.indexOf(trigger));
  preloadLightboxItems(lightboxItems);
  ensureLightbox();
  renderLightbox();
  lightboxScrollX = window.scrollX;
  lightboxScrollY = window.scrollY;
  document.body.classList.add('media-lightbox-open');

  if (typeof lightbox.showModal === 'function') {
    lightbox.showModal();
  } else {
    lightbox.setAttribute('open', '');
  }
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest(mediaSelector);
  if (!trigger) return;
  openMedia(trigger, event);
});

document.addEventListener('keydown', (event) => {
  if (lightbox?.open) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const trigger = event.target.closest?.('[data-inline-project-media]');
  if (!trigger) return;
  event.preventDefault();
  openMedia(trigger, event);
});
