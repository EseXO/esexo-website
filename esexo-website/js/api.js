/**
 * EseXO API client
 * Talks to the Django backend when available; frontend keeps working offline.
 *
 * Change API_BASE to your backend URL in production.
 */
(function (global) {
  'use strict';

  const API_BASE = (global.ESEX_API_BASE || 'https://esexo-backend.onrender.com/api').replace(/\/$/, '');

  async function getJson(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${path}`);
    }
    return res.json();
  }

  function unwrapList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  const EseXOApi = {
    base: API_BASE,

    async releases(params) {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return unwrapList(await getJson(`/releases/${q}`));
    },

    async release(slug) {
      return getJson(`/releases/${encodeURIComponent(slug)}/`);
    },

    async news(params) {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return unwrapList(await getJson(`/news/${q}`));
    },

    async videos() {
      return unwrapList(await getJson('/videos/'));
    },

    async gallery() {
      return unwrapList(await getJson('/gallery/'));
    },

    async galleryGroups() {
      return unwrapList(await getJson('/gallery-groups/'));
    },

    async siteSettings() {
      return getJson('/site-settings/');
    },
  };

  global.EseXOApi = EseXOApi;
})(typeof window !== 'undefined' ? window : this);
