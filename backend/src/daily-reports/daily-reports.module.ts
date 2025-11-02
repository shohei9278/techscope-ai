import { Module } from '@nestjs/common';
import { DailyReportsService } from './daily-reports.service';
import { DailyReportsController } from './daily-reports.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { OpenAIModule } from '../openai/openai.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  controllers: [DailyReportsController],
  providers: [DailyReportsService],
  imports: [SupabaseModule, OpenAIModule, RecommendationsModule],
})
export class DailyReportsModule {}
