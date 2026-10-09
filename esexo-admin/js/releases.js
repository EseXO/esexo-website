(async function () {
  'use strict';

  document.getElementById('sidebar').innerHTML = EseXOAuth.sidebarHTML();
  const user = await EseXOAuth.requireAuth();
  if (!user) return;
  EseXOAuth.bindShell(user);

  let items = [];
  let deleteSlug = null;

  const listEl = document.getElementById('list');
  const modal = document.getElementById('modal');
  const deleteModal = document.getElementById('delete-modal');
  const form = document.getElementById('release-form');
  const artInput = document.getElementById('artwork');
  const artPreview = document.getElementById('art-preview');

  function openModal() {
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
  function openDelete() {
    deleteModal.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeDelete() {
    deleteModal.classList.remove('open');
    document.body.classList.remove('modal-open');
    deleteSlug = null;
  }

  function badge(status) {
    const c =
      status === 'UPCOMING' ? 'badge-upcoming' :
      status === 'RELEASED' ? 'badge-released' : 'badge-archived';
    return '<span class="badge ' + c + '">' + status + '</span>';
  }

  function render(rows) {
    if (!rows.length) {
      listEl.innerHTML = '<div class="empty-state">No releases found.</div>';
      return;
    }
    listEl.innerHTML =
      '<table class="data-table"><thead><tr>' +
      '<th></th><th>Title</th><th>Type</th><th>Status</th><th>Date</th><th>Featured</th><th></th>' +
      '</tr></thead><tbody>' +
      rows
        .map(function (r) {
          const img = r.artwork_url
            ? '<img class="thumb" src="' + r.artwork_url + '" alt="" />'
            : '<div class="thumb"></div>';
          return (
            '<tr>' +
            '<td>' + img + '</td>' +
            '<td><strong>' + r.title + '</strong></td>' +
            '<td>' + r.release_type + '</td>' +
            '<td>' + badge(r.status) + '</td>' +
            '<td>' + (r.release_date || '—') + '</td>' +
            '<td>' + (r.featured ? '★' : '—') + '</td>' +
            '<td style="white-space:nowrap">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-edit="' + r.slug + '">Edit</button> ' +
            '<button type="button" class="btn btn-danger btn-sm" data-del="' + r.slug + '" data-title="' + r.title.replace(/"/g, '&quot;') + '">Delete</button>' +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table>';
  }

  function filtered() {
    const q = (document.getElementById('search').value || '').toLowerCase();
    const st = document.getElementById('filter-status').value;
    return items.filter(function (r) {
      if (st && r.status !== st) return false;
      if (q && !(r.title || '').toLowerCase().includes(q) && !(r.slug || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  async function load() {
    listEl.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      items = await EseXOAdminApi.getReleases();
      render(filtered());
    } catch (err) {
      listEl.innerHTML = '<div class="empty-state">' + (err.message || 'Failed to load') + '</div>';
      EseXOAuth.toast(err.message, 'error');
    }
  }

  function resetForm() {
    form.reset();
    document.getElementById('edit-slug').value = '';
    document.getElementById('artist').value = 'EseXO';
    document.getElementById('modal-title').textContent = 'Add Release';
    artPreview.style.display = 'none';
    artPreview.src = '';
    artInput.value = '';
  }

  function fillForm(r) {
    document.getElementById('edit-slug').value = r.slug || '';
    document.getElementById('title').value = r.title || '';
    document.getElementById('slug').value = r.slug || '';
    document.getElementById('artist').value = r.artist || 'EseXO';
    document.getElementById('release_type').value = r.release_type || 'SINGLE';
    document.getElementById('status').value = r.status || 'RELEASED';
    document.getElementById('release_date').value = r.release_date || '';
    document.getElementById('spotify_url').value = r.spotify_url || '';
    document.getElementById('apple_music_url').value = r.apple_music_url || '';
    document.getElementById('audiomack_url').value = r.audiomack_url || '';
    document.getElementById('onerpm_url').value = r.onerpm_url || '';
    document.getElementById('description').value = r.description || '';
    document.getElementById('featured').checked = !!r.featured;
    document.getElementById('modal-title').textContent = 'Edit Release';
    if (r.artwork_url) {
      artPreview.src = r.artwork_url;
      artPreview.style.display = 'block';
    } else {
      artPreview.style.display = 'none';
    }
  }

  document.getElementById('btn-add').addEventListener('click', function () {
    resetForm();
    openModal();
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('delete-cancel').addEventListener('click', closeDelete);

  artInput.addEventListener('change', function () {
    const f = artInput.files && artInput.files[0];
    if (f) {
      artPreview.src = URL.createObjectURL(f);
      artPreview.style.display = 'block';
    }
  });

  document.getElementById('search').addEventListener('input', function () {
    render(filtered());
  });
  document.getElementById('filter-status').addEventListener('change', function () {
    render(filtered());
  });

  listEl.addEventListener('click', function (e) {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) {
      const r = items.find(function (x) { return x.slug === edit.getAttribute('data-edit'); });
      if (r) {
        fillForm(r);
        openModal();
      }
    }
    if (del) {
      deleteSlug = del.getAttribute('data-del');
      document.getElementById('delete-msg').textContent =
        'Are you sure you want to delete “' + del.getAttribute('data-title') + '”?';
      openDelete();
    }
  });

  document.getElementById('delete-confirm').addEventListener('click', async function () {
    if (!deleteSlug) return;
    try {
      await EseXOAdminApi.deleteRelease(deleteSlug);
      EseXOAuth.toast('Release deleted', 'success');
      closeDelete();
      await load();
    } catch (err) {
      EseXOAuth.toast(err.message, 'error');
    }
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {
      title: document.getElementById('title').value.trim(),
      slug: document.getElementById('slug').value.trim() || undefined,
      artist: document.getElementById('artist').value.trim() || 'EseXO',
      release_type: document.getElementById('release_type').value,
      status: document.getElementById('status').value,
      release_date: document.getElementById('release_date').value || null,
      spotify_url: document.getElementById('spotify_url').value.trim(),
      apple_music_url: document.getElementById('apple_music_url').value.trim(),
      audiomack_url: document.getElementById('audiomack_url').value.trim(),
      onerpm_url: document.getElementById('onerpm_url').value.trim(),
      description: document.getElementById('description').value.trim(),
      featured: document.getElementById('featured').checked,
    };

    const file = artInput.files && artInput.files[0];
    const editSlug = document.getElementById('edit-slug').value;

    try {
      if (editSlug) {
        await EseXOAdminApi.updateRelease(editSlug, payload, file || null);
        EseXOAuth.toast('Release updated', 'success');
      } else {
        await EseXOAdminApi.createRelease(payload, file || null);
        EseXOAuth.toast('Release created', 'success');
      }
      closeModal();
      await load();
    } catch (err) {
      EseXOAuth.toast(err.message || 'Save failed', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Release';
    }
  });

  await load();
})();
