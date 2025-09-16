import { HttpStatus } from '@nestjs/common';
import { ErrorCodeEnum } from '@thu-gioi/common/errors/error-code.enum';
import { AppException } from '@thu-gioi/common/errors/exceptions/app.exception';

export class ChapterNotFoundException extends AppException {
  constructor(message = 'Chapter not found!') {
    super(message, HttpStatus.NOT_FOUND, ErrorCodeEnum.ChapterNotFound);
  }
}

export class StoryNotFoundException extends AppException {
  constructor(message = 'Story not found!') {
    super(message, HttpStatus.NOT_FOUND, ErrorCodeEnum.StoryNotFound);
  }
}
