/**
 * SMTP connection state
 */
export interface SmtpConnectionState {
  connected: boolean;
  authenticated: boolean;
  currentHost?: string;
  currentPort?: number;
  lastActivity: Date;
}
