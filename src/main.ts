import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import process from 'process';
import { ValidationPipe } from '@nestjs/common';
import { AppExceptionFilter } from '@thu-gioi/common/errors/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new AppExceptionFilter());

  await app.listen(
    process.env.APP_PORT ?? 3000,
    process.env.APP_HOST ?? 'localhost',
  );

  console.log(`${process.env.APP_NAME} is running on: ${await app.getUrl()}`);
}
bootstrap();
