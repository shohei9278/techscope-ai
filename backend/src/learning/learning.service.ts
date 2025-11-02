import { Injectable, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class LearningService {
  constructor(
    private readonly supabase: SupabaseService,
    @Inject('RECOMMENDATION_QUEUE')
    private readonly recommendationQueue: Queue,
  ) {}

  async addRecord(articleId: number, userId: string, status = 'read') {
    const { data, error } = await this.supabase.client
      .from('learning_records')
      .insert({ article_id: articleId, user_id: userId, status });

    if (error) throw new Error(error.message);

    await this.recommendationQueue.add(
      'generate',
      { userId },
      {
        removeOnComplete: { age: 3600 }, //  1時間後に自動削除
        removeOnFail: { age: 86400 }, // 1日後に失敗ジョブも削除
      },
    );

    return data;
  }

  async getRecord(userId: string, articleId?: number) {
    const { data, error } = await this.supabase.client
      .from('learning_records')
      .select('*, articles(title, source, tags)')
      .eq('user_id', userId)
      .eq(articleId ? 'article_id' : '', articleId ?? '')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}
