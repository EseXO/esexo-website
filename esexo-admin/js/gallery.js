(async function () {
  'use strict';
  document.getElementById('sidebar').innerHTML = EseXOAuth.sidebarHTML();
  const user = await EseXOAuth.requireAuth();
  if (!user) return;
  EseXOAuth.bindShell(user);

  let items = [];
  let groups = [];
  let selected = new Set();
  let deleteIds = [];
  let deleteMode = 'images'; // images | group
  let cropper = null;
  let pendingFiles = [];
  let groupSelectedIds = [];

  const grid = document.getElementById('grid');
  const modal = document.getElementById('modal');
  const groupModal = document.getElementById('group-modal');
  const deleteModal = document.getElementById('delete-modal');

  function openModalEl(el) {
    el.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeModalEl(el) {
    el.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  /* Tabs */
  document.querySelectorAll('.gallery-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gallery-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      document.getElementById('tab-library').hidden = name !== 'library';
      document.getElementById('tab-groups').hidden = name !== 'groups';
      if (name === 'groups') loadGroups();
    });
  });
  document.getElementById('btn-groups').addEventListener('click', () => {
    document.querySelector('.gallery-tab[data-tab="groups"]').click();
  });

  /* Filters */
  function filtered() {
    const q = (document.getElementById('search').value || '').toLowerCase();
    const pub = document.getElementById('filter-published').value;
    const feat = document.getElementById('filter-featured').value;
    const sort = document.getElementById('sort-by').value;
    let list = items.slice();
    if (q) {
      list = list.filter((i) =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.caption || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }
    if (pub === 'true') list = list.filter((i) => i.published);
    if (pub === 'false') list = list.filter((i) => !i.published);
    if (feat === 'true') list = list.filter((i) => i.featured);
    if (feat === 'false') list = list.filter((i) => !i.featured);
    if (sort === 'newest') list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    else if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return list;
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    const n = selected.size;
    bar.hidden = n === 0;
    document.getElementById('bulk-count').textContent = n + ' selected';
  }

  function renderLibrary() {
    const list = filtered();
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No images yet. Upload to get started.</div>';
      return;
    }
    grid.innerHTML = list
      .map((g) => {
        const src = g.image_url || '';
        const on = selected.has(g.id) ? ' selected' : '';
        return (
          '<div class="gallery-card' + on + '" draggable="true" data-id="' + g.id + '">' +
          '<input type="checkbox" class="sel-check" data-sel="' + g.id + '" ' + (selected.has(g.id) ? 'checked' : '') + ' />' +
          (src ? '<img src="' + src + '" alt="" loading="lazy" />' : '<div style="aspect-ratio:1;background:var(--bg-input)"></div>') +
          '<div class="gallery-card-body">' +
          '<strong>' + (g.title || 'Untitled') + '</strong>' +
          '<div class="gallery-card-meta">' +
          (g.published ? 'Published' : 'Hidden') +
          (g.featured ? ' · ★' : '') +
          (g.category ? ' · ' + g.category : '') +
          '</div>' +
          '<div class="gallery-card-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-edit="' + g.id + '">Edit</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-del="' + g.id + '">Delete</button>' +
          '</div></div></div>'
        );
      })
      .join('');
    bindDragReorder();
  }

  async function loadLibrary() {
    try {
      items = await EseXOAdminApi.getGallery();
      renderLibrary();
    } catch (err) {
      grid.innerHTML = '<div class="empty-state">' + (err.message || 'Failed') + '</div>';
    }
  }

  ['search', 'filter-published', 'filter-featured', 'sort-by'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderLibrary);
    document.getElementById(id).addEventListener('change', renderLibrary);
  });

  grid.addEventListener('click', (e) => {
    const sel = e.target.closest('[data-sel]');
    if (sel) {
      const id = Number(sel.getAttribute('data-sel'));
      if (sel.checked) selected.add(id);
      else selected.delete(id);
      updateBulkBar();
      renderLibrary();
      return;
    }
    const ed = e.target.closest('[data-edit]');
    if (ed) {
      const g = items.find((x) => String(x.id) === ed.getAttribute('data-edit'));
      if (g) openEdit(g);
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      deleteMode = 'images';
      deleteIds = [Number(del.getAttribute('data-del'))];
      document.getElementById('delete-msg').textContent = 'Delete this image permanently?';
      openModalEl(deleteModal);
    }
  });

  /* Drag reorder */
  let dragId = null;
  function bindDragReorder() {
    grid.querySelectorAll('.gallery-card').forEach((card) => {
      card.addEventListener('dragstart', () => {
        dragId = card.dataset.id;
        card.style.opacity = '0.5';
      });
      card.addEventListener('dragend', () => {
        card.style.opacity = '';
        dragId = null;
      });
      card.addEventListener('dragover', (e) => e.preventDefault());
      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        const targetId = card.dataset.id;
        if (!dragId || dragId === targetId) return;
        const order = filtered().map((i) => i.id);
        const from = order.indexOf(Number(dragId));
        const to = order.indexOf(Number(targetId));
        if (from < 0 || to < 0) return;
        order.splice(to, 0, order.splice(from, 1)[0]);
        try {
          await EseXOAdminApi.reorderGallery(order);
          EseXOAuth.toast('Order saved', 'success');
          await loadLibrary();
        } catch (err) {
          EseXOAuth.toast(err.message, 'error');
        }
      });
    });
  }

  /* Bulk */
  document.getElementById('bulk-clear').onclick = () => {
    selected.clear();
    updateBulkBar();
    renderLibrary();
  };
  document.getElementById('bulk-publish').onclick = async () => {
    try {
      await EseXOAdminApi.bulkUpdateGallery([...selected], { published: true });
      EseXOAuth.toast('Published', 'success');
      selected.clear();
      updateBulkBar();
      await loadLibrary();
    } catch (e) {
      EseXOAuth.toast(e.message, 'error');
    }
  };
  document.getElementById('bulk-unpublish').onclick = async () => {
    try {
      await EseXOAdminApi.bulkUpdateGallery([...selected], { published: false });
      EseXOAuth.toast('Unpublished', 'success');
      selected.clear();
      updateBulkBar();
      await loadLibrary();
    } catch (e) {
      EseXOAuth.toast(e.message, 'error');
    }
  };
  document.getElementById('bulk-delete').onclick = () => {
    deleteMode = 'images';
    deleteIds = [...selected];
    document.getElementById('delete-msg').textContent =
      'Delete ' + deleteIds.length + ' image(s)? This cannot be undone.';
    openModalEl(deleteModal);
  };
  document.getElementById('bulk-to-group').onclick = () => {
    document.querySelector('.gallery-tab[data-tab="groups"]').click();
    openGroupForm(null, [...selected]);
  };

  document.getElementById('delete-cancel').onclick = () => closeModalEl(deleteModal);
  document.getElementById('delete-confirm').onclick = async () => {
    try {
      if (deleteMode === 'group') {
        await EseXOAdminApi.deleteGalleryGroup(deleteIds[0]);
        EseXOAuth.toast('Group deleted', 'success');
        closeModalEl(deleteModal);
        await loadGroups();
      } else {
        await EseXOAdminApi.bulkDeleteGallery(deleteIds);
        EseXOAuth.toast('Deleted', 'success');
        selected.clear();
        updateBulkBar();
        closeModalEl(deleteModal);
        await loadLibrary();
      }
    } catch (e) {
      EseXOAuth.toast(e.message, 'error');
    }
  };

  /* Upload / edit */
  function resetForm() {
    document.getElementById('gallery-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('published').checked = true;
    document.getElementById('modal-title').textContent = 'Upload images';
    document.getElementById('upload-zone').hidden = false;
    document.getElementById('crop-section').hidden = true;
    document.getElementById('upload-queue').innerHTML = '';
    document.getElementById('upload-progress').hidden = true;
    pendingFiles = [];
    destroyCropper();
  }

  function openEdit(g) {
    resetForm();
    document.getElementById('edit-id').value = g.id;
    document.getElementById('modal-title').textContent = 'Edit image';
    document.getElementById('title').value = g.title || '';
    document.getElementById('caption').value = g.caption || '';
    document.getElementById('category').value = g.category || '';
    document.getElementById('display_mode').value = g.display_mode || 'COVER';
    document.getElementById('focal_x').value = g.focal_point_x != null ? g.focal_point_x : 50;
    document.getElementById('focal_y').value = g.focal_point_y != null ? g.focal_point_y : 50;
    document.getElementById('display_order').value = g.display_order || 0;
    document.getElementById('featured').checked = !!g.featured;
    document.getElementById('published').checked = !!g.published;
    document.getElementById('upload-zone').hidden = true;
    if (g.image_url) {
      document.getElementById('crop-section').hidden = false;
      const img = document.getElementById('crop-image');
      img.src = g.image_url;
      img.onload = () => initCropper();
      const prev = document.getElementById('fit-preview-img');
      prev.src = g.image_url;
      prev.style.objectPosition = (g.focal_point_x || 50) + '% ' + (g.focal_point_y || 50) + '%';
    }
    openModalEl(modal);
  }

  document.getElementById('btn-upload').onclick = () => {
    resetForm();
    openModalEl(modal);
  };
  document.getElementById('modal-close').onclick = () => {
    destroyCropper();
    closeModalEl(modal);
  };
  document.getElementById('modal-cancel').onclick = () => {
    destroyCropper();
    closeModalEl(modal);
  };

  document.getElementById('image-files').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    pendingFiles = files;
    const q = document.getElementById('upload-queue');
    q.innerHTML = '';
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      const im = document.createElement('img');
      im.src = url;
      q.appendChild(im);
    });
    if (files[0]) {
      document.getElementById('crop-section').hidden = false;
      const img = document.getElementById('crop-image');
      img.src = URL.createObjectURL(files[0]);
      img.onload = () => initCropper();
      document.getElementById('fit-preview-img').src = img.src;
    }
  });

  function initCropper() {
    destroyCropper();
    const image = document.getElementById('crop-image');
    cropper = new Cropper(image, {
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
      background: false,
    });
  }

  document.getElementById('aspect-ratio').addEventListener('change', (e) => {
    if (!cropper) return;
    const v = parseFloat(e.target.value);
    cropper.setAspectRatio(Number.isNaN(v) ? NaN : v);
  });
  document.getElementById('crop-rotate').onclick = () => cropper && cropper.rotate(90);
  document.getElementById('crop-reset').onclick = () => cropper && cropper.reset();

  document.getElementById('display_mode').addEventListener('change', (e) => {
    document.getElementById('fit-preview').dataset.mode = e.target.value;
  });
  document.getElementById('focal_x').addEventListener('input', updateFocalPreview);
  document.getElementById('focal_y').addEventListener('input', updateFocalPreview);
  function updateFocalPreview() {
    const img = document.getElementById('fit-preview-img');
    img.style.objectPosition =
      (document.getElementById('focal_x').value || 50) +
      '% ' +
      (document.getElementById('focal_y').value || 50) +
      '%';
  }
  document.querySelectorAll('[data-device]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-device]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const prev = document.getElementById('fit-preview');
      if (btn.dataset.device === 'mobile') prev.style.maxWidth = '160px';
      else if (btn.dataset.device === 'tablet') prev.style.maxWidth = '220px';
      else prev.style.maxWidth = '280px';
    });
  });

  function aspectLabel(val) {
    const map = { NaN: 'ORIGINAL', '1': '1:1', '1.333': '4:3', '1.777': '16:9', '0.8': '4:5', '0.75': '3:4', '0.5625': '9:16' };
    return map[String(val)] || 'ORIGINAL';
  }

  async function getCroppedBlob() {
    if (!cropper) return null;
    const canvas = cropper.getCroppedCanvas({ maxWidth: 2400, maxHeight: 2400, imageSmoothingQuality: 'high' });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  }

  document.getElementById('gallery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    const editId = document.getElementById('edit-id').value;
    const payload = {
      title: document.getElementById('title').value.trim(),
      caption: document.getElementById('caption').value.trim(),
      category: document.getElementById('category').value.trim(),
      display_mode: document.getElementById('display_mode').value,
      aspect_ratio: aspectLabel(document.getElementById('aspect-ratio').value),
      focal_point_x: parseFloat(document.getElementById('focal_x').value) || 50,
      focal_point_y: parseFloat(document.getElementById('focal_y').value) || 50,
      display_order: parseInt(document.getElementById('display_order').value, 10) || 0,
      featured: document.getElementById('featured').checked,
      published: document.getElementById('published').checked,
      crop_data: cropper ? cropper.getData(true) : {},
    };

    const progress = document.getElementById('upload-progress');
    const bar = document.getElementById('upload-progress-bar');
    const ptext = document.getElementById('upload-progress-text');

    try {
      if (editId) {
        let file = null;
        if (cropper) {
          const blob = await getCroppedBlob();
          if (blob) file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        }
        await EseXOAdminApi.updateGalleryImage(editId, payload, file);
        EseXOAuth.toast('Image updated', 'success');
      } else {
        if (!pendingFiles.length) {
          EseXOAuth.toast('Select at least one image', 'error');
          btn.disabled = false;
          return;
        }
        progress.hidden = false;
        for (let i = 0; i < pendingFiles.length; i++) {
          ptext.textContent = 'Uploading ' + (i + 1) + ' / ' + pendingFiles.length;
          let file = pendingFiles[i];
          if (i === 0 && cropper) {
            const blob = await getCroppedBlob();
            if (blob) file = new File([blob], pendingFiles[i].name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
          }
          const p = Object.assign({}, payload);
          if (i > 0) p.title = payload.title ? payload.title + ' ' + (i + 1) : '';
          await EseXOAdminApi.uploadGalleryImageXHR(p, file, (pct) => {
            bar.style.width = pct + '%';
          });
        }
        EseXOAuth.toast(pendingFiles.length + ' image(s) uploaded', 'success');
      }
      destroyCropper();
      closeModalEl(modal);
      await loadLibrary();
    } catch (err) {
      var msg = err.message || 'Save failed';
      if (err.data && typeof err.data === 'object') {
        try {
          msg = Object.keys(err.data).map(function (k) {
            return k + ': ' + [].concat(err.data[k]).join(', ');
          }).join(' · ') || msg;
        } catch (e) {}
      }
      EseXOAuth.toast(msg, 'error');
      console.error('Gallery save error', err.data || err);
    } finally {
      btn.disabled = false;
      progress.hidden = true;
      bar.style.width = '0%';
    }
  });

  /* Groups */
  async function loadGroups() {
    const el = document.getElementById('groups-list');
    try {
      groups = await EseXOAdminApi.getGalleryGroups();
      if (!groups.length) {
        el.innerHTML = '<div class="empty-state">No gallery groups yet.</div>';
        return;
      }
      el.innerHTML = groups
        .map((g) => {
          const count = (g.images && g.images.length) || 0;
          return (
            '<div class="group-row">' +
            '<div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;align-items:center">' +
            '<div><strong class="font-display">' +
            (g.title || '') +
            '</strong>' +
            '<div class="hint-text" style="margin:0.25rem 0 0">' +
            g.layout +
            ' · ' +
            count +
            ' images · ' +
            (g.published ? 'Published' : 'Draft') +
            (g.featured ? ' · Featured' : '') +
            '</div></div>' +
            '<div style="display:flex;gap:0.4rem">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-gedit="' +
            g.slug +
            '">Edit</button>' +
            '<button type="button" class="btn btn-danger btn-sm" data-gdel="' +
            g.slug +
            '">Delete</button>' +
            '</div></div></div>'
          );
        })
        .join('');
    } catch (err) {
      el.innerHTML = '<div class="empty-state">' + err.message + '</div>';
    }
  }

  document.getElementById('btn-new-group').onclick = () => openGroupForm(null, []);
  document.getElementById('groups-list').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-gedit]');
    if (ed) {
      const g = groups.find((x) => x.slug === ed.getAttribute('data-gedit'));
      if (g) openGroupForm(g);
      return;
    }
    const del = e.target.closest('[data-gdel]');
    if (del) {
      deleteMode = 'group';
      deleteIds = [del.getAttribute('data-gdel')];
      document.getElementById('delete-msg').textContent = 'Delete this gallery group? Images stay in the library.';
      openModalEl(deleteModal);
    }
  });

  function openGroupForm(g, preselect) {
    document.getElementById('group-form').reset();
    document.getElementById('group-slug').value = g ? g.slug : '';
    document.getElementById('group-modal-title').textContent = g ? 'Edit group' : 'New group';
    document.getElementById('group-published').checked = g ? !!g.published : true;
    document.getElementById('group-loop').checked = g ? g.loop !== false : true;
    document.getElementById('group-arrows').checked = g ? g.show_arrows !== false : true;
    document.getElementById('group-dots').checked = g ? g.show_dots !== false : true;
    document.getElementById('group-lightbox').checked = g ? g.lightbox_enabled !== false : true;
    if (g) {
      document.getElementById('group-title').value = g.title || '';
      document.getElementById('group-description').value = g.description || '';
      document.getElementById('group-layout').value = g.layout || 'MASONRY';
      document.getElementById('group-featured').checked = !!g.featured;
      document.getElementById('group-autoplay').checked = !!g.autoplay;
      document.getElementById('group-thumbs').checked = !!g.show_thumbnails;
      document.getElementById('group-speed').value = g.autoplay_speed || 5000;
      document.getElementById('group-order').value = g.display_order || 0;
      groupSelectedIds = (g.images || []).map((i) => i.id);
    } else {
      groupSelectedIds = preselect || [];
    }
    renderGroupPicker();
    openModalEl(groupModal);
  }

  function renderGroupPicker() {
    const picker = document.getElementById('group-image-picker');
    const selectedEl = document.getElementById('group-selected');
    picker.innerHTML = items
      .map((i) => {
        const on = groupSelectedIds.includes(i.id) ? ' on' : '';
        return (
          '<img src="' +
          (i.image_url || '') +
          '" class="' +
          on +
          '" data-pick="' +
          i.id +
          '" alt="" loading="lazy" />'
        );
      })
      .join('');
    selectedEl.innerHTML = groupSelectedIds
      .map((id) => {
        const i = items.find((x) => x.id === id);
        if (!i) return '';
        return (
          '<div class="chip" draggable="true" data-chip="' +
          id +
          '"><img src="' +
          (i.image_url || '') +
          '" alt="" /><button type="button" data-rm="' +
          id +
          '">✕</button></div>'
        );
      })
      .join('');
  }

  document.getElementById('group-image-picker').addEventListener('click', (e) => {
    const img = e.target.closest('[data-pick]');
    if (!img) return;
    const id = Number(img.dataset.pick);
    const idx = groupSelectedIds.indexOf(id);
    if (idx >= 0) groupSelectedIds.splice(idx, 1);
    else groupSelectedIds.push(id);
    renderGroupPicker();
  });
  document.getElementById('group-selected').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (!rm) return;
    groupSelectedIds = groupSelectedIds.filter((id) => id !== Number(rm.dataset.rm));
    renderGroupPicker();
  });

  // drag reorder chips
  let chipDrag = null;
  document.getElementById('group-selected').addEventListener('dragstart', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (chip) chipDrag = Number(chip.dataset.chip);
  });
  document.getElementById('group-selected').addEventListener('dragover', (e) => e.preventDefault());
  document.getElementById('group-selected').addEventListener('drop', (e) => {
    e.preventDefault();
    const chip = e.target.closest('[data-chip]');
    if (!chip || chipDrag == null) return;
    const target = Number(chip.dataset.chip);
    const from = groupSelectedIds.indexOf(chipDrag);
    const to = groupSelectedIds.indexOf(target);
    if (from < 0 || to < 0) return;
    groupSelectedIds.splice(to, 0, groupSelectedIds.splice(from, 1)[0]);
    chipDrag = null;
    renderGroupPicker();
  });

  document.getElementById('group-modal-close').onclick = () => closeModalEl(groupModal);
  document.getElementById('group-cancel').onclick = () => closeModalEl(groupModal);

  document.getElementById('group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('group-save');
    btn.disabled = true;
    const slug = document.getElementById('group-slug').value;
    const payload = {
      title: document.getElementById('group-title').value.trim(),
      description: document.getElementById('group-description').value.trim(),
      layout: document.getElementById('group-layout').value,
      published: document.getElementById('group-published').checked,
      featured: document.getElementById('group-featured').checked,
      autoplay: document.getElementById('group-autoplay').checked,
      loop: document.getElementById('group-loop').checked,
      show_arrows: document.getElementById('group-arrows').checked,
      show_dots: document.getElementById('group-dots').checked,
      show_thumbnails: document.getElementById('group-thumbs').checked,
      lightbox_enabled: document.getElementById('group-lightbox').checked,
      autoplay_speed: parseInt(document.getElementById('group-speed').value, 10) || 5000,
      display_order: parseInt(document.getElementById('group-order').value, 10) || 0,
      image_ids: groupSelectedIds,
      slideshow_enabled: ['CAROUSEL', 'SLIDESHOW', 'FULLSCREEN'].includes(
        document.getElementById('group-layout').value
      ),
    };
    try {
      if (slug) {
        await EseXOAdminApi.updateGalleryGroup(slug, payload);
        EseXOAuth.toast('Group updated', 'success');
      } else {
        await EseXOAdminApi.createGalleryGroup(payload);
        EseXOAuth.toast('Group created', 'success');
      }
      closeModalEl(groupModal);
      await loadGroups();
    } catch (err) {
      EseXOAuth.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  await loadLibrary();
})();
