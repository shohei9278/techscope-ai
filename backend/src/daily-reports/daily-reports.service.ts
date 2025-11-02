import { Injectable, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService } from '../openai/openai.service';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly OpenAIService: OpenAIService,
    private readonly recommendationsService: RecommendationsService,
    @Inject('RECOMMENDATION_QUEUE')
    private readonly recommendationQueue: Queue,
  ) {}

  async createReport(userId: string, content: string) {
    // AI要約生成
    const prompt = `
あなたは学習日報アシスタントです。
以下の内容を3行で要約し、最後に1文でフィードバックを添えてください。
---
${content}
`;

    const summary = await this.OpenAIService.summarize(prompt);

    const promptSkills = `
以下の文章を読んで、学習・使用したと考えられる技術スキル名を配列形式でJSONで出力してください。
例: { "skills": ["Next.js", "TypeScript", "SQL"] }
---
${content}
`;

    const skillsData = await this.OpenAIService.summarizeSkills(promptSkills);
    const skills = skillsData.skills || [];

    const { data: report, error } = await this.supabase.client
      .from('daily_reports')
      .insert([{ user_id: userId, content, ai_summary: summary }])
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    for (const skill of skills) {
      if (!skill.trim()) continue;
      // 既存スキル確認
      const { data: existing } = await this.supabase.client
        .from('user_skills')
        .select('*')
        .eq('user_id', userId)
        .eq('skill_name', skill)
        .maybeSingle();

      if (existing) {
        // 既にある → レベル+1
        await this.supabase.client
          .from('user_skills')
          .update({
            level: existing.level + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // 新規登録
        await this.supabase.client
          .from('user_skills')
          .insert([{ user_id: userId, skill_name: skill, level: 1 }]);
      }
    }

    if (skills.length > 0) {
      console.log('Queue:', this.recommendationQueue.name);

      await this.recommendationQueue.add(
        'generate',
        { userId },
        {
          removeOnComplete: { age: 3600 }, //  1時間後に自動削除
          removeOnFail: { age: 86400 }, // 1日後に失敗ジョブも削除
        },
      );
    }

    return { ...report, extracted_skills: skills };
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase.client
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}
