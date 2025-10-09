/**
 * Email data for batch processing
 */
export interface EmailData {
  email: string;
  clientId?: string;
}

/**
 * Email data with request ID for batch processing
 */
export interface EmailDataWithRequestId extends EmailData {
  requestId: string;
}

