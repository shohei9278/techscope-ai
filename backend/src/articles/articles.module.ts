import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { OpenAIModule } from '../openai/openai.module';
import { FetchArticlesService } from './fetch.service';

@Module({
  imports: [SupabaseModule, OpenAIModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, FetchArticlesService],
})
export class ArticlesModule {}
