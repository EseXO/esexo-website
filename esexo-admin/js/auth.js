/**
 * EseXO Admin — auth guard & helpers
 */
(function () {
  'use strict';

  const THEME_KEY = 'esexo_admin_theme';

  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) { /* ignore */ }
  }

  function initTheme() {
    let t = 'dark';
    try {
      t = localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) { /* ignore */ }
    applyTheme(t);
  }

  function toast(message, type) {
    let box = document.querySelector('.toast-container');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toast-container';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  async function requireAuth() {
    initTheme();
    const api = window.EseXOAdminApi;
    if (!api || !api.getToken()) {
      window.location.href = 'login.html';
      return null;
    }
    try {
      const user = await api.me();
      return user;
    } catch (e) {
      api.setToken('');
      window.location.href = 'login.html';
      return null;
    }
  }

  function closeDrawer() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.classList.remove('drawer-open');
  }

  function openDrawer() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
    document.body.classList.add('drawer-open');
  }

  function bindShell(user) {
    const nameEl = document.getElementById('admin-username');
    if (nameEl && user) nameEl.textContent = user.username;

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      closeDrawer();
      await window.EseXOAdminApi.logout();
      window.location.href = 'login.html';
    });

    const themeBtn = document.getElementById('theme-toggle');
    themeBtn?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });

    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const closeBtn = document.getElementById('sidebar-close');

    menuBtn?.addEventListener('click', () => {
      if (sidebar?.classList.contains('open')) closeDrawer();
      else openDrawer();
    });
    overlay?.addEventListener('click', closeDrawer);
    closeBtn?.addEventListener('click', closeDrawer);

    // Close drawer when navigating; highlight active
    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-link[data-page]').forEach((link) => {
      if (link.getAttribute('data-page') === path) {
        link.classList.add('active');
      }
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    // Escape closes drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  function sidebarHTML() {
    return `
      <button type="button" class="sidebar-close" id="sidebar-close" aria-label="Close menu">✕</button>
      <div class="sidebar-logo">Ese<span>XO</span> Admin</div>
      <a href="dashboard.html" class="nav-link" data-page="dashboard.html">Dashboard</a>
      <div class="nav-section">Content</div>
      <a href="releases.html" class="nav-link" data-page="releases.html">Releases</a>
      <a href="news.html" class="nav-link" data-page="news.html">News</a>
      <a href="videos.html" class="nav-link" data-page="videos.html">Videos</a>
      <a href="gallery.html" class="nav-link" data-page="gallery.html">Gallery</a>
      <div class="nav-section">Settings</div>
      <a href="settings.html" class="nav-link" data-page="settings.html">Site Settings</a>
      <div style="flex:1"></div>
      <div class="nav-section">Account</div>
      <a href="#" class="nav-link" id="logout-btn">Logout</a>
    `;
  }

  window.EseXOAuth = {
    requireAuth,
    bindShell,
    toast,
    initTheme,
    applyTheme,
    sidebarHTML,
  };
})();
