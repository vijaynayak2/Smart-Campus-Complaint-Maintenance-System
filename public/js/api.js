/**
 * AJIET CampusFix REST API Client
 */
const API = (function() {
  const BASE_URL = '';

  function getHeaders(isJson = true) {
    const headers = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('campusfix_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async function handleResponse(response) {
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      // If unauthorized, redirect to login if not already on login page
      if (response.status === 401) {
        localStorage.removeItem('campusfix_token');
        localStorage.removeItem('campusfix_user');
        if (!window.location.pathname.includes('login') && !window.location.pathname.endsWith('/')) {
          window.location.href = '/login?session=expired';
        }
      }
      const error = new Error(data.message || 'Something went wrong');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  return {
    get: async function(endpoint) {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(true)
      });
      return handleResponse(response);
    },

    post: async function(endpoint, body) {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(body)
      });
      return handleResponse(response);
    },

    postMultipart: async function(endpoint, formData) {
      const headers = getHeaders(false); // Browser sets Content-Type with boundary automatically
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      });
      return handleResponse(response);
    },

    put: async function(endpoint, body) {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(body)
      });
      return handleResponse(response);
    },

    delete: async function(endpoint) {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(true)
      });
      return handleResponse(response);
    }
  };
})();
