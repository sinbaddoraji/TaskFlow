
/**
 * Validates an API response and extracts the data if successful
 * @param response - The API response to validate
 * @param errorMessage - Custom error message if validation fails
 * @returns The extracted data if successful
 * @throws Error if the response indicates failure
 */
export function validateApiResponse<T>(
  response: { data: { success: boolean; data?: T | null; message?: string } }, 
  errorMessage?: string
): T {
  if (response.data.success && response.data.data !== undefined && response.data.data !== null) {
    return response.data.data;
  }
  
  const message = errorMessage || response.data.message || 'API request failed';
  throw new Error(message);
}

/**
 * Validates an API response for boolean operations (like delete)
 * @param response - The API response to validate
 * @param errorMessage - Custom error message if validation fails
 * @returns True if successful, throws error if not
 */
export function validateApiBooleanResponse(
  response: { data: { success: boolean; data?: boolean | null; message?: string } }, 
  errorMessage?: string
): boolean {
  if (response.data.success) {
    return response.data.data ?? true;
  }
  
  const message = errorMessage || response.data.message || 'API request failed';
  throw new Error(message);
}

/**
 * Logs API request/response for debugging purposes
 * @param method - HTTP method
 * @param url - Request URL
 * @param requestData - Request payload (optional)
 * @param response - API response
 * @param error - Error if request failed (optional)
 */
export function logApiCall<T>(
  method: string,
  url: string,
  requestData?: unknown,
  response?: { data: { success: boolean; data?: T | null; message?: string } },
  error?: unknown
): void {
  const timestamp = new Date().toISOString();
  
  if (error) {
    console.error(`🚨 API Error [${timestamp}] ${method} ${url}:`, {
      requestData,
      error,
    });
  } else if (response) {
    const logLevel = response.data.success ? 'log' : 'warn';
    const emoji = response.data.success ? '✅' : '⚠️';
    
    console[logLevel](`${emoji} API Call [${timestamp}] ${method} ${url}:`, {
      success: response.data.success,
      message: response.data.message,
      dataType: Array.isArray(response.data.data) ? 'array' : typeof response.data.data,
      dataLength: Array.isArray(response.data.data) ? response.data.data.length : undefined,
      requestData: method !== 'GET' ? requestData : undefined,
    });
  }
}

/**
 * Creates a standardized error object for API failures
 * @param message - Error message
 * @param response - Original API response (optional)
 * @param requestContext - Additional context about the request
 * @returns Error object with additional metadata
 */
export function createApiError<T>(
  message: string,
  response?: { data: { success: boolean; data?: T | null; message?: string } },
  requestContext?: { method: string; url: string; data?: unknown }
): Error & { apiResponse?: { success: boolean; data?: T | null; message?: string }; requestContext?: unknown } {
  const error = new Error(message) as Error & { 
    apiResponse?: { success: boolean; data?: T | null; message?: string }; 
    requestContext?: unknown 
  };
  
  if (response) {
    error.apiResponse = response.data;
  }
  
  if (requestContext) {
    error.requestContext = requestContext;
  }
  
  return error;
}