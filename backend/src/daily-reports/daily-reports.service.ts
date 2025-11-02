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

  // 自動ドラフト生成
  async generateDraft(userId: string) {
    // 最近読んだ記事・スキル取得
    const { data: records } = await this.supabase.client
      .from('learning_records')
      .select('articles(title, summary, tags)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: skills } = await this.supabase.client
      .from('user_skills')
      .select('skill_name, level')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    const safeRecords = records ?? [];
    const safeSkills = skills ?? [];

    const prompt = `
あなたはエンジニアの日報アシスタントです。
以下の学習履歴をもとに、自然な文章で日報の下書きを日本語で作成してください。
「#」などのMarkdown記号は使わず、箇条書きではなく文章として出力してください。
なるべくスキル名を盛り込み、学んだことが伝わるようにしてください。

【最近読んだ記事】
${safeRecords
  .map((r: any) =>
    Array.isArray(r.articles)
      ? r.articles.map((a) => `・${a.title} (${a.tags?.join(', ')})`).join('\n')
      : `・${r.articles?.title ?? 'タイトル不明'}`,
  )
  .join('\n')}

【スキル】
${safeSkills.map((s) => `${s.skill_name} Lv.${s.level}`).join(', ')}
`;

    const aiDraft = await this.OpenAIService.summarizeDraft(prompt);

    return { content: aiDraft };
  }
}
