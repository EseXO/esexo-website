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
  const form = document.getElementById('news-form');

  function openM() { modal.classList.add('open');
    document.body.classList.add('modal-open'); }
  function closeM() { modal.classList.remove('open');
    document.body.classList.remove('modal-open'); }
  function openD() { deleteModal.classList.add('open');
    document.body.classList.add('modal-open'); }
  function closeD() { deleteModal.classList.remove('open');
    document.body.classList.remove('modal-open'); deleteSlug = null; }

  function render() {
    if (!items.length) {
      listEl.innerHTML = '<div class="empty-state">No news items.</div>';
      return;
    }
    listEl.innerHTML =
      '<table class="data-table"><thead><tr><th>Title</th><th>Featured</th><th>Published</th><th>Order</th><th></th></tr></thead><tbody>' +
      items.map(function (n) {
        return '<tr><td><strong>' + n.title + '</strong><div style="font-size:0.8rem;color:var(--text-muted)">' +
          (n.short_description || '') + '</div></td><td>' + (n.featured ? '★' : '—') +
          '</td><td>' + (n.published ? 'Yes' : 'No') + '</td><td>' + n.display_order +
          '</td><td style="white-space:nowrap"><button type="button" class="btn btn-ghost btn-sm" data-edit="' + n.slug +
          '">Edit</button> <button type="button" class="btn btn-danger btn-sm" data-del="' + n.slug +
          '" data-title="' + n.title.replace(/"/g, '&quot;') + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  async function load() {
    try {
      items = await EseXOAdminApi.getNews();
      render();
    } catch (err) {
      listEl.innerHTML = '<div class="empty-state">' + err.message + '</div>';
    }
  }

  function reset() {
    form.reset();
    document.getElementById('edit-slug').value = '';
    document.getElementById('published').checked = true;
    document.getElementById('modal-title').textContent = 'Add News';
  }

  function fill(n) {
    document.getElementById('edit-slug').value = n.slug;
    document.getElementById('title').value = n.title || '';
    document.getElementById('slug').value = n.slug || '';
    document.getElementById('short_description').value = n.short_description || '';
    document.getElementById('full_description').value = n.full_description || '';
    document.getElementById('button_text').value = n.button_text || '';
    document.getElementById('button_url').value = n.button_url || '';
    document.getElementById('display_order').value = n.display_order || 0;
    document.getElementById('featured').checked = !!n.featured;
    document.getElementById('published').checked = !!n.published;
    document.getElementById('modal-title').textContent = 'Edit News';
  }

  document.getElementById('btn-add').onclick = function () { reset(); openM(); };
  document.getElementById('modal-close').onclick = closeM;
  document.getElementById('modal-cancel').onclick = closeM;
  document.getElementById('delete-cancel').onclick = closeD;

  listEl.addEventListener('click', function (e) {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) {
      const n = items.find(function (x) { return x.slug === ed.getAttribute('data-edit'); });
      if (n) { fill(n); openM(); }
    }
    if (del) {
      deleteSlug = del.getAttribute('data-del');
      document.getElementById('delete-msg').textContent =
        'Delete “' + del.getAttribute('data-title') + '”?';
      openD();
    }
  });

  document.getElementById('delete-confirm').onclick = async function () {
    if (!deleteSlug) return;
    try {
      await EseXOAdminApi.deleteNews(deleteSlug);
      EseXOAuth.toast('News deleted', 'success');
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
      slug: document.getElementById('slug').value.trim() || undefined,
      short_description: document.getElementById('short_description').value.trim(),
      full_description: document.getElementById('full_description').value.trim(),
      button_text: document.getElementById('button_text').value.trim(),
      button_url: document.getElementById('button_url').value.trim(),
      display_order: parseInt(document.getElementById('display_order').value, 10) || 0,
      featured: document.getElementById('featured').checked,
      published: document.getElementById('published').checked,
    };
    const file = document.getElementById('image').files[0] || null;
    const editSlug = document.getElementById('edit-slug').value;
    try {
      if (editSlug) {
        await EseXOAdminApi.updateNews(editSlug, payload, file);
        EseXOAuth.toast('News updated', 'success');
      } else {
        await EseXOAdminApi.createNews(payload, file);
        EseXOAuth.toast('News created', 'success');
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
