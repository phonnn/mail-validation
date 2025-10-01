import { HttpStatus } from '@nestjs/common';
import { AppException } from '@mail-validation/common/errors/exceptions/app.exception';
import { ErrorCodeEnum } from '@mail-validation/common/errors/error-code.enum';


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
