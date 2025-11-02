import { Injectable } from '@nestjs/common';
import axios from 'axios';
import Parser from 'rss-parser';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService } from '../openai/openai.service';
import OpenAI from 'openai';

type ArticleRecord = {
  title: string;
  summary: string;
  content: string;
  tags: string[];
  source: string;
  url: string;
  created_at: string;
};

@Injectable()
export class FetchArticlesService {
  private readonly qiitaBase = 'https://qiita.com/api/v2';
  private readonly zennApiBase = 'https://zenn.dev/api/articles';
  private readonly zennFeed = 'https://zenn.dev/feed';
  private readonly parser = new Parser();
  private openai: OpenAI;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly openAIService: OpenAIService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  /** Qiita記事をタグ指定で取得 */
  async fetchQiita(tag?: string, limit = 5): Promise<ArticleRecord[]> {
    try {
      let url = '';
      if (tag) {
        const normalizedTag = await this.normalizeTagAI(tag);
        tag = this.tagAlias[normalizedTag] || normalizedTag;
        console.log(tag);

        url = `${this.qiitaBase}/tags/${encodeURIComponent(tag)}/items?page=1&per_page=${limit}`;
      } else {
        // 全体新着（タグなし）
        url = `${this.qiitaBase}/items?page=1&per_page=${limit}`;
      }

      const res = await axios.get(url);
      const data = res.data as any[];

      console.log(data);

      return data.map((item) => ({
        title: item.title,
        summary: item.body?.slice(0, 200) || '',
        content: item.body || '',
        tags: [tag || 'Qiita'],
        source: 'Qiita',
        url: item.url,
        created_at: item.created_at,
      }));
    } catch (err: any) {
      console.error(' Qiita fetch error:', err.message);
      return [];
    }
  }

  /** Zenn記事を topicあり/なし 両対応で取得（本文付き） */
  async fetchZenn(topic?: string, limit = 5): Promise<ArticleRecord[]> {
    try {
      // -------------------------
      // 🔹 topicあり → API経由でslug取得
      // -------------------------
      if (topic) {
        const normalizedTag = await this.normalizeTagAI(topic);
        const safeTag = this.tagAlias[normalizedTag] || normalizedTag;
        console.log(safeTag);
        const url = `${this.zennApiBase}?topic=${encodeURIComponent(
          safeTag,
        )}&order=latest&page=1&count=${limit}`;
        const res = await axios.get(url);
        const articles = res.data.articles || [];

        // slugから詳細APIを叩く
        const detailed = await Promise.all(
          articles.slice(0, limit).map(async (item: any) => {
            try {
              const detail = await axios.get(
                `${this.zennApiBase}/${item.slug}`,
              );
              const d = detail.data.article;
              return {
                title: d.title,
                summary: d.summary || '',
                content: d.body_html || '', // 本文全文（HTML）
                tags: d.topics?.map((t: any) => t.name) || [topic],
                source: 'Zenn',
                url: `https://zenn.dev/${d.path}`,
                created_at: d.published_at,
              };
            } catch (err: any) {
              console.warn('⚠️ Zenn detail fetch failed:', item.slug);
              return null;
            }
          }),
        );

        return detailed.filter(Boolean) as ArticleRecord[];
      }

      // -------------------------
      // 🔹 topicなし → RSS経由（slugを抽出して本文APIを再取得）
      // -------------------------
      else {
        const feed = await this.parser.parseURL(this.zennFeed);

        const detailed = await Promise.all(
          feed.items.slice(0, limit).map(async (item: any) => {
            try {
              // RSSからslugを抽出（例: https://zenn.dev/user/articles/abc123）
              const slugMatch = item.link.match(/articles\/([^/]+)/);
              const slug = slugMatch ? slugMatch[1] : null;

              if (!slug) return null;

              const detail = await axios.get(
                `https://zenn.dev/api/articles/${slug}`,
              );
              const d = detail.data.article;

              return {
                title: d.title,
                summary: d.summary || '',
                content: d.body_html || '', // RSS経由でも本文取得OK
                tags: d.topics?.map((t: any) => t.name) || ['Zenn'],
                source: 'Zenn',
                url: item.link,
                created_at: d.published_at,
              };
            } catch (err: any) {
              console.warn('⚠️ RSS detail fetch failed:', item.link);
              return null;
            }
          }),
        );

        return detailed.filter(Boolean) as ArticleRecord[];
      }
    } catch (err: any) {
      console.error(' Zenn fetch error:', err.message);
      return [];
    }
  }

  normalizeTagAI = async (topic: string): Promise<string> => {
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

  tagAlias: Record<string, string> = {
    ai: 'artificial-intelligence',
    db: 'database',
    js: 'javascript',
    ts: 'typescript',
  };

  /** Qiita + Zenn の自動取得 */
  async fetchAll({ topic, limit = 5 }: { topic?: string; limit?: number }) {
    const [qiita, zenn] = await Promise.all([
      topic ? this.fetchQiita(topic, limit) : Promise.resolve([]),
      this.fetchZenn(topic, limit),
    ]);

    const merged = [...qiita, ...zenn];

    return merged;
  }
}
