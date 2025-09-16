import { HttpStatus } from '@nestjs/common';
import { ErrorCodeEnum } from '@thu-gioi/common/errors/error-code.enum';
import { AppException } from '@thu-gioi/common/errors/exceptions/app.exception';

export class AccessDeniedException extends AppException {
  constructor(message = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN, ErrorCodeEnum.AccessDenied);
  }
}

export class NotAuthorException extends AppException {
  constructor(message = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN, ErrorCodeEnum.AccessDenied);
  }
}
