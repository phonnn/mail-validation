import { Module } from '@nestjs/common';
import { AppConfigModule } from '@mail-validation/config';
import { PostgresDatabaseProviderModule } from '@mail-validation/providers/databases';

@Module({
  imports: [
    AppConfigModule,
    PostgresDatabaseProviderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
