// Every call to the Express backend goes through here, and errors become friendly messages.
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check that it is running.");
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    // fall through to the generic message below
  }
  if (!res.ok) throw new ApiError(json?.message || 'Something went wrong. Please try again.');
  return json;
}

export const api = {
  getPlan: () => request('GET', '/plan'),
  saveSetup: (setup) => request('PUT', '/setup', setup),
  generatePlan: () => request('POST', '/plan/generate'),
  updateSession: (id, update) => request('PATCH', `/sessions/${id}`, update),
  advanceDay: () => request('POST', '/demo/advance-day'),
  startOver: () => request('DELETE', '/plan'),
};
