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

  async syncLearningResources(keyword = 'Python') {
    const resources: Array<Record<string, any>> = [];
    const errors: string[] = [];
    const add = (resource: Record<string, any>) => {
      if (resource.title && resource.url) resources.push({ ...resource, topic: keyword });
    };

    const cacheSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await this.supabaseService.client
      .from('learning_resources')
      .select('resource_type')
      .eq('topic', keyword)
      .gte('created_at', cacheSince);
    if (cached?.length) {
      const byType = cached.reduce<Record<string, number>>((result, item) => {
        result[item.resource_type] = (result[item.resource_type] ?? 0) + 1;
        return result;
      }, {});
      return { count: cached.length, byType, cached: true, errors: [] };
    }

    try {
      if (process.env.YOUTUBE_API_KEY) {
        const youtube = await axios.get('https://www.googleapis.com/youtube/v3/search', { params: { part: 'snippet', q: `${keyword} programming tutorial`, maxResults: 5, type: 'video', key: process.env.YOUTUBE_API_KEY }, timeout: 15000 });
        for (const item of youtube.data.items ?? []) add({ resource_type: 'video', external_id: item.id.videoId, title: item.snippet.title, summary: item.snippet.description, url: `https://www.youtube.com/watch?v=${item.id.videoId}`, thumbnail_url: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url, source: 'YouTube' });
      }
    } catch (error) { errors.push(`YouTube: ${error instanceof Error ? error.message : 'request failed'}`); }
    try {
      const books = await axios.get('https://www.googleapis.com/books/v1/volumes', { params: { q: keyword, maxResults: 5 }, timeout: 15000 });
      for (const item of books.data.items ?? []) { const info = item.volumeInfo ?? {}; add({ resource_type: 'book', external_id: item.id, title: info.title, summary: info.description ?? '', url: info.infoLink, thumbnail_url: info.imageLinks?.thumbnail, source: 'Google Books' }); }
    } catch (error) {
      try {
        const books = await axios.get('https://openlibrary.org/search.json', { params: { q: keyword, limit: 5 }, timeout: 15000 });
        for (const item of books.data.docs ?? []) {
          const key = String(item.key ?? '').replace('/works/', '');
          add({ resource_type: 'book', external_id: key, title: item.title, summary: `${item.author_name?.join(', ') ?? '著者不明'}${item.first_publish_year ? ` · ${item.first_publish_year}年` : ''}`, url: `https://openlibrary.org${item.key}`, thumbnail_url: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null, source: 'Open Library' });
        }
      } catch (fallbackError) { errors.push(`Books: ${fallbackError instanceof Error ? fallbackError.message : 'request failed'}`); }
    }
    try {
      const github = await axios.get('https://api.github.com/search/repositories', { params: { q: `${keyword} tutorial`, per_page: 5, sort: 'stars' }, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'TechScope-AI' }, timeout: 15000 });
      for (const item of github.data.items ?? []) add({ resource_type: 'repository', external_id: item.full_name, title: item.full_name, summary: item.description ?? '', url: item.html_url, thumbnail_url: item.owner?.avatar_url, source: 'GitHub', metadata: { stars: item.stargazers_count, language: item.language } });
    } catch (error) { errors.push(`GitHub: ${error instanceof Error ? error.message : 'request failed'}`); }
    try {
      const response = await axios.get('https://www.freecodecamp.org/news/rss/', { timeout: 15000, headers: { 'User-Agent': 'TechScope-AI' } });
      const itemMatches = String(response.data).match(/<item>[\s\S]*?<\/item>/g) ?? [];
      for (const item of itemMatches.slice(0, 5)) {
        const read = (tag: string) => item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}>([\\s\\S]*?)</${tag}>`))?.slice(1).find(Boolean)?.trim() ?? '';
        const title = read('title');
        const url = read('link');
        add({ resource_type: 'course', external_id: url, title, summary: read('description').replace(/<[^>]+>/g, '').slice(0, 2000), url, source: 'FreeCodeCamp' });
      }
    } catch (error) { errors.push(`Courses: ${error instanceof Error ? error.message : 'request failed'}`); }

    if (!resources.length) return { count: 0, byType: {}, errors };
    const rows = resources.map(({ resource_type, external_id, title, summary, url, thumbnail_url, source, topic, metadata }) => ({ resource_type, external_id: String(external_id), title: String(title).slice(0, 500), summary: String(summary ?? '').slice(0, 2000), url, thumbnail_url: thumbnail_url ?? null, source, topic, metadata: metadata ?? {} }));
    const { data, error } = await this.supabaseService.client.from('learning_resources').upsert(rows, { onConflict: 'resource_type,external_id' }).select('id');
    if (error) return { count: 0, byType: {}, errors: [...errors, `Database: ${error.message}`] };
    const byType = rows.reduce<Record<string, number>>((result, row) => {
      result[row.resource_type] = (result[row.resource_type] ?? 0) + 1;
      return result;
    }, {});
    return { count: data?.length ?? rows.length, byType, cached: false, errors };
  }

  async generateRoadmap(skills: string, recentLearning: string) {
    return this.openAIService.generateLearningRoadmap(skills || 'まだ登録なし', recentLearning || 'まだ学習履歴なし');
  }

  async syncResourcesForUser(userId: string) {
    const { data: skills } = await this.supabaseService.client
      .from('user_skills')
      .select('skill_name')
      .eq('user_id', userId)
      .order('level', { ascending: false })
      .limit(3);
    const keywords = (skills ?? []).map((skill) => skill.skill_name).filter(Boolean);
    if (!keywords.length) keywords.push('programming');
    const results = await Promise.all(keywords.map((keyword) => this.syncLearningResources(keyword)));
    return { count: results.reduce((sum, result) => sum + result.count, 0), results };
  }

  async getRecommendations(userId: string) {
    await this.supabaseService.client.from('recommendation_status').upsert({
      user_id: userId,
      status: 'generating',
      updated_at: new Date().toISOString(),
    });

    try {
      // 学習履歴とスキルの取得
      const [records, skills] = await Promise.all([
        this.supabaseService.client
          .from('learning_records')
          .select('*, articles(title, summary, tags)')
          .eq('user_id', userId)
          .limit(10),
        this.supabaseService.client
          .from('user_skills')
          .select('skill_name, level')
          .eq('user_id', userId),
      ]);

      const safeRecords = records.data ?? [];
      const safeSkills = skills.data ?? [];

      // AIにテーマ＋英語タグを生成させる
      const prompt = `
あなたは学習コンシェルジュです。
以下のスキルと最近読んだ記事を分析し、次に学ぶべきテーマを3つ提案してください。
理解度が3以下の記事のタグやテーマは、復習・補強につながる候補として優先してください。
理解度が4以上のテーマは、応用・発展的な候補にしてください。


また、それぞれのテーマに対応する**英語の検索用タグ(keyword)**も1つ生成してください。
（例: { "topic": "Next.jsのアドバンスド機能", "keyword": "nextjs" }）

【スキル】
${safeSkills.map((s) => `${s.skill_name}(Lv.${s.level})`).join(', ')}

【最近読んだ記事】
${safeRecords
  .map(
    (r) =>
      `タイトル: ${r.articles?.title}, タグ: ${r.articles?.tags?.join(', ')}, 理解度: ${r.comprehension_level ?? '-'} / 5`,
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

      const keywords = await Promise.all(
        items.map((i) => normalizeTagAI(i.topic)),
      );
      const merged = items.map((i, idx) => ({
        topic: i.topic,
        keyword: tagAlias[keywords[idx]] || keywords[idx],
      }));

      // Qiita / Zenn から記事取得
      const fetchQiitaZenn = async ({
        topic,
        keyword,
      }: {
        topic: string;
        keyword: string;
      }) => {
        const [qiitaRes, zennRes] = await Promise.allSettled([
          axios.get(
            `https://qiita.com/api/v2/tags/${keyword}/items?page=1&per_page=3`,
          ),
          axios.get(`https://zenn.dev/api/articles?topic=${keyword}`),
        ]);

        const qiita =
          qiitaRes.status === 'fulfilled'
            ? qiitaRes.value.data.map((a: any) => ({
                title: a.title,
                summary: a.body?.slice(0, 200) || '',
                content: a.body || '',
                url: a.url,
                source: 'Qiita',
                topic,
              }))
            : [];

        const zenn =
          zennRes.status === 'fulfilled'
            ? zennRes.value.data.articles?.slice(0, 3).map((a: any) => ({
                title: a.title,
                summary: a.summary,
                url: `https://zenn.dev/${a.path}`,
                source: 'Zenn',
                topic,
              }))
            : [];

        return [...qiita, ...zenn];
      };

      const allArticles = (
        await Promise.all(merged.map(fetchQiitaZenn))
      ).flat();

      // 外部サービスのIDではなく、内部記事のURLを介して学習済み記事を除外する
      const candidateUrls = [...new Set(allArticles.map((article) => article.url).filter(Boolean))];
      const [{ data: existingForFilter }, { data: completed }] = await Promise.all([
        this.supabaseService.client.from('articles').select('id, url').in('url', candidateUrls),
        this.supabaseService.client.from('learning_records').select('article_id').eq('user_id', userId),
      ]);
      const completedIds = new Set((completed ?? []).map((record) => record.article_id));
      const readUrls = new Set((existingForFilter ?? []).filter((article) => completedIds.has(article.id)).map((article) => article.url));
      const filtered = allArticles.filter((article) => !readUrls.has(article.url));

      if (!filtered.length) throw new Error('No new articles');

      const urls = filtered.map((a) => a.url);
      const { data: existingArticles } = await this.supabaseService.client
        .from('articles')
        .select('id, url')
        .in('url', urls);

      const safeExistingArticles = existingArticles ?? [];
      const idMap = Object.fromEntries(
        safeExistingArticles.map((a) => [a.url, a.id]),
      );

      const newArticles = filtered.filter((a) => !idMap[a.url]);

      const { data: inserted } = await this.supabaseService.client
        .from('articles')
        .insert(
          newArticles.map((a) => ({
            title: a.title,
            url: a.url,
            summary: a.summary,
            source: a.source,
            tags: [],
            content: a.content,
          })),
        )
        .select('id, url');
      const safeInserted = inserted ?? [];
      for (const art of safeInserted) idMap[art.url] = art.id;

      const recommendInserts = await Promise.all(
        filtered.map(async (a) => {
          const articleId = idMap[a.url];
          // summary / tags が newArticles にあった場合は再利用
          const matched: any = safeInserted.find((s) => s.url === a.url);
          const summary = matched?.summary || a.summary;
          const tags = matched?.tags || [];

          return {
            user_id: userId,
            article_id: articleId,
            title: a.title,
            summary,
            tags,
            url: a.url,
            source: a.source,
            topic: a.topic,
          };
        }),
      );

      // 過去のおすすめ記事を削除 → 一括登録
      await this.supabaseService.client
        .from('recommended_articles')
        .delete()
        .eq('user_id', userId);

      const { error: recError } = await this.supabaseService.client
        .from('recommended_articles')
        .insert(recommendInserts);

      if (recError) throw new Error(recError.message);

      // // Supabase に保存
      // if (filtered.length > 0) {
      //   // 過去のおすすめ記事を削除
      //   await this.supabaseService.client
      //     .from('recommended_articles')
      //     .delete()
      //     .eq('user_id', userId);

      //   for (const a of filtered) {
      //     // マスターデータベースの存在チェック
      //     const { data: existing } = await this.supabaseService.client
      //       .from('articles')
      //       .select('id')
      //       .eq('url', a.url)
      //       .maybeSingle();

      //     let articleId = existing?.id;

      //     // AI要約
      //     const { summary, tags } = await this.openAIService.summarizeArticle(
      //       a.title,
      //       a.content,
      //     );

      //     // なければ登録
      //     if (!articleId) {
      //       const { data: inserted } = await this.supabaseService.client
      //         .from('articles')
      //         .insert({
      //           summary: summary || a.summary,
      //           content: a.content,
      //           tags: tags,
      //           title: a.title,
      //           url: a.url,
      //           source: a.source,
      //         })
      //         .select('id')
      //         .single();

      //       // 作成時のID
      //       articleId = inserted?.id;
      //     }

      //     // おすすめデータベースに保存
      //     await this.supabaseService.client
      //       .from('recommended_articles')
      //       .insert({
      //         user_id: userId,
      //         summary: summary || a.summary,
      //         content: a.content,
      //         tags: tags,
      //         title: a.title,
      //         url: a.url,
      //         source: a.source,
      //         topic: a.topic,
      //         article_id: articleId,
      //       });
      //   }
      // }

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
