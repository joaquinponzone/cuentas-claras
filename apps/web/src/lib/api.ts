export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const errorData = await response.json()
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error
      } else if (errorData.error?.issues?.length) {
        errorMessage = errorData.error.issues.map((i: { message: string }) => i.message).join(', ')
      } else if (typeof errorData.message === 'string') {
        errorMessage = errorData.message
      }
    } catch {
      // use default message
    }

    throw new ApiError(errorMessage, response.status, response)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)
  return handleResponse<T>(response)
}

export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}
