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
}
