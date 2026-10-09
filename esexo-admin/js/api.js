/**
 * EseXO Admin — centralized API client
 */
(function (global) {
  'use strict';

  const API_BASE = (global.ESEX_API_BASE || 'https://esexo-backend.onrender.com/api').replace(/\/$/, '');

  const TOKEN_KEY = 'esexo_admin_token';

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  async function request(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    const token = getToken();
    if (token) headers['Authorization'] = 'Token ' + token;

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));

    if (res.status === 401 || res.status === 403) {
      if (!path.includes('/auth/login')) {
        setToken('');
        if (!window.location.pathname.endsWith('login.html')) {
          window.location.href = 'login.html';
        }
      }
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { detail: text };
      }
    }

    if (!res.ok) {
      const msg =
        (data && (data.detail || data.error)) ||
        (data && typeof data === 'object' && Object.values(data).flat().join(' ')) ||
        'Request failed (' + res.status + ')';
      const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function unwrap(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return data;
  }

  function toFormData(obj, fileFields) {
    const fd = new FormData();
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (val === undefined || val === null) return;
      if (fileFields && fileFields.includes(key)) {
        if (val instanceof File || val instanceof Blob) fd.append(key, val);
        return;
      }
      if (typeof val === 'boolean') {
        fd.append(key, val ? 'true' : 'false');
        return;
      }
      // JSONField / nested objects must be stringified for multipart
      if (typeof val === 'object' && !(val instanceof File) && !(val instanceof Blob)) {
        fd.append(key, JSON.stringify(val));
        return;
      }
      fd.append(key, val);
    });
    return fd;
  }

  const Api = {
    base: API_BASE,
    getToken,
    setToken,

    // Auth
    async login(username, password) {
      const data = await request('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data.token) setToken(data.token);
      return data;
    },

    async logout() {
      try {
        await request('/auth/logout/', { method: 'POST', body: '{}' });
      } catch (e) { /* ignore */ }
      setToken('');
    },

    async me() {
      return request('/auth/me/');
    },

    // Releases
    async getReleases(params) {
      const q = params ? '?' + new URLSearchParams(params) : '';
      return unwrap(await request('/releases/' + q));
    },
    async getRelease(slug) {
      return request('/releases/' + encodeURIComponent(slug) + '/');
    },
    async createRelease(payload, file) {
      const body = file
        ? toFormData(Object.assign({}, payload, { artwork: file }), ['artwork'])
        : JSON.stringify(payload);
      return request('/releases/', { method: 'POST', body });
    },
    async updateRelease(slug, payload, file) {
      const data = Object.assign({}, payload);
      const body = file
        ? toFormData(Object.assign({}, data, { artwork: file }), ['artwork'])
        : JSON.stringify(data);
      return request('/releases/' + encodeURIComponent(slug) + '/', {
        method: 'PATCH',
        body,
      });
    },
    async deleteRelease(slug) {
      return request('/releases/' + encodeURIComponent(slug) + '/', { method: 'DELETE' });
    },

    // News
    async getNews(params) {
      const q = params ? '?' + new URLSearchParams(params) : '';
      return unwrap(await request('/news/' + q));
    },
    async createNews(payload, file) {
      const body = file
        ? toFormData(Object.assign({}, payload, { image: file }), ['image'])
        : JSON.stringify(payload);
      return request('/news/', { method: 'POST', body });
    },
    async updateNews(slug, payload, file) {
      const body = file
        ? toFormData(Object.assign({}, payload, { image: file }), ['image'])
        : JSON.stringify(payload);
      return request('/news/' + encodeURIComponent(slug) + '/', { method: 'PATCH', body });
    },
    async deleteNews(slug) {
      return request('/news/' + encodeURIComponent(slug) + '/', { method: 'DELETE' });
    },

    // Videos
    async getVideos(params) {
      const q = params ? '?' + new URLSearchParams(params) : '';
      return unwrap(await request('/videos/' + q));
    },
    async createVideo(payload, file) {
      const body = file
        ? toFormData(Object.assign({}, payload, { thumbnail: file }), ['thumbnail'])
        : JSON.stringify(payload);
      return request('/videos/', { method: 'POST', body });
    },
    async updateVideo(id, payload, file) {
      const body = file
        ? toFormData(Object.assign({}, payload, { thumbnail: file }), ['thumbnail'])
        : JSON.stringify(payload);
      return request('/videos/' + id + '/', { method: 'PATCH', body });
    },
    async deleteVideo(id) {
      return request('/videos/' + id + '/', { method: 'DELETE' });
    },

    // Gallery
    async getGallery(params) {
      const q = params ? '?' + new URLSearchParams(params) : '';
      return unwrap(await request('/gallery/' + q));
    },
    async createGalleryImage(payload, file) {
      const body = toFormData(Object.assign({}, payload, { image: file }), ['image']);
      return request('/gallery/', { method: 'POST', body });
    },
    async updateGalleryImage(id, payload, file) {
      const data = Object.assign({}, payload);
      const body = file
        ? toFormData(Object.assign({}, data, { image: file }), ['image'])
        : JSON.stringify(data);
      return request('/gallery/' + id + '/', { method: 'PATCH', body });
    },
    async deleteGalleryImage(id) {
      return request('/gallery/' + id + '/', { method: 'DELETE' });
    },

    // Settings
    async getSiteSettings() {
      return request('/site-settings/');
    },
    async updateSiteSettings(payload, files) {
      files = files || {};
      const hasFile = files.profile_image || files.logo;
      if (hasFile) {
        const body = toFormData(
          Object.assign({}, payload, files),
          ['profile_image', 'logo']
        );
        return request('/site-settings/', { method: 'PATCH', body });
      }
      return request('/site-settings/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
  };

  global.EseXOAdminApi = Api;
})(typeof window !== 'undefined' ? window : this);

/* Extended after load — gallery groups helpers attached to existing Api */
(function () {
  if (!window.EseXOAdminApi) return;
  const Api = window.EseXOAdminApi;
  const request = async function (path, options) {
    // reuse internal via fetch pattern from Api - call methods that exist
    // We patch by duplicating minimal request using same token
    const API_BASE = Api.base;
    const headers = Object.assign({}, (options && options.headers) || {});
    const token = Api.getToken();
    if (token) headers['Authorization'] = 'Token ' + token;
    if (!(options && options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    const res = await fetch(API_BASE + path, Object.assign({}, options || {}, { headers }));
    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = { detail: text }; }
    }
    if (!res.ok) {
      const msg = (data && (data.detail || data.error)) || ('Request failed ' + res.status);
      const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  };
  function unwrap(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return data;
  }

  Api.getGalleryGroups = async function (params) {
    const q = params ? '?' + new URLSearchParams(params) : '';
    return unwrap(await request('/gallery-groups/' + q));
  };
  Api.getGalleryGroup = async function (slug) {
    return request('/gallery-groups/' + encodeURIComponent(slug) + '/');
  };
  Api.createGalleryGroup = async function (payload) {
    return request('/gallery-groups/', { method: 'POST', body: JSON.stringify(payload) });
  };
  Api.updateGalleryGroup = async function (slug, payload) {
    return request('/gallery-groups/' + encodeURIComponent(slug) + '/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  };
  Api.deleteGalleryGroup = async function (slug) {
    return request('/gallery-groups/' + encodeURIComponent(slug) + '/', { method: 'DELETE' });
  };
  Api.bulkUpdateGallery = async function (ids, fields) {
    const results = [];
    for (const id of ids) {
      results.push(await request('/gallery/' + id + '/', {
        method: 'PATCH',
        body: JSON.stringify(fields),
      }));
    }
    return results;
  };
  Api.bulkDeleteGallery = async function (ids) {
    for (const id of ids) {
      await request('/gallery/' + id + '/', { method: 'DELETE' });
    }
  };
  Api.reorderGallery = async function (orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      await request('/gallery/' + orderedIds[i] + '/', {
        method: 'PATCH',
        body: JSON.stringify({ display_order: i }),
      });
    }
  };
  Api.uploadGalleryImageXHR = function (payload, file, onProgress) {
    return new Promise(function (resolve, reject) {
      const fd = new FormData();
      Object.keys(payload || {}).forEach(function (k) {
        const v = payload[k];
        if (v === undefined || v === null) return;
        if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
        else if (typeof v === 'object') fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      if (file) fd.append('image', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', Api.base + '/gallery/');
      const token = Api.getToken();
      if (token) xhr.setRequestHeader('Authorization', 'Token ' + token);
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = function () {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = { detail: xhr.responseText }; }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error((data && data.detail) || 'Upload failed'));
      };
      xhr.onerror = function () { reject(new Error('Network error')); };
      xhr.send(fd);
    });
  };
})();
