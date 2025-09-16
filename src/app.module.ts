import { Module } from '@nestjs/common';
import { AppConfigModule } from '@thu-gioi/config';
import { PostgresDatabaseProviderModule } from '@thu-gioi/providers/databases';
import { UserModule } from '@thu-gioi/modules/user/user.module';
import { AuthModule } from '@thu-gioi/modules/auth/auth.module';
import { StoryModule } from '@thu-gioi/modules/story/story.module';
import { ChapterModule } from '@thu-gioi/modules/chapter/chapter.module';

@Module({
  imports: [
    AppConfigModule,
    PostgresDatabaseProviderModule,
    UserModule,
    AuthModule,
    StoryModule,
    ChapterModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
