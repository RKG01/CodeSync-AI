import toast from 'react-hot-toast';

let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

if (!BASE_URL.endsWith('/api')) {
  BASE_URL += '/api';
}

function getToken() {
  return localStorage.getItem('synapse_token');
}

function buildHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('synapse_token');
    localStorage.removeItem('synapse_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message = typeof data === 'object' ? data.message || data.error || 'Request failed' : data || 'Request failed';
    throw new Error(message);
  }

  return data;
}

async function request(method, endpoint, body = null, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: buildHeaders(options.headers),
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, config);
    return await handleResponse(res);
  } catch (err) {
    if (!options.silent) {
      toast.error(err.message || 'Network error');
    }
    throw err;
  }
}

const api = {
  get: (endpoint, options) => request('GET', endpoint, null, options),
  post: (endpoint, body, options) => request('POST', endpoint, body, options),
  put: (endpoint, body, options) => request('PUT', endpoint, body, options),
  patch: (endpoint, body, options) => request('PATCH', endpoint, body, options),
  delete: (endpoint, options) => request('DELETE', endpoint, null, options),
};

export default api;
