import { SetMetadata } from '@nestjs/common';

export const CUSTOM_REPOSITORY = 'TYPEORM_CUSTOM_REPOSITORY';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function CustomRepository(entity: Function): ClassDecorator {
  return SetMetadata(CUSTOM_REPOSITORY, entity);
}
