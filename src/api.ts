import type { ApiError } from './types';
export class RequestError extends Error {
  constructor(public detail: ApiError, public activityId?: string) { super(detail.message); }
}
export async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      credentials: 'same-origin', cache: 'no-store',
      ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new RequestError({ message: 'The app server is unavailable. For a rewrite, check Activity before trying again.', code: 'network_unavailable', status: 0 });
  }
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error, data.activityId);
  return data;
}
