/**
 * EseXO — Planet X
 * Vanilla JS interactions
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle (default: dark) ---------- */
  const themeToggle = document.getElementById('theme-toggle');
  const metaThemeColor = document.getElementById('meta-theme-color');

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('esexo-theme', next);
    } catch (e) { /* ignore */ }

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', next === 'light' ? '#f3f0ee' : '#0a0a0a');
    }

    if (themeToggle) {
      const toLight = next === 'dark';
      themeToggle.setAttribute('aria-label', toLight ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.setAttribute('title', toLight ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
  }

  applyTheme(getTheme());

  themeToggle?.addEventListener('click', () => {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Navbar (minimal) ---------- */
  const navbar = document.getElementById('navbar');

  function onScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- News Hub Rotator (re-init after API content) ---------- */
  let slides = [];
  let dots = [];
  const prevBtn = document.getElementById('news-prev');
  const nextBtn = document.getElementById('news-next');
  const progressBar = document.getElementById('news-progress-bar');
  let currentSlide = 0;
  let autoTimer = null;
  const ROTATE_MS = 6000;
  let newsBound = false;

  function resetProgress() {
    if (!progressBar || prefersReducedMotion) return;
    progressBar.classList.remove('running');
    void progressBar.offsetWidth;
    progressBar.classList.add('running');
  }

  function stopProgress() {
    if (!progressBar) return;
    progressBar.classList.remove('running');
  }

  function goToSlide(index) {
    slides = Array.from(document.querySelectorAll('.news-slide'));
    dots = Array.from(document.querySelectorAll('.news-dot'));
    if (!slides.length) return;
    const total = slides.length;
    currentSlide = ((index % total) + total) % total;

    slides.forEach((slide, i) => {
      const isActive = i === currentSlide;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
    });

    dots.forEach((dot, i) => {
      const isActive = i === currentSlide;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', String(isActive));
    });
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  function prevSlide() {
    goToSlide(currentSlide - 1);
  }

  function startAutoRotate() {
    stopAutoRotate();
    slides = Array.from(document.querySelectorAll('.news-slide'));
    if (prefersReducedMotion || slides.length < 2) return;
    resetProgress();
    autoTimer = setInterval(() => {
      nextSlide();
      resetProgress();
    }, ROTATE_MS);
  }

  function stopAutoRotate() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    stopProgress();
  }

  function reinitNews() {
    slides = Array.from(document.querySelectorAll('.news-slide'));
    dots = Array.from(document.querySelectorAll('.news-dot'));
    currentSlide = 0;
    goToSlide(0);

    if (!newsBound) {
      newsBound = true;
      document.getElementById('news-dots')?.addEventListener('click', (e) => {
        const dot = e.target.closest('.news-dot');
        if (!dot) return;
        goToSlide(Number(dot.dataset.index));
        startAutoRotate();
      });
      nextBtn?.addEventListener('click', () => {
        nextSlide();
        startAutoRotate();
      });
      prevBtn?.addEventListener('click', () => {
        prevSlide();
        startAutoRotate();
      });
      const hub = document.getElementById('news-hub');
      hub?.addEventListener('mouseenter', stopAutoRotate);
      hub?.addEventListener('mouseleave', startAutoRotate);
    }
    startAutoRotate();
  }

  /* ---------- XØ Countdown ---------- */
  let countdownTimer = null;
  function initCountdown() {
    const el = document.getElementById('xo-countdown');
    if (!el) return;
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    const releaseStr = el.dataset.release;
    if (!releaseStr) return;
    const target = new Date(releaseStr).getTime();
    if (Number.isNaN(target)) return;

    const daysEl = el.querySelector('[data-days]');
    const hoursEl = el.querySelector('[data-hours]');
    const minsEl = el.querySelector('[data-mins]');
    const secsEl = el.querySelector('[data-secs]');

    function pad(n) {
      return String(Math.max(0, n)).padStart(2, '0');
    }

    function tick() {
      let diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 86400000);
      diff %= 86400000;
      const hours = Math.floor(diff / 3600000);
      diff %= 3600000;
      const mins = Math.floor(diff / 60000);
      diff %= 60000;
      const secs = Math.floor(diff / 1000);
      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minsEl) minsEl.textContent = pad(mins);
      if (secsEl) secsEl.textContent = pad(secs);
    }

    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  /* ---------- Smooth scroll for anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 72;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  });

  /* ---------- Hero entrance animation ---------- */
  function animateHero() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.hero-tagline, .hero-title, .hero-sub, .hero-cta').forEach((el) => {
        el.classList.add('visible');
      });
      return;
    }
    requestAnimationFrame(() => {
      document.querySelector('.hero-tagline')?.classList.add('visible');
      document.querySelector('.hero-title')?.classList.add('visible');
      document.querySelector('.hero-sub')?.classList.add('visible');
      document.querySelector('.hero-cta')?.classList.add('visible');
    });
  }

  /* ---------- Floating particles ---------- */
  function createParticles() {
    if (prefersReducedMotion) return;
    const container = document.querySelector('.particles');
    if (!container) return;

    const count = window.innerWidth < 640 ? 12 : 22;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      const size = Math.random() * 2 + 1;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${Math.random() * 12 + 10}s`;
      particle.style.animationDelay = `${Math.random() * 8}s`;
      particle.style.opacity = String(Math.random() * 0.5 + 0.15);
      container.appendChild(particle);
    }
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if (prefersReducedMotion) {
      elements.forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /* ---------- Releases catalog (filled by content.js from API) ---------- */
  let releases = {};

  function setReleasesCatalog(catalog) {
    releases = catalog || {};
  }

  /* ---------- Shared modal helpers ---------- */
  /* ---------- Shared modal helpers ---------- */
  function openModal(modal) {
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add('open');
    });
    document.body.classList.add('modal-open');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(() => {
      modal.hidden = true;
    }, 400);
  }

  /* ---------- Streaming Platform Modal ---------- */
  const streamModal = document.getElementById('stream-modal');
  const streamTitle = document.getElementById('stream-modal-title');
  const streamType = document.getElementById('stream-modal-type');
  const streamInitials = document.getElementById('stream-modal-initials');
  const streamSpotify = document.getElementById('stream-spotify');
  const streamApple = document.getElementById('stream-apple');
  const streamAudiomack = document.getElementById('stream-audiomack');
  const streamClose = document.getElementById('stream-modal-close');

  function setPlatformLink(el, url) {
    if (!el) return;
    if (url) {
      el.href = url;
      el.classList.remove('stream-platform-btn--disabled');
      el.removeAttribute('aria-disabled');
      el.style.pointerEvents = '';
      el.hidden = false;
      el.style.display = '';
    } else {
      el.href = '#';
      el.classList.add('stream-platform-btn--disabled');
      el.setAttribute('aria-disabled', 'true');
      el.style.pointerEvents = 'none';
      el.hidden = true;
      el.style.display = 'none';
    }
  }

  function openStreamModal(key) {
    const data = releases[key];
    if (!data || !streamModal) return;

    if (streamTitle) streamTitle.textContent = data.title;
    if (streamType) streamType.textContent = data.type;
    if (streamInitials) streamInitials.textContent = data.initials || 'XO';

    setPlatformLink(streamSpotify, data.spotify);
    setPlatformLink(streamApple, data.appleMusic);
    setPlatformLink(streamAudiomack, data.audiomack);

    openModal(streamModal);
  }

  function bindReleaseCards() {
    document.getElementById('releases-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.release-card[data-release]');
      if (card) openStreamModal(card.dataset.release);
    });
    document.getElementById('featured-release')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.release-open[data-release]');
      if (btn) openStreamModal(btn.dataset.release);
    });
  }

  streamClose?.addEventListener('click', () => closeModal(streamModal));
  streamModal?.querySelector('[data-stream-close]')?.addEventListener('click', () => closeModal(streamModal));

  /* ---------- Video Modal ---------- */
  const videoModal = document.getElementById('video-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close');
  function bindVideoCards() {
    const videosSection = document.getElementById('videos');
    videosSection?.addEventListener('click', (e) => {
      const card = e.target.closest('.video-card');
      if (!card) return;
      const title = card.dataset.videoTitle || 'Video';
      const url = card.dataset.videoUrl || '';
      if (modalTitle) modalTitle.textContent = title;
      openModal(videoModal);
      // Prefer opening external URL in new tab when available
      if (url && /^https?:\/\//i.test(url)) {
        // keep modal as placeholder; also allow user to open
        const body = videoModal.querySelector('.aspect-video .text-center') || videoModal.querySelector('.aspect-video');
        if (body) {
          const link = videoModal.querySelector('[data-video-external]');
          if (link) {
            link.href = url;
            link.hidden = false;
          }
        }
      }
    });
  }

  modalClose?.addEventListener('click', () => closeModal(videoModal));
  videoModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => closeModal(videoModal));

  /* ---------- Gallery Lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxContent = document.getElementById('lightbox-content');
  const lightboxClose = document.getElementById('lightbox-close');

  let lightboxItems = [];
  let lightboxIndex = 0;

  function showLightboxAt(i) {
    if (!lightboxItems.length || !lightboxContent) return;
    lightboxIndex = ((i % lightboxItems.length) + lightboxItems.length) % lightboxItems.length;
    const item = lightboxItems[lightboxIndex];
    const src = item.src;
    const caption = item.caption || '';
    if (src) {
      lightboxContent.innerHTML =
        '<img src="' + src + '" alt="" class="max-w-full max-h-[80vh] object-contain mx-auto" />' +
        (caption ? '<p class="text-center text-silver/50 text-sm mt-3">' + caption + '</p>' : '');
    }
    const counter = document.getElementById('lightbox-counter');
    if (counter) counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxItems.length;
  }

  function bindGallery() {
    const root = document.getElementById('gallery-masonry') || document.querySelector('#gallery .gallery-dynamic');
    const section = document.getElementById('gallery');
    section?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-src]');
      if (!item || !item.dataset.src || !lightbox) return;
      if (e.target.closest('.gallery-arrow') || e.target.closest('.gallery-dot') || e.target.closest('.gallery-thumb')) return;
      const pool = Array.from(section.querySelectorAll('[data-src]')).filter((el) => el.dataset.src);
      lightboxItems = pool.map((el) => ({ src: el.dataset.src, caption: el.dataset.caption || '' }));
      const idx = pool.indexOf(item);
      showLightboxAt(idx >= 0 ? idx : 0);
      openModal(lightbox);
    });
    document.getElementById('lightbox-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showLightboxAt(lightboxIndex - 1);
    });
    document.getElementById('lightbox-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showLightboxAt(lightboxIndex + 1);
    });
    // swipe on lightbox
    let lx = 0;
    lightbox?.addEventListener('touchstart', (e) => { lx = e.changedTouches[0].screenX; }, { passive: true });
    lightbox?.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].screenX - lx;
      if (Math.abs(dx) > 50) showLightboxAt(lightboxIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  lightboxClose?.addEventListener('click', () => closeModal(lightbox));
  lightbox?.querySelector('.modal-backdrop')?.addEventListener('click', () => closeModal(lightbox));

  /* ---------- Escape key closes modals ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (streamModal?.classList.contains('open')) closeModal(streamModal);
      if (videoModal?.classList.contains('open')) closeModal(videoModal);
      if (lightbox?.classList.contains('open')) closeModal(lightbox);
    }
  });

  /* ---------- Track item interaction (visual feedback) ---------- */
  document.querySelectorAll('.track-item').forEach((track) => {
    track.addEventListener('click', () => {
      document.querySelectorAll('.track-item').forEach((t) => t.classList.remove('active'));
      track.classList.add('active');
    });
  });

  function bindDynamicUI() {
    bindReleaseCards();
    bindVideoCards();
    bindGallery();
    initReveal();
  }

  /* ---------- Public hooks for content.js ---------- */
  window.EseXOSite = {
    reinitNews,
    initCountdown,
    setReleasesCatalog,
    bindDynamicUI,
  };

  /* ---------- Init ---------- */
  function init() {
    animateHero();
    createParticles();
    initReveal();
    initCountdown();
    bindReleaseCards();
    bindVideoCards();
    bindGallery();
    // content.js loads API data; may call reinitNews / bindDynamicUI again
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
