/**
 * EseXO public site — API → DOM
 * Database is source of truth. Design classes preserved.
 */
(function () {
  'use strict';

  const typeLabel = { SINGLE: 'Single', EP: 'EP', ALBUM: 'Album' };

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function initials(title) {
    return (title || 'XO')
      .replace(/[^a-zA-Z0-9$Øø]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase() || 'XO';
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  function mapRelease(item) {
    return {
      title: item.title,
      type: typeLabel[item.release_type] || item.release_type || 'Single',
      initials: initials(item.title),
      spotify: item.spotify_url || '',
      appleMusic: item.apple_music_url || '',
      audiomack: item.audiomack_url || '',
      onerpm: item.onerpm_url || '',
      status: item.status,
      release_date: item.release_date,
      artwork_url: item.artwork_url || null,
      slug: item.slug,
      description: item.description || '',
    };
  }

  /* ---------- News slides ---------- */
  function renderNews(newsList, upcomingRelease) {
    const viewport = document.getElementById('news-viewport');
    const dotsWrap = document.getElementById('news-dots');
    if (!viewport) return;

    const items = (newsList || []).filter((n) => n.published !== false);
    // Ensure XØ upcoming appears if no news but we have an upcoming release
    if (!items.length && upcomingRelease) {
      items.push({
        title: upcomingRelease.title || 'XØ',
        short_description: upcomingRelease.description || 'The New Era Is Coming',
        button_text: upcomingRelease.onerpm_url ? 'Pre-Save' : 'Learn More',
        button_url: upcomingRelease.onerpm_url || '#music',
        featured: true,
        _fromRelease: true,
      });
    }

    if (!items.length) {
      viewport.innerHTML =
        '<article class="news-slide active" data-slide="0" aria-hidden="false">' +
        '<div class="news-slide-inner flex flex-col items-center justify-center text-center py-16">' +
        '<p class="text-silver/40 text-sm tracking-wide">No updates yet. Check back soon.</p></div></article>';
      if (dotsWrap) dotsWrap.innerHTML = '';
      if (window.EseXOSite && window.EseXOSite.reinitNews) window.EseXOSite.reinitNews();
      return;
    }

    viewport.innerHTML = items
      .map(function (n, i) {
        const isXo =
          (n.title || '').toLowerCase().includes('xø') ||
          (n.title || '').toLowerCase().includes('xo') ||
          n._fromRelease;
        const num = String(i + 1).padStart(2, '0');
        const btnText = n.button_text || 'Learn More';
        const btnUrl = n.button_url || '#';
        const isExternal = /^https?:\/\//i.test(btnUrl);

        let body = '';
        if (isXo && upcomingRelease) {
          const art = upcomingRelease.artwork_url
            ? '<img src="' +
              esc(upcomingRelease.artwork_url) +
              '" alt="" class="absolute inset-0 w-full h-full object-cover" />'
            : '<span class="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-white">' +
              esc(initials(upcomingRelease.title || 'XØ')) +
              '</span>';
          const dateStr = formatDate(upcomingRelease.release_date);
          const preHref = upcomingRelease.onerpm_url || btnUrl;
          body =
            '<div class="news-slide-inner flex flex-col items-center text-center gap-7 sm:gap-9 py-2">' +
            '<div class="news-artwork shrink-0 w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 relative">' +
            '<div class="news-artwork-glow" aria-hidden="true"></div>' +
            '<div class="news-artwork-core absolute inset-0 bg-gradient-to-br from-cosmic/60 via-[#1a0a12] to-void flex items-center justify-center overflow-hidden">' +
            art +
            '</div></div>' +
            '<div class="min-w-0">' +
            '<p class="news-eyebrow">' +
            esc(num) +
            ' — Upcoming Album</p>' +
            '<h2 class="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-3 leading-[1.05]">' +
            'ESEXO — <span class="text-glow">' +
            esc(upcomingRelease.title || 'XØ') +
            '</span></h2>' +
            '<p class="text-silver/75 text-lg sm:text-xl tracking-wide mb-1 font-light">' +
            esc(n.short_description || upcomingRelease.description || 'The New Era Is Coming') +
            '</p>' +
            (dateStr
              ? '<p class="text-silver/35 text-xs sm:text-sm tracking-[0.2em] uppercase mb-8">' +
                esc(dateStr) +
                '</p>'
              : '<p class="mb-8"></p>') +
            '<div class="countdown flex items-center justify-center gap-3 sm:gap-5 mb-9" id="xo-countdown" data-release="' +
            esc(upcomingRelease.release_date ? upcomingRelease.release_date + 'T00:00:00' : '') +
            '">' +
            '<div class="countdown-unit"><span class="countdown-val" data-days>00</span><span class="countdown-label">Days</span></div>' +
            '<span class="countdown-sep" aria-hidden="true">:</span>' +
            '<div class="countdown-unit"><span class="countdown-val" data-hours>00</span><span class="countdown-label">Hrs</span></div>' +
            '<span class="countdown-sep" aria-hidden="true">:</span>' +
            '<div class="countdown-unit"><span class="countdown-val" data-mins>00</span><span class="countdown-label">Min</span></div>' +
            '<span class="countdown-sep" aria-hidden="true">:</span>' +
            '<div class="countdown-unit"><span class="countdown-val" data-secs>00</span><span class="countdown-label">Sec</span></div>' +
            '</div>' +
            (preHref
              ? '<a href="' +
                esc(preHref) +
                '" ' +
                (isExternal || /^https?:/.test(preHref)
                  ? 'target="_blank" rel="noopener noreferrer"'
                  : '') +
                ' class="btn-primary inline-flex"><span>' +
                esc(btnText.indexOf('Pre') >= 0 ? btnText : 'Pre-Save ' + (upcomingRelease.title || 'XØ')) +
                '</span></a>'
              : '') +
            '</div></div>';
        } else {
          body =
            '<div class="news-slide-inner flex flex-col items-center justify-center text-center py-10 sm:py-14">' +
            '<p class="news-eyebrow">' +
            esc(num) +
            (n.featured ? ' — Featured' : '') +
            '</p>' +
            '<h2 class="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">' +
            esc(n.title) +
            '</h2>' +
            (n.short_description
              ? '<p class="text-silver/50 text-base sm:text-lg mb-9 max-w-md font-light">' +
                esc(n.short_description) +
                '</p>'
              : '') +
            (btnUrl
              ? '<a href="' +
                esc(btnUrl) +
                '" ' +
                (isExternal ? 'target="_blank" rel="noopener noreferrer"' : '') +
                ' class="btn-primary inline-flex"><span>' +
                esc(btnText) +
                '</span></a>'
              : '') +
            '</div>';
        }

        return (
          '<article class="news-slide' +
          (i === 0 ? ' active' : '') +
          '" data-slide="' +
          i +
          '" aria-hidden="' +
          (i === 0 ? 'false' : 'true') +
          '">' +
          body +
          '</article>'
        );
      })
      .join('');

    if (dotsWrap) {
      dotsWrap.innerHTML = items
        .map(function (_, i) {
          return (
            '<button class="news-dot' +
            (i === 0 ? ' active' : '') +
            '" data-index="' +
            i +
            '" role="tab" aria-selected="' +
            (i === 0 ? 'true' : 'false') +
            '" aria-label="Update ' +
            (i + 1) +
            '"></button>'
          );
        })
        .join('');
    }

    if (window.EseXOSite) {
      if (window.EseXOSite.reinitNews) window.EseXOSite.reinitNews();
      if (window.EseXOSite.initCountdown) window.EseXOSite.initCountdown();
    }
  }

  /* ---------- Music ---------- */
  function renderMusic(releases) {
    const catalog = {};
    (releases || []).forEach(function (r) {
      if (r.slug) catalog[r.slug] = mapRelease(r);
    });
    if (window.EseXOSite && window.EseXOSite.setReleasesCatalog) {
      window.EseXOSite.setReleasesCatalog(catalog);
    }

    const upcoming = (releases || []).filter(function (r) {
      return r.status === 'UPCOMING';
    });
    const featured = upcoming[0] || null;
    const wrap = document.getElementById('featured-release-wrap');
    const feat = document.getElementById('featured-release');
    if (wrap && feat) {
      if (featured) {
        wrap.hidden = false;
        const m = mapRelease(featured);
        const art = m.artwork_url
          ? '<img src="' + esc(m.artwork_url) + '" alt="" class="absolute inset-0 w-full h-full object-cover" />'
          : '<span class="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter text-white/90">' +
            esc(m.initials) +
            '</span>';
        const cta = m.onerpm
          ? '<a href="' +
            esc(m.onerpm) +
            '" target="_blank" rel="noopener noreferrer" class="btn-primary inline-flex text-sm"><span>Pre-Save</span></a>'
          : m.spotify
            ? '<button type="button" class="btn-primary inline-flex text-sm release-open" data-release="' +
              esc(m.slug) +
              '"><span>Listen Now</span></button>'
            : '';
        feat.innerHTML =
          '<div class="release-art shrink-0 w-40 h-40 sm:w-48 sm:h-48 relative">' +
          '<div class="absolute inset-0 bg-gradient-to-br from-cosmic/50 via-ash to-void flex items-center justify-center overflow-hidden">' +
          art +
          '</div></div>' +
          '<div class="text-center sm:text-left">' +
          '<span class="inline-block text-[10px] tracking-[0.25em] uppercase text-glow font-medium mb-2 px-2 py-0.5 bg-cosmic/10">Upcoming</span>' +
          '<h3 class="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-1">' +
          esc(m.title) +
          '</h3>' +
          '<p class="text-silver/50 text-sm mb-1">Upcoming ' +
          esc(m.type) +
          '</p>' +
          (m.release_date
            ? '<p class="text-xs text-silver/35 tracking-wider uppercase mb-5">' +
              esc(formatDate(m.release_date)) +
              '</p>'
            : '<p class="mb-5"></p>') +
          cta +
          '</div>';
      } else {
        wrap.hidden = true;
        feat.innerHTML = '';
      }
    }

    const grid = document.getElementById('releases-grid');
    if (!grid) return;
    const released = (releases || []).filter(function (r) {
      return r.status === 'RELEASED';
    });
    if (!released.length) {
      grid.innerHTML =
        '<p class="col-span-full text-center text-silver/40 text-sm py-8">No releases yet.</p>';
      return;
    }
    const gradients = [
      'from-ash via-smoke to-charcoal',
      'from-charcoal via-ash to-cosmic/20',
      'from-smoke via-ash to-void',
      'from-cosmic/25 via-ash to-charcoal',
      'from-ash to-smoke',
      'from-nebula/15 via-smoke to-void',
    ];
    grid.innerHTML = released
      .map(function (r, i) {
        const m = mapRelease(r);
        const g = gradients[i % gradients.length];
        const artInner = m.artwork_url
          ? '<img src="' +
            esc(m.artwork_url) +
            '" alt="" class="absolute inset-0 w-full h-full object-cover" />'
          : '<span class="font-display text-lg sm:text-xl font-bold text-white/20 tracking-wide group-hover:text-white/35 transition-colors">' +
            esc(m.initials) +
            '</span>';
        return (
          '<button type="button" class="release-card group text-left" data-release="' +
          esc(m.slug) +
          '">' +
          '<div class="release-card-art aspect-square mb-3 bg-gradient-to-br ' +
          g +
          ' flex items-center justify-center relative overflow-hidden">' +
          artInner +
          '<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">' +
          '<span class="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">' +
          '<svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
          '</span></div></div>' +
          '<h3 class="font-display text-sm sm:text-base font-semibold tracking-tight truncate">' +
          esc(m.title) +
          '</h3>' +
          '<p class="text-xs text-silver/40 tracking-wider uppercase mt-0.5">' +
          esc(m.type) +
          '</p></button>'
        );
      })
      .join('');
  }

  /* ---------- Videos ---------- */
  function renderVideos(videos) {
    const grid = document.querySelector('#videos .grid.sm\\:grid-cols-2') ||
      document.querySelector('#videos [class*="grid"]');
    if (!grid) return;
    const list = (videos || []).filter(function (v) {
      return v.published !== false;
    });
    if (!list.length) {
      grid.innerHTML =
        '<p class="col-span-full text-center text-silver/40 text-sm py-8">No videos yet.</p>';
      return;
    }
    grid.innerHTML = list
      .map(function (v) {
        const thumb = v.thumbnail_url
          ? '<img src="' + esc(v.thumbnail_url) + '" alt="" class="absolute inset-0 w-full h-full object-cover" />'
          : '<div class="absolute inset-0 bg-gradient-to-br from-cosmic/30 via-ash to-charcoal"></div>' +
            '<div class="absolute inset-0 flex items-center justify-center">' +
            '<span class="font-display text-2xl font-bold text-white/20 tracking-wider">' +
            esc(initials(v.title)) +
            '</span></div>';
        return (
          '<article class="video-card reveal group cursor-pointer visible" data-video-id="' +
          esc(String(v.id)) +
          '" data-video-url="' +
          esc(v.video_url || '') +
          '" data-video-title="' +
          esc(v.title) +
          '">' +
          '<div class="relative aspect-video overflow-hidden rounded-sm bg-ash">' +
          thumb +
          '<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex items-center justify-center">' +
          '<div class="w-14 h-14 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300">' +
          '<svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
          '</div></div></div>' +
          '<div class="mt-3 flex items-baseline justify-between">' +
          '<h3 class="font-display text-lg font-semibold tracking-tight">' +
          esc(v.title) +
          '</h3>' +
          '<span class="text-xs text-silver/40 tracking-wider uppercase">' +
          esc(v.video_type || 'Video') +
          '</span></div></article>'
        );
      })
      .join('');
  }

  /* ---------- Gallery ---------- */
  function objectFit(mode) {
    if (mode === 'CONTAIN' || mode === 'NATURAL') return 'contain';
    return 'cover';
  }

  function renderGalleryFromData(groups, looseImages) {
    const masonry = document.getElementById('gallery-masonry');
    if (!masonry) return;

    const publishedGroups = (groups || []).filter(function (g) {
      return g.published !== false;
    });

    // Prefer groups; fall back to loose images
    if (publishedGroups.length) {
      masonry.className = 'gallery-dynamic';
      masonry.innerHTML = publishedGroups
        .map(function (g) {
          return renderGroupBlock(g);
        })
        .join('');
      initGallerySliders(masonry);
      return;
    }

    const list = (looseImages || []).filter(function (g) {
      return g.published !== false;
    });
    if (!list.length) {
      masonry.className = 'gallery-masonry reveal';
      masonry.innerHTML =
        '<p class="text-center text-silver/40 text-sm py-8">No gallery images yet.</p>';
      return;
    }
    masonry.className = 'gallery-masonry reveal visible';
    masonry.innerHTML = list
      .map(function (g, i) {
        const fit = objectFit(g.display_mode);
        const pos = (g.focal_point_x != null ? g.focal_point_x : 50) + '% ' + (g.focal_point_y != null ? g.focal_point_y : 50) + '%';
        const extra = i % 6 === 0 || i % 6 === 5 ? ' gallery-tall' : i % 6 === 3 ? ' gallery-wide' : '';
        const img = g.image_url
          ? '<img src="' +
            esc(g.image_url) +
            '" alt="' +
            esc(g.title || '') +
            '" loading="lazy" style="object-fit:' +
            fit +
            ';object-position:' +
            pos +
            '" />'
          : '';
        return (
          '<div class="gallery-item' +
          extra +
          '" data-index="' +
          i +
          '" data-src="' +
          esc(g.image_url || '') +
          '" data-caption="' +
          esc(g.caption || g.title || '') +
          '">' +
          '<div class="gallery-placeholder bg-gradient-to-br from-ash to-charcoal">' +
          img +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderGroupBlock(g) {
    const images = g.images || [];
    const layout = g.layout || 'MASONRY';
    const title =
      '<div class="gallery-group-head">' +
      '<h3 class="font-display text-xl sm:text-2xl font-semibold tracking-tight">' +
      esc(g.title) +
      '</h3>' +
      (g.description
        ? '<p class="text-silver/50 text-sm mt-1 max-w-xl">' + esc(g.description) + '</p>'
        : '') +
      '</div>';

    if (!images.length) {
      return '<div class="gallery-group" data-layout="' + esc(layout) + '">' + title + '</div>';
    }

    if (layout === 'CAROUSEL' || layout === 'SLIDESHOW' || layout === 'FULLSCREEN') {
      return (
        '<div class="gallery-group gallery-slider-wrap" data-layout="' +
        esc(layout) +
        '" data-autoplay="' +
        (g.autoplay ? '1' : '0') +
        '" data-speed="' +
        (g.autoplay_speed || 5000) +
        '" data-loop="' +
        (g.loop !== false ? '1' : '0') +
        '" data-lightbox="' +
        (g.lightbox_enabled !== false ? '1' : '0') +
        '">' +
        title +
        '<div class="gallery-slider">' +
        '<div class="gallery-slider-track">' +
        images
          .map(function (img, i) {
            const fit = objectFit(img.display_mode);
            const pos =
              (img.focal_point_x != null ? img.focal_point_x : 50) +
              '% ' +
              (img.focal_point_y != null ? img.focal_point_y : 50) +
              '%';
            return (
              '<div class="gallery-slide' +
              (i === 0 ? ' active' : '') +
              '" data-src="' +
              esc(img.image_url || '') +
              '" data-caption="' +
              esc(img.caption || img.title || '') +
              '">' +
              (img.image_url
                ? '<img src="' +
                  esc(img.image_url) +
                  '" alt="' +
                  esc(img.title || '') +
                  '" loading="' +
                  (i === 0 ? 'eager' : 'lazy') +
                  '" style="object-fit:' +
                  fit +
                  ';object-position:' +
                  pos +
                  '" />'
                : '') +
              '</div>'
            );
          })
          .join('') +
        '</div>' +
        (g.show_arrows !== false
          ? '<button type="button" class="gallery-arrow prev" aria-label="Previous">‹</button>' +
            '<button type="button" class="gallery-arrow next" aria-label="Next">›</button>'
          : '') +
        (g.show_dots !== false
          ? '<div class="gallery-dots">' +
            images
              .map(function (_, i) {
                return (
                  '<button type="button" class="gallery-dot' +
                  (i === 0 ? ' active' : '') +
                  '" data-i="' +
                  i +
                  '" aria-label="Slide ' +
                  (i + 1) +
                  '"></button>'
                );
              })
              .join('') +
            '</div>'
          : '') +
        '</div></div>'
      );
    }

    if (layout === 'HORIZONTAL') {
      return (
        '<div class="gallery-group" data-layout="HORIZONTAL">' +
        title +
        '<div class="gallery-hscroll">' +
        images
          .map(function (img, i) {
            const fit = objectFit(img.display_mode);
            const pos =
              (img.focal_point_x != null ? img.focal_point_x : 50) +
              '% ' +
              (img.focal_point_y != null ? img.focal_point_y : 50) +
              '%';
            return (
              '<div class="gallery-hitem" data-src="' +
              esc(img.image_url || '') +
              '" data-caption="' +
              esc(img.caption || img.title || '') +
              '">' +
              (img.image_url
                ? '<img src="' +
                  esc(img.image_url) +
                  '" alt="" loading="lazy" style="object-fit:' +
                  fit +
                  ';object-position:' +
                  pos +
                  '" />'
                : '') +
              '</div>'
            );
          })
          .join('') +
        '</div></div>'
      );
    }

    if (layout === 'SINGLE' || layout === 'FEATURED_THUMBS') {
      const main = images[0];
      const fit = objectFit(main.display_mode);
      const pos =
        (main.focal_point_x != null ? main.focal_point_x : 50) +
        '% ' +
        (main.focal_point_y != null ? main.focal_point_y : 50) +
        '%';
      return (
        '<div class="gallery-group" data-layout="' +
        esc(layout) +
        '">' +
        title +
        '<div class="gallery-featured-main" data-src="' +
        esc(main.image_url || '') +
        '" data-caption="' +
        esc(main.caption || main.title || '') +
        '">' +
        (main.image_url
          ? '<img src="' +
            esc(main.image_url) +
            '" alt="" loading="eager" style="object-fit:' +
            fit +
            ';object-position:' +
            pos +
            '" />'
          : '') +
        '</div>' +
        (layout === 'FEATURED_THUMBS' && images.length > 1
          ? '<div class="gallery-thumbs">' +
            images
              .map(function (img, i) {
                return (
                  '<button type="button" class="gallery-thumb' +
                  (i === 0 ? ' active' : '') +
                  '" data-src="' +
                  esc(img.image_url || '') +
                  '" data-caption="' +
                  esc(img.caption || img.title || '') +
                  '">' +
                  (img.image_url
                    ? '<img src="' + esc(img.image_url) + '" alt="" loading="lazy" />'
                    : '') +
                  '</button>'
                );
              })
              .join('') +
            '</div>'
          : '') +
        '</div>'
      );
    }

    // GRID / MASONRY default
    const cls = layout === 'GRID' ? 'gallery-grid' : 'gallery-masonry';
    return (
      '<div class="gallery-group" data-layout="' +
      esc(layout) +
      '">' +
      title +
      '<div class="' +
      cls +
      '">' +
      images
        .map(function (img, i) {
          const fit = objectFit(img.display_mode);
          const pos =
            (img.focal_point_x != null ? img.focal_point_x : 50) +
            '% ' +
            (img.focal_point_y != null ? img.focal_point_y : 50) +
            '%';
          const extra =
            layout === 'MASONRY'
              ? i % 6 === 0 || i % 6 === 5
                ? ' gallery-tall'
                : i % 6 === 3
                  ? ' gallery-wide'
                  : ''
              : '';
          return (
            '<div class="gallery-item' +
            extra +
            '" data-src="' +
            esc(img.image_url || '') +
            '" data-caption="' +
            esc(img.caption || img.title || '') +
            '">' +
            '<div class="gallery-placeholder bg-gradient-to-br from-ash to-charcoal">' +
            (img.image_url
              ? '<img src="' +
                esc(img.image_url) +
                '" alt="' +
                esc(img.title || '') +
                '" loading="lazy" style="object-fit:' +
                fit +
                ';object-position:' +
                pos +
                '" />'
              : '') +
            '</div></div>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }

  function initGallerySliders(root) {
    root.querySelectorAll('.gallery-slider-wrap').forEach(function (wrap) {
      const slides = wrap.querySelectorAll('.gallery-slide');
      const dots = wrap.querySelectorAll('.gallery-dot');
      let idx = 0;
      const loop = wrap.dataset.loop !== '0';
      const speed = parseInt(wrap.dataset.speed, 10) || 5000;
      let timer = null;

      function go(n) {
        if (!slides.length) return;
        if (loop) idx = ((n % slides.length) + slides.length) % slides.length;
        else idx = Math.max(0, Math.min(slides.length - 1, n));
        slides.forEach(function (s, i) {
          s.classList.toggle('active', i === idx);
        });
        dots.forEach(function (d, i) {
          d.classList.toggle('active', i === idx);
        });
      }

      wrap.querySelector('.gallery-arrow.next')?.addEventListener('click', function () {
        go(idx + 1);
        restart();
      });
      wrap.querySelector('.gallery-arrow.prev')?.addEventListener('click', function () {
        go(idx - 1);
        restart();
      });
      dots.forEach(function (d) {
        d.addEventListener('click', function () {
          go(Number(d.dataset.i));
          restart();
        });
      });

      // swipe
      let startX = 0;
      const track = wrap.querySelector('.gallery-slider');
      track?.addEventListener(
        'touchstart',
        function (e) {
          startX = e.changedTouches[0].screenX;
        },
        { passive: true }
      );
      track?.addEventListener(
        'touchend',
        function (e) {
          const dx = e.changedTouches[0].screenX - startX;
          if (Math.abs(dx) > 40) {
            go(idx + (dx < 0 ? 1 : -1));
            restart();
          }
        },
        { passive: true }
      );

      function restart() {
        if (timer) clearInterval(timer);
        if (wrap.dataset.autoplay === '1' && slides.length > 1) {
          timer = setInterval(function () {
            go(idx + 1);
          }, speed);
        }
      }
      restart();
    });

    // featured thumbs
    root.querySelectorAll('.gallery-thumbs').forEach(function (thumbs) {
      const main = thumbs.parentElement.querySelector('.gallery-featured-main img');
      const mainWrap = thumbs.parentElement.querySelector('.gallery-featured-main');
      thumbs.addEventListener('click', function (e) {
        const t = e.target.closest('.gallery-thumb');
        if (!t || !main) return;
        thumbs.querySelectorAll('.gallery-thumb').forEach(function (x) {
          x.classList.remove('active');
        });
        t.classList.add('active');
        main.src = t.dataset.src || '';
        if (mainWrap) {
          mainWrap.dataset.src = t.dataset.src || '';
          mainWrap.dataset.caption = t.dataset.caption || '';
        }
      });
    });
  }

  function renderGallery(images) {
    // legacy single-arg; loadAll will call renderGalleryFromData
    renderGalleryFromData([], images);
  }

  /* ---------- Settings ---------- */
  function applySettings(s) {
    if (!s) return;
    const bio = document.getElementById('artist-bio');
    if (bio && s.artist_bio) bio.textContent = s.artist_bio;

    if (s.contact_email) {
      const disp = document.getElementById('contact-email-display');
      const btn = document.getElementById('contact-email-btn');
      if (disp) {
        disp.href = 'mailto:' + s.contact_email;
        disp.textContent = s.contact_email;
      }
      if (btn) btn.href = 'mailto:' + s.contact_email;
    }

    const map = {
      tiktok: s.tiktok_url,
      instagram: s.instagram_url,
      youtube: s.youtube_url,
      x: s.x_twitter_url,
    };
    Object.keys(map).forEach(function (key) {
      if (!map[key]) return;
      document.querySelectorAll('[data-social="' + key + '"]').forEach(function (a) {
        a.href = map[key];
      });
    });

    if (s.spotify_artist_url) {
      document.querySelectorAll('a[href*="open.spotify.com/artist"]').forEach(function (a) {
        a.href = s.spotify_artist_url;
      });
    }

    const nameEls = document.querySelectorAll('[data-artist-name]');
    nameEls.forEach(function (el) {
      if (s.artist_name) el.textContent = s.artist_name;
    });
  }

  async function loadAll() {
    if (!window.EseXOApi) {
      console.info('EseXOApi missing');
      return;
    }
    try {
      const [releases, news, videos, gallery, galleryGroups, settings] = await Promise.all([
        window.EseXOApi.releases().catch(function () {
          return [];
        }),
        window.EseXOApi.news().catch(function () {
          return [];
        }),
        window.EseXOApi.videos().catch(function () {
          return [];
        }),
        window.EseXOApi.gallery().catch(function () {
          return [];
        }),
        (window.EseXOApi.galleryGroups
          ? window.EseXOApi.galleryGroups()
          : Promise.resolve([])
        ).catch(function () {
          return [];
        }),
        window.EseXOApi.siteSettings().catch(function () {
          return null;
        }),
      ]);

      const upcoming =
        (releases || []).find(function (r) {
          return r.slug === 'xo' && r.status === 'UPCOMING';
        }) ||
        (releases || []).find(function (r) {
          return r.status === 'UPCOMING';
        }) ||
        null;

      renderNews(news, upcoming);
      renderMusic(releases);
      renderVideos(videos);
      renderGalleryFromData(galleryGroups, gallery);
      applySettings(settings);

      if (window.EseXOSite && window.EseXOSite.bindDynamicUI) {
        window.EseXOSite.bindDynamicUI();
      }
    } catch (err) {
      console.info('EseXO content load failed:', err.message || err);
      const grid = document.getElementById('releases-grid');
      if (grid && grid.querySelector('#releases-loading')) {
        grid.innerHTML =
          '<p class="col-span-full text-center text-silver/40 text-sm py-8">Unable to load releases. Start the API server and refresh.</p>';
      }
    }
  }

  window.EseXOContent = { loadAll: loadAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }
})();
