import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService } from '../openai/openai.service';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

export type RecommendedArticle = {
  title: string;
  summary: string;
  content: string;
  url: string;
  source: string;
  topic: string;
  id: number;
  is_ai_recommended: boolean;
  user_id: string;
};

@Injectable()
export class RecommendationsService {
  private openai: OpenAI;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly openAIService: OpenAIService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async fetchZennContent(url: string): Promise<string> {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    return $('.znc').text().trim();
  }

  async getRecommendations(userId: string) {
    await this.supabaseService.client.from('recommendation_status').upsert({
      user_id: userId,
      status: 'generating',
      updated_at: new Date().toISOString(),
    });

    try {
      // 学習履歴とスキルの取得
      const { data: records } = await this.supabaseService.client
        .from('learning_records')
        .select('*, articles(title, summary, tags)')
        .eq('user_id', userId)
        .limit(10);

      const { data: skills } = await this.supabaseService.client
        .from('user_skills')
        .select('skill_name, level')
        .eq('user_id', userId);

      const safeRecords = records ?? [];
      const safeSkills = skills ?? [];

      // AIにテーマ＋英語タグを生成させる
      const prompt = `
あなたは学習コンシェルジュです。
以下のスキルと最近読んだ記事を分析し、次に学ぶべきテーマを3つ提案してください。


また、それぞれのテーマに対応する**英語の検索用タグ(keyword)**も1つ生成してください。
（例: { "topic": "Next.jsのアドバンスド機能", "keyword": "nextjs" }）

【スキル】
${safeSkills.map((s) => `${s.skill_name}(Lv.${s.level})`).join(', ')}

【最近読んだ記事】
${safeRecords
  .map(
    (r) =>
      `タイトル: ${r.articles?.title}, タグ: ${r.articles?.tags?.join(', ')}`,
  )
  .join('\n')}

次の形式の**JSON**で出力してください：
{
  "items": [
    {"topic": "string", "keyword": "string"},
    {"topic": "string", "keyword": "string"},
    {"topic": "string", "keyword": "string"}
  ]
}
`;

      let items: { topic: string; keyword: string }[] = [];

      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        });

        const parsed = JSON.parse(
          completion.choices[0].message.content || '{}',
        );
        items = parsed.items ?? [];
      } catch (error) {
        console.error('OpenAI API Error:', error);
        return { message: 'AIテーマ生成に失敗しました。' };
      }

      if (!items.length) return { message: 'テーマ生成に失敗しました。' };

      // タグ補正ロジック
      const normalizeTag = (tag: string) => {
        const map: Record<string, string> = {
          database_design: 'database',
          nextjs_typescript: 'nextjs',
          real_time_data: 'realtime',
          ai_learning: 'ai',
          react_hooks: 'react',
          frontend_performance: 'performance',
          web_development: 'webdev',
        };
        return map[tag] || tag.replace(/[^a-z0-9_-]/gi, '');
      };

      const normalizeTagAI = async (topic: string): Promise<string> => {
        const prompt = `
次のテーマに関連する技術タグを1〜2個、QiitaやZennで実際に使われているタグ名として出力してください。
例:
- "AWS上でのSQLデータベース管理" → "aws, rds"
- "AI駆動のデータ分析とビジュアライゼーション" → "artificial-intelligence, data-visualization"
- "SQLとAIの統合活用法" → "sql, machine-learning"
出力は小文字・カンマ区切りのみ。
テーマ: ${topic}
`;

        const res = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        });

        const raw = res.choices[0].message?.content || '';
        return raw
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)[0]; // 最初のタグだけ返す
      };

      const tagAlias: Record<string, string> = {
        ai: 'artificial-intelligence',
        db: 'database',
        js: 'javascript',
        ts: 'typescript',
      };

      const allArticles: RecommendedArticle[] = [];

      // Qiita / Zenn から記事取得
      for (const { topic, keyword } of items) {
        const key = await normalizeTagAI(keyword);
        const safeTag = tagAlias[key] || key;
        console.log(`[${topic}] → 検索タグ: ${safeTag}`);

        try {
          // --- Qiita ---
          let qiitaArticles: RecommendedArticle[] = [];
          try {
            // タグ検索
            const tagRes = await axios.get(
              `https://qiita.com/api/v2/tags/${encodeURIComponent(safeTag)}/items?page=1&per_page=3`,
            );
            qiitaArticles =
              tagRes.data?.map((a: any) => ({
                title: a.title,
                summary: a.body?.slice(0, 200) || '',
                content: a.body || '',
                url: a.url,
                source: 'Qiita',
                is_ai_recommended: true,
                user_id: userId,
                topic,
              })) ?? [];
          } catch {
            // タグが存在しない場合はキーワード検索
            const queryRes = await axios.get(
              `https://qiita.com/api/v2/items?query=${encodeURIComponent(
                safeTag,
              )}&per_page=3`,
            );
            qiitaArticles =
              queryRes.data?.map((a: any) => ({
                title: a.title,
                summary: a.body?.slice(0, 200) || '',
                content: a.body || '',
                url: a.url,
                source: 'Qiita',
                is_ai_recommended: true,
                user_id: userId,
                topic,
              })) ?? [];
          }

          // --- Zenn ---
          let zennArticles: RecommendedArticle[] = [];
          try {
            const zennRes = await axios.get(
              `https://zenn.dev/api/articles?topic=${encodeURIComponent(safeTag)}`,
            );

            zennArticles =
              zennRes.data.articles?.slice(0, 3).map((a: any) => ({
                title: a.title,
                summary: a.summary || '',
                url: `https://zenn.dev/${a.path}`,
                source: 'Zenn',
                is_ai_recommended: true,
                user_id: userId,
                topic,
              })) ?? [];

            if (zennArticles.length > 0) {
              for (const element of zennArticles) {
                element.content = await this.fetchZennContent(element.url);
              }
            }
          } catch (e) {
            console.warn(`Zenn取得失敗: ${topic}`, e.message);
          }

          console.log(
            `取得件数: ${qiitaArticles.length + zennArticles.length}`,
          );

          allArticles.push(...zennArticles, ...qiitaArticles);
        } catch (e) {
          console.warn(`記事取得失敗: ${topic}`, e.message);
        }
      }

      // 学習済み記事の除外
      const { data: completedIds } = await this.supabaseService.client
        .from('learning_records')
        .select('article_id')
        .eq('user_id', userId);
      const safeCompletedIds = completedIds ?? [];
      const excludeIds = safeCompletedIds.map((r) => r.article_id);
      const filtered = allArticles.filter((a) => !excludeIds.includes(a.id));

      // Supabase に保存
      if (filtered.length > 0) {
        // 過去のおすすめ記事を削除
        await this.supabaseService.client
          .from('recommended_articles')
          .delete()
          .eq('user_id', userId);

        for (const a of filtered) {
          // マスターデータベースの存在チェック
          const { data: existing } = await this.supabaseService.client
            .from('articles')
            .select('id')
            .eq('url', a.url)
            .maybeSingle();

          let articleId = existing?.id;

          // AI要約
          const { summary, tags } = await this.openAIService.summarizeArticle(
            a.title,
            a.content,
          );

          // なければ登録
          if (!articleId) {
            const { data: inserted } = await this.supabaseService.client
              .from('articles')
              .insert({
                summary: summary || a.summary,
                content: a.content,
                tags: tags,
                title: a.title,
                url: a.url,
                source: a.source,
              })
              .select('id')
              .single();

            // 作成時のID
            articleId = inserted?.id;
          }

          // おすすめデータベースに保存
          await this.supabaseService.client
            .from('recommended_articles')
            .insert({
              user_id: userId,
              summary: summary || a.summary,
              content: a.content,
              tags: tags,
              title: a.title,
              url: a.url,
              source: a.source,
              topic: a.topic,
              article_id: articleId,
            });
        }
      }

      await this.supabaseService.client
        .from('recommendation_status')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      return { message: 'AI recommendation completed!' };
    } catch (error) {
      console.error('Recommendation failed:', error.message);

      await this.supabaseService.client
        .from('recommendation_status')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      return { message: 'AI recommendation failed.' };
    }
  }
}
