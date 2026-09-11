import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIService.name);

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    this.openai = new OpenAI({ apiKey: key });
  }

  /** 要約とタグを生成 */
  async summarizeArticle(title: string, content: string) {
    try {
      const prompt = `
以下の技術記事を100文字以内で要約し、
また主要なキーワード3つをカンマ区切りで出力してください。

---
タイトル: ${title}
本文: ${content.slice(0, 2000)}
---

出力フォーマット:
要約: ...
タグ: ...
      `;

      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは技術記事を要約するAIアシスタントです。',
          },
          { role: 'user', content: prompt },
        ],
      });

      const output = res.choices[0].message.content ?? '';
      const summaryMatch = output.match(/要約[:：]\s*(.+)/);
      const tagsMatch = output.match(/タグ[:：]\s*(.+)/);

      return {
        summary: summaryMatch ? summaryMatch[1].trim() : '',
        tags: tagsMatch ? tagsMatch[1].split(/[,、]/).map((t) => t.trim()) : [],
      };
    } catch (err) {
      this.logger.error('OpenAI summary failed', err);
      return { summary: '', tags: [] };
    }
  }

  async summarize(promptText: string) {
    try {
      const prompt = promptText;

      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは学習日報アシスタントです。',
          },
          { role: 'user', content: prompt },
        ],
      });

      const output = res.choices[0].message.content ?? '要約生成失敗';

      return output;
    } catch (err) {
      this.logger.error('OpenAI summary failed', err);
      return '要約生成失敗';
    }
  }

  async summarizeSkills(promptText: string) {
    try {
      const prompt = promptText;

      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは学習日報アシスタントです。',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const output = res.choices[0].message.content ?? '{"skills": []}';

      return JSON.parse(output);
    } catch (err) {
      this.logger.error('OpenAI summary failed', err);
      return { skills: [] };
    }
  }

  async summarizeDraft(promptText: string) {
    try {
      const prompt = promptText;

      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたはエンジニアの学習アシスタントです。',
          },
          { role: 'user', content: prompt },
        ],
      });

      const output = res.choices[0].message.content ?? '生成失敗';

      return output;
    } catch (err) {
      this.logger.error('OpenAI summary failed', err);
      return '生成失敗';
    }
  }

  async generateQuiz(title: string, summary: string, content: string) {
    try {
      const prompt = `
以下の技術記事をもとに、理解度確認クイズを3問作成してください。
各問題は4択で、正解は answer に0〜3の数字で指定してください。
解説は、なぜその答えになるかを簡潔に説明してください。
JSON以外は出力しないでください。

{
  "questions": [
    { "question": "...", "choices": ["...", "...", "...", "..."], "answer": 0, "explanation": "..." }
  ]
}

タイトル: ${title}
要約: ${summary}
本文: ${content.slice(0, 6000)}
`;
      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'あなたは技術学習の講師です。' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
      return { questions: Array.isArray(parsed.questions) ? parsed.questions : [] };
    } catch (err) {
      this.logger.error('OpenAI quiz generation failed', err);
      return { questions: [] };
    }
  }

  async askAboutArticle(question: string, title: string, content: string) {
    return this.summarize(`
あなたは技術記事の講師です。以下の記事の内容だけを根拠に、質問へ日本語でわかりやすく回答してください。
不明な点は推測せず「記事には記載がありません」と伝えてください。
記事タイトル: ${title}
記事本文: ${content.slice(0, 6000)}
質問: ${question}
`);
  }

  async generatePracticalTask(title: string, summary: string, content: string) {
    try {
      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `記事を実践するための小さな課題を1つJSONで作成してください。title, goal, steps, estimated_minutesを含めてください。\nタイトル: ${title}\n要約: ${summary}\n本文: ${content.slice(0, 4000)}`,
        }],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content ?? '{}');
    } catch (err) {
      this.logger.error('OpenAI task generation failed', err);
      return { title: '記事の内容を小さなサンプルで試す', goal: summary, steps: [], estimated_minutes: 20 };
    }
  }

  async generateLearningRoadmap(skills: string, recentLearning: string) {
    try {
      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `エンジニア向けの学習ロードマップを日本語JSONで作成してください。現在のスキルと最近の学習を踏まえ、次の3段階を順序付きで提案してください。各段階に title, goal, keywords, reason を含めてください。\nスキル: ${skills}\n最近の学習: ${recentLearning}`,
        }],
        response_format: { type: 'json_object' },
      });
      const result = JSON.parse(res.choices[0].message.content ?? '{}');
      return { steps: Array.isArray(result.steps) ? result.steps : [] };
    } catch (err) {
      this.logger.error('OpenAI roadmap generation failed', err);
      return { steps: [] };
    }
  }
}
