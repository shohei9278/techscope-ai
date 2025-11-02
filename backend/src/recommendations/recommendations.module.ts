import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService, SupabaseService],
  exports: [RecommendationsService],
  imports: [OpenAIModule],
})
export class RecommendationsModule {}
