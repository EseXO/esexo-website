(async function () {
  'use strict';
  document.getElementById('sidebar').innerHTML = EseXOAuth.sidebarHTML();
  const user = await EseXOAuth.requireAuth();
  if (!user) return;
  EseXOAuth.bindShell(user);

  let items = [];
  let deleteId = null;
  const listEl = document.getElementById('list');
  const modal = document.getElementById('modal');
  const deleteModal = document.getElementById('delete-modal');
  const form = document.getElementById('video-form');

  function openM() { modal.classList.add('open');
    document.body.classList.add('modal-open'); }
  function closeM() { modal.classList.remove('open');
    document.body.classList.remove('modal-open'); }
  function openD() { deleteModal.classList.add('open');
    document.body.classList.add('modal-open'); }
  function closeD() { deleteModal.classList.remove('open');
    document.body.classList.remove('modal-open'); deleteId = null; }

  function render() {
    if (!items.length) {
      listEl.innerHTML = '<div class="empty-state">No videos.</div>';
      return;
    }
    listEl.innerHTML =
      '<table class="data-table"><thead><tr><th>Title</th><th>Type</th><th>Published</th><th></th></tr></thead><tbody>' +
      items.map(function (v) {
        return '<tr><td><strong>' + v.title + '</strong></td><td>' + v.video_type +
          '</td><td>' + (v.published ? 'Yes' : 'No') +
          '</td><td><button type="button" class="btn btn-ghost btn-sm" data-edit="' + v.id +
          '">Edit</button> <button type="button" class="btn btn-danger btn-sm" data-del="' + v.id +
          '" data-title="' + v.title.replace(/"/g, '&quot;') + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  async function load() {
    try {
      items = await EseXOAdminApi.getVideos();
      render();
    } catch (err) {
      listEl.innerHTML = '<div class="empty-state">' + err.message + '</div>';
    }
  }

  function reset() {
    form.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('published').checked = true;
    document.getElementById('modal-title').textContent = 'Add Video';
  }

  function fill(v) {
    document.getElementById('edit-id').value = v.id;
    document.getElementById('title').value = v.title || '';
    document.getElementById('description').value = v.description || '';
    document.getElementById('video_url').value = v.video_url || '';
    document.getElementById('video_type').value = v.video_type || 'YOUTUBE';
    document.getElementById('display_order').value = v.display_order || 0;
    document.getElementById('featured').checked = !!v.featured;
    document.getElementById('published').checked = !!v.published;
    document.getElementById('modal-title').textContent = 'Edit Video';
  }

  document.getElementById('btn-add').onclick = function () { reset(); openM(); };
  document.getElementById('modal-close').onclick = closeM;
  document.getElementById('modal-cancel').onclick = closeM;
  document.getElementById('delete-cancel').onclick = closeD;

  listEl.addEventListener('click', function (e) {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) {
      const v = items.find(function (x) { return String(x.id) === ed.getAttribute('data-edit'); });
      if (v) { fill(v); openM(); }
    }
    if (del) {
      deleteId = del.getAttribute('data-del');
      document.getElementById('delete-msg').textContent =
        'Delete “' + del.getAttribute('data-title') + '”?';
      openD();
    }
  });

  document.getElementById('delete-confirm').onclick = async function () {
    if (!deleteId) return;
    try {
      await EseXOAdminApi.deleteVideo(deleteId);
      EseXOAuth.toast('Video deleted', 'success');
      closeD();
      await load();
    } catch (err) {
      EseXOAuth.toast(err.message, 'error');
    }
  };

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    const payload = {
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      video_url: document.getElementById('video_url').value.trim(),
      video_type: document.getElementById('video_type').value,
      display_order: parseInt(document.getElementById('display_order').value, 10) || 0,
      featured: document.getElementById('featured').checked,
      published: document.getElementById('published').checked,
    };
    const file = document.getElementById('thumbnail').files[0] || null;
    const editId = document.getElementById('edit-id').value;
    try {
      if (editId) {
        await EseXOAdminApi.updateVideo(editId, payload, file);
        EseXOAuth.toast('Video updated', 'success');
      } else {
        await EseXOAdminApi.createVideo(payload, file);
        EseXOAuth.toast('Video created', 'success');
      }
      closeM();
      await load();
    } catch (err) {
      EseXOAuth.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  await load();
})();
