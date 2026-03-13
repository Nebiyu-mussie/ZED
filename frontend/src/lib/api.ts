export type ApiError = { error: string };

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw data || { error: 'Request failed' };
  }
  return data;
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(value);

export const formatShortDate = (value: string | number | Date) =>
  new Date(value).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: 'numeric' });

