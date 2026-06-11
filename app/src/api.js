import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

let token = null;
let onUnauthorized = null;
export function setOnUnauthorized(fn) { onUnauthorized = fn; }

export async function loadToken() {
  token = await AsyncStorage.getItem('token');
  return token;
}

export async function setToken(next) {
  token = next;
  if (next) await AsyncStorage.setItem('token', next);
  else await AsyncStorage.removeItem('token');
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && onUnauthorized) {
    await setToken(null);
    onUnauthorized();
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
