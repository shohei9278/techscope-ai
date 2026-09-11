import { Injectable, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService } from '../openai/openai.service';

@Injectable()
export class LearningService {
  constructor(
    private readonly supabase: SupabaseService,
    @Inject('RECOMMENDATION_QUEUE')
    private readonly recommendationQueue: Queue,
    private readonly openAIService: OpenAIService,
  ) {}

  async addRecord(
    articleId: number,
    userId: string,
    status = 'read',
    comprehensionLevel?: number,
    memo?: string,
    practicalTaskDone = false,
  ) {
    const { data, error } = await this.supabase.client
      .from('learning_records')
      .insert({
        article_id: articleId,
        user_id: userId,
        status,
        comprehension_level: comprehensionLevel,
        memo: memo?.trim() || null,
        practical_task_done: practicalTaskDone,
        next_review_at: this.nextReviewDate(comprehensionLevel),
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    await this.recommendationQueue.add(
      'generate',
      { userId },
      {
        removeOnComplete: { age: 3600 }, //  1時間後に自動削除
        removeOnFail: { age: 86400 }, // 1日後に失敗ジョブも削除
      },
    );
    await this.recommendationQueue.add(
      'sync-resources',
      { userId },
      { jobId: `sync-resources-${userId}`, removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } },
    );

    return data;
  }

  private nextReviewDate(level?: number) {
    const days = level && level >= 4 ? 7 : level === 3 ? 3 : 1;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  async generateQuiz(articleId: number) {
    const { data, error } = await this.supabase.client
      .from('articles')
      .select('title, summary, content')
      .eq('id', articleId)
      .single();
    if (error) throw new Error(error.message);
    return this.openAIService.generateQuiz(data.title, data.summary, data.content ?? '');
  }

  async submitQuiz(userId: string, articleId: number, score: number, total: number) {
    const { data, error } = await this.supabase.client
      .from('learning_quiz_attempts')
      .insert({ user_id: userId, article_id: articleId, score, total })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async completeReview(userId: string, recordId: number, comprehensionLevel?: number) {
    const { data, error } = await this.supabase.client
      .from('learning_records')
      .update({
        status: 'reviewed',
        comprehension_level: comprehensionLevel,
        next_review_at: this.nextReviewDate(comprehensionLevel),
      })
      .eq('id', recordId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async askAboutArticle(articleId: number, question: string) {
    const { data, error } = await this.supabase.client.from('articles').select('title, summary, content').eq('id', articleId).single();
    if (error) throw new Error(error.message);
    return { answer: await this.openAIService.askAboutArticle(question, data.title, data.content ?? data.summary ?? '') };
  }

  async generatePracticalTask(articleId: number) {
    const { data, error } = await this.supabase.client.from('articles').select('title, summary, content').eq('id', articleId).single();
    if (error) throw new Error(error.message);
    return this.openAIService.generatePracticalTask(data.title, data.summary, data.content ?? '');
  }

  async getOverview(userId: string) {
    const { data, error } = await this.supabase.client
      .from('learning_records')
      .select('*, articles(title, tags)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const records = data ?? [];
    const { data: attempts } = await this.supabase.client
      .from('learning_quiz_attempts')
      .select('score, total, article_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const quizAttempts = attempts ?? [];
    const averageScore = quizAttempts.length
      ? Math.round(quizAttempts.reduce((sum, item) => sum + (item.score / item.total) * 100, 0) / quizAttempts.length)
      : 0;
    const dueReviews = records.filter((record) => record.next_review_at && new Date(record.next_review_at) <= new Date());
    const { data: resourceRecords } = await this.supabase.client
      .from('resource_learning_records')
      .select('status, progress_percent, next_review_at, created_at')
      .eq('user_id', userId);
    const safeResourceRecords = resourceRecords ?? [];
    const dueResourceReviews = safeResourceRecords.filter((record) => record.next_review_at && new Date(record.next_review_at) <= new Date());
    const learningDays = new Set(records.map((record) => new Date(record.created_at).toISOString().slice(0, 10)));
    let streak = 0;
    const currentDay = new Date();
    if (!learningDays.has(currentDay.toISOString().slice(0, 10))) currentDay.setDate(currentDay.getDate() - 1);
    while (learningDays.has(currentDay.toISOString().slice(0, 10))) {
      streak += 1;
      currentDay.setDate(currentDay.getDate() - 1);
    }
    return { records, resourceRecords: safeResourceRecords, quizAttempts, averageScore, dueReviews, dueResourceReviews, streak, activeDays: learningDays.size, learningDates: [...learningDays], totalLearned: records.length + safeResourceRecords.length, completedResources: safeResourceRecords.filter((record) => record.status === 'completed').length };
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
