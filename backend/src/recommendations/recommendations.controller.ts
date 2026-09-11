import { Controller, Get, Query, Param, Post, Body, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RecommendationsService } from './recommendations.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recService: RecommendationsService,
    private readonly supabase: SupabaseService,
    @Inject('RECOMMENDATION_QUEUE') private readonly recommendationQueue: Queue,
  ) {}

  @Get()
  async recommend(@Query('userId') userId: string) {
    return this.recService.getRecommendations(userId);
  }

  @Get('articles')
  async getRecommendedArticles(@Query('userId') userId: string) {
    const [{ data, error }, { data: learningRecords }] = await Promise.all([
      this.supabase.client
        .from('recommended_articles')
        .select('*')
        .eq('user_id', userId),
      this.supabase.client
        .from('learning_records')
        .select('article_id')
        .eq('user_id', userId),
    ]);

    if (error) throw new Error(error.message);
    const readIds = new Set((learningRecords ?? []).map((record) => record.article_id));
    return (data ?? []).filter((article) => !readIds.has(article.article_id));
  }

  @Get('status')
  async getStatus(@Query('userId') userId: string) {
    const { data, error } = await this.supabase.client
      .from('recommendation_status')
      .select('status')
      .eq('user_id', userId)
      .single();

    if (error) return { status: 'error' };
    return { status: data?.status ?? 'ready' };
  }

  @Post('resources/sync')
  async syncLearningResources(@Body() body: { keyword?: string }) {
    return this.recService.syncLearningResources(body.keyword?.trim() || 'Python');
  }

  @Get('resources')
  async getLearningResources(@Query('userId') userId: string, @Query('type') type?: string) {
    const { data: resources, error } = await this.supabase.client
      .from('learning_resources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Learning resources table is unavailable:', error.message);
      return [];
    }

    const { data: records, error: progressError } = await this.supabase.client
      .from('resource_learning_records')
      .select('resource_id, status, progress_percent')
      .eq('user_id', userId);
    // Allow the catalog to remain usable until migration 003 is applied.
    const safeRecords = progressError ? [] : records ?? [];
    const progress = new Map(safeRecords.map((record) => [record.resource_id, record]));
    return (resources ?? [])
      .filter((resource) => !type || resource.resource_type === type)
      .map((resource) => ({ ...resource, learning: progress.get(resource.id) ?? null }))
      .filter((resource) => resource.learning?.status !== 'completed');
  }

  @Get('resources/:id')
  async getLearningResource(@Param('id') id: string, @Query('userId') userId?: string) {
    const { data, error } = await this.supabase.client.from('learning_resources').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    if (!userId) return data;
    const { data: learning } = await this.supabase.client
      .from('resource_learning_records')
      .select('status, progress_percent, memo')
      .eq('resource_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    return { ...data, learning: learning ?? null };
  }

  @Post('resources/progress')
  async updateResourceProgress(@Body() body: { userId: string; resourceId: number; progressPercent: number; memo?: string; comprehensionLevel?: number }) {
    const progressPercent = Math.max(0, Math.min(100, Number(body.progressPercent) || 0));
    const comprehensionLevel = body.comprehensionLevel ? Math.max(1, Math.min(5, body.comprehensionLevel)) : progressPercent >= 90 ? 4 : 3;
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + (comprehensionLevel >= 4 ? 7 : comprehensionLevel === 3 ? 3 : 1));
    const { data, error } = await this.supabase.client
      .from('resource_learning_records')
      .upsert({
        user_id: body.userId,
        resource_id: body.resourceId,
        progress_percent: progressPercent,
        status: progressPercent >= 90 ? 'completed' : 'started',
        comprehension_level: comprehensionLevel,
        next_review_at: nextReviewAt.toISOString(),
        review_count: progressPercent >= 90 ? 1 : 0,
        memo: body.memo?.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,resource_id' })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    if (progressPercent >= 90) {
      await this.recommendationQueue.add(
        'sync-resources',
        { userId: body.userId },
        { jobId: `sync-resources-${body.userId}`, removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } },
      );
    }
    return data;
  }

  @Get('review')
  async getUnifiedReviews(@Query('userId') userId: string) {
    const now = new Date().toISOString();
    const [{ data: articles }, { data: resources }] = await Promise.all([
      this.supabase.client.from('learning_records').select('id, article_id, comprehension_level, next_review_at, articles(title, tags)').eq('user_id', userId).lte('next_review_at', now).order('next_review_at'),
      this.supabase.client.from('resource_learning_records').select('id, resource_id, comprehension_level, next_review_at, learning_resources(title, resource_type, source)').eq('user_id', userId).lte('next_review_at', now).order('next_review_at'),
    ]);
    return { articles: articles ?? [], resources: resources ?? [] };
  }

  @Get('roadmap')
  async getRoadmap(@Query('userId') userId: string) {
    const [{ data: skills }, { data: records }] = await Promise.all([
      this.supabase.client.from('user_skills').select('skill_name, level').eq('user_id', userId),
      this.supabase.client.from('learning_records').select('articles(title, tags), comprehension_level').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);
    const roadmap = await this.recService.generateRoadmap((skills ?? []).map((skill) => `${skill.skill_name} Lv.${skill.level}`).join(', '), (records ?? []).map((record) => { const article = Array.isArray(record.articles) ? record.articles[0] : record.articles; return `${article?.title ?? 'タイトル不明'} (${record.comprehension_level ?? '-'} / 5)`; }).join(', '));
    return roadmap;
  }
}
