import { Controller, Get, Query, Param } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recService: RecommendationsService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get()
  async recommend(@Query('userId') userId: string) {
    return this.recService.getRecommendations(userId);
  }

  @Get('articles')
  async getRecommendedArticles(@Query('userId') userId: string) {
    const { data, error } = await this.supabase.client
      .from('recommended_articles')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data ?? [];
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
}
