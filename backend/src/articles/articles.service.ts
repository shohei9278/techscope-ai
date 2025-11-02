import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ArticleDto } from './dto/article.dto';
import { OpenAIService } from '../openai/openai.service';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly openAIService: OpenAIService,
  ) {}

  async findAll() {
    const { data, error } = await this.supabaseService.client
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: number) {
    if (isNaN(id)) {
      throw new Error(`Invalid article id: ${id}`);
    }
    const { data, error } = await this.supabaseService.client
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async createMany(articles: ArticleDto[]) {
    const enriched: ArticleDto[] = [];

    for (const a of articles) {
      const { data: existing } = await this.supabaseService.client
        .from('articles')
        .select('id')
        .eq('url', a.url)
        .maybeSingle();

      if (existing) {
        continue; // Skip existing article
      }

      const { summary, tags } = await this.openAIService.summarizeArticle(
        a.title,
        a.content,
      );

      enriched.push({
        title: a.title,
        content: a.content,
        source: a.source,
        url: a.url,
        created_at: a.created_at,
        summary: summary || a.summary,
        tags: tags.length ? tags : a.tags,
      });
    }

    const { data, error } = await this.supabaseService.client
      .from('articles')
      .insert(
        enriched.map((a) => ({
          title: a.title,
          summary: a.summary,
          content: a.content,
          tags: a.tags,
          source: a.source,
          url: a.url,
          created_at: a.created_at,
        })),
      );

    if (error) throw new Error(error.message);
    return data;
  }
}
