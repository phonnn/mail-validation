/**
 * SMTP connection configuration
 */
export interface SmtpConnectionConfig {
  host: string;
  port: number;
  timeout: number;
  useTls: boolean;
}

