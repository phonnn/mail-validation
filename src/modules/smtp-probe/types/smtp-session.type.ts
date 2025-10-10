export interface SmtpResponse {
  code: string;
  message: string;
  multiline: boolean;
}

export interface RcptResult {
  email: string;
  responseCode: string;
  responseMessage: string;
  responseTime: number;
}

export interface SmtpSessionStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageResponseTime: number;
}

