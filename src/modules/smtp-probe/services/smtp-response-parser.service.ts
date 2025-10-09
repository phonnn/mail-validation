import { Injectable } from '@nestjs/common';
import { SmtpResponse, SmtpResponseCategory } from '@mail-validation/modules/smtp-probe/types';
import { SmtpResponseCode } from '@mail-validation/modules/smtp-probe/enums';

@Injectable()
export class SmtpResponseParserService {

  /**
   * Parse SMTP response string into structured response
   */
  parseResponse(responseString: string): SmtpResponse {
    const lines = responseString.trim().split('\r\n');
    const lastLine = lines[lines.length - 1];
    
    // Extract response code and message
    const match = lastLine.match(/^(\d{3})(?:\s+(.*))?$/);
    if (!match) {
      throw new Error(`Invalid SMTP response format: ${responseString}`);
    }
    
    const code = parseInt(match[1], 10);
    const message = match[2] || '';
    
    return {
      code,
      message,
      category: this.categorizeResponse(code),
      isSuccess: this.isSuccessCode(code),
      isTemporaryFailure: this.isTemporaryFailureCode(code),
      isPermanentFailure: this.isPermanentFailureCode(code),
    };
  }

  /**
   * Categorize response code
   */
  private categorizeResponse(code: number): SmtpResponseCategory {
    if (code >= 200 && code < 300) {
      return SmtpResponseCategory.SUCCESS;
    } else if (code >= 400 && code < 500) {
      return SmtpResponseCategory.TEMPORARY_FAILURE;
    } else if (code >= 500 && code < 600) {
      return SmtpResponseCategory.PERMANENT_FAILURE;
    } else {
      return SmtpResponseCategory.UNKNOWN;
    }
  }

  /**
   * Check if response code indicates success
   */
  private isSuccessCode(code: number): boolean {
    return code >= 200 && code < 300;
  }

  /**
   * Check if response code indicates temporary failure
   */
  private isTemporaryFailureCode(code: number): boolean {
    return code >= 400 && code < 500;
  }

  /**
   * Check if response code indicates permanent failure
   */
  private isPermanentFailureCode(code: number): boolean {
    return code >= 500 && code < 600;
  }

  /**
   * Check if response indicates email is deliverable
   */
  isDeliverable(response: SmtpResponse): boolean {
    return response.isSuccess && response.code === SmtpResponseCode.OK;
  }

  /**
   * Check if response indicates email is undeliverable
   */
  isUndeliverable(response: SmtpResponse): boolean {
    return response.isPermanentFailure;
  }

  /**
   * Check if response indicates temporary issue (greylisting, etc.)
   */
  isTemporaryIssue(response: SmtpResponse): boolean {
    return response.isTemporaryFailure;
  }

  /**
   * Get human-readable description of response
   */
  getResponseDescription(response: SmtpResponse): string {
    switch (response.code) {
      case SmtpResponseCode.OK:
        return 'Email accepted';
      case SmtpResponseCode.MAILBOX_UNAVAILABLE:
        return 'Mailbox temporarily unavailable';
      case SmtpResponseCode.MAILBOX_UNAVAILABLE_PERM:
        return 'Mailbox does not exist';
      case SmtpResponseCode.USER_NOT_LOCAL:
        return 'User not local to this server';
      case SmtpResponseCode.EXCEEDED_STORAGE:
        return 'Mailbox storage exceeded';
      case SmtpResponseCode.MAILBOX_NAME_NOT_ALLOWED:
        return 'Mailbox name not allowed';
      case SmtpResponseCode.SERVICE_UNAVAILABLE:
        return 'Service temporarily unavailable';
      case SmtpResponseCode.LOCAL_ERROR:
        return 'Local error in processing';
      case SmtpResponseCode.INSUFFICIENT_STORAGE:
        return 'Insufficient system storage';
      default:
        return response.message || 'Unknown response';
    }
  }
}

