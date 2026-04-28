// Helper function for making API calls with optional auth token
export async function makeApiCall(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for requests that have a body
  if (options.body || (options.method && options.method !== 'GET' && options.method !== 'DELETE')) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// Parse API response and throw on error
export async function parseApiResponse<T = unknown>(
  response: Response,
  operation: string
): Promise<{ data: T }> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to ${operation}: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return { data: data as T };
}
