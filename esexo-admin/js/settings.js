(async function () {
  'use strict';
  document.getElementById('sidebar').innerHTML = EseXOAuth.sidebarHTML();
  const user = await EseXOAuth.requireAuth();
  if (!user) return;
  EseXOAuth.bindShell(user);

  const form = document.getElementById('settings-form');
  const fields = [
    'artist_name', 'artist_bio', 'spotify_artist_url', 'instagram_url',
    'tiktok_url', 'youtube_url', 'x_twitter_url', 'audiomack_url', 'contact_email',
  ];

  try {
    const data = await EseXOAdminApi.getSiteSettings();
    fields.forEach(function (f) {
      const el = document.getElementById(f);
      if (el && data[f] != null) el.value = data[f];
    });
  } catch (err) {
    EseXOAuth.toast(err.message, 'error');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {};
    fields.forEach(function (f) {
      payload[f] = document.getElementById(f).value.trim();
    });

    const files = {};
    const profile = document.getElementById('profile_image').files[0];
    const logo = document.getElementById('logo').files[0];
    if (profile) files.profile_image = profile;
    if (logo) files.logo = logo;

    try {
      await EseXOAdminApi.updateSiteSettings(payload, files);
      EseXOAuth.toast('Settings saved', 'success');
    } catch (err) {
      EseXOAuth.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save settings';
    }
  });
})();
