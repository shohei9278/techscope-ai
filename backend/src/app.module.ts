import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArticlesModule } from './articles/articles.module';
import { SupabaseModule } from './supabase/supabase.module';
import { OpenAIModule } from './openai/openai.module';
import { LearningModule } from './learning/learning.module';
import { SkillsModule } from './skills/skills.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { DailyReportsModule } from './daily-reports/daily-reports.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    SupabaseModule,
    ArticlesModule,
    OpenAIModule,
    LearningModule,
    SkillsModule,
    RecommendationsModule,
    DailyReportsModule,
    QueueModule,
  ],
})
export class AppModule {}
