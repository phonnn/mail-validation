import { HttpStatus } from '@nestjs/common';
import { AppException } from '@mail-validation/common/errors/exceptions/app.exception';
import { ErrorCodeEnum } from '@mail-validation/common/errors/error-code.enum';

export class EntityNotFoundException extends AppException {
  constructor(message = 'Entity not found!') {
    super(message, HttpStatus.NOT_FOUND, ErrorCodeEnum.EntityNotFound);
  }
}
