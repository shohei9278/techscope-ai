# TechScope AI

AI が学びを記録・分析し、自動でスキルを伸ばす「自己学習ループ」プラットフォーム
techscope-ai.vercel.app

## コンセプト

TechScope は、「学んだ内容を AI が理解し、次の学びを提案する」
という自己学習の循環を目指した個人向け AI 学習支援システムです。

「学習 → 記録 → スキル抽出 → おすすめ記事提示 → 日報作成 → 学習」
この一連の流れを、AI が自動化・最適化します。

## 自己学習ループの仕組み

```mermaid
graph TD
A[記事を読む] --> B[学習記録APIに登録]
B --> C[学習履歴とスキルを分析]
C --> D[OpenAIが学習テーマを生成]
D --> E[Qiita/Zennから関連記事を自動取得]
E --> F[おすすめ記事をユーザーに提示]
F --> G[日報を作成・要約]
G --> H[新しいスキルを自動更新]
H --> C
```

## 主な機能

| 機能カテゴリ                   | 説明                                                 |
| ------------------------------ | ---------------------------------------------------- |
| 認証管理                       | Supabase Auth によるメール＋ゲストログイン対応       |
| 記事収集                       | Qiita / Zenn からトピック別に新着記事を自動収集      |
| AI おすすめ生成                | OpenAI (GPT-4o-mini) による学習テーマ提案と記事推薦  |
| 学習記録 API                   | 読了ボタン or 自動記録で学習履歴を Supabase に保存   |
| 日報自動ドラフト               | 最近の学習データから AI が日報を自動生成（要約付き） |
| スキル自動更新                 | 日報内容からスキル名を抽出し、自動的にレベル更新     |
| おすすめ記事ページ             | トピック別に AI が推薦した記事を整理表示             |
| 個人分析ダッシュボード（予定） | 学習傾向・スキル変化を可視化予定                     |

## 技術構成

| 層       | 使用技術                                       | 概要                               |
| -------- | ---------------------------------------------- | ---------------------------------- |
| Frontend | Next.js 15 / React / TailwindCSS               | SPA + ダークモード対応 UI          |
| Backend  | NestJS / Supabase Client / OpenAI SDK / BullMQ | 学習・推薦・AI 連携 API            |
| Database | Supabase (PostgreSQL)                          | 記事・学習履歴・スキル・日報を保存 |
| Queue    | Redis + BullMQ                                 | 推薦生成処理を非同期ジョブ化       |
| Infra    | Render (API + Redis + DB) / Vercel (Frontend)  | CI/CD ＋無料枠構成で安定稼働       |

## データ構造（主要テーブル）

| テーブル名            | 主なカラム                    | 役割                     |
| --------------------- | ----------------------------- | ------------------------ |
| articles              | title, summary, tags, content | 記事のマスターデータ     |
| learning_records      | user_id, article_id, status   | ユーザーの学習履歴       |
| user_skills           | user_id, skill_name, level    | 学習スキルの蓄積・更新   |
| daily_reports         | user_id, content, ai_summary  | 日報・AI 要約            |
| recommended_articles  | user_id, topic, article_id    | AI が提案した記事        |
| recommendation_status | user_id, status               | 推薦生成ジョブの状態管理 |

## 環境構築

### 1. Supabase の設定

Supabase で新規プロジェクトを作成し、
`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を取得。

### 2. .env ファイル

```bash
# Frontend / Backend 共通
NEXT_PUBLIC_SUPABASE_URL=xxxxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
OPENAI_API_KEY=xxxxx

# Backend
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:password@localhost:5432/techscope
```

### 3. ローカル起動

```bash
docker compose up
```

## ロードマップ

| フェーズ | 内容                                  | 状態     |
| -------- | ------------------------------------- | -------- |
| v1.0     | 学習記録 + AI おすすめ + 日報連携     | 完成     |
| v1.1     | スキルグラフ可視化 + ダッシュボード   | 開発中   |
| v1.2     | 学習タスクの自動生成 / 通知機能       | 計画中   |
| v2.0     | チーム学習共有・AI モデルトレーニング | 構想段階 |

## 開発思想

TechScope は「AI による“自己理解の自動化”」を目指しています。
人が何を学んでいるか、どんなスキルが伸びているかを AI が読み取り、
次の最適な学びを自動で提示する ― それがこのプロジェクトの本質です。

「学習の最適化 × 自己分析 × 継続性」
人間の学習を AI で循環させるプロダクトを目指します。

## Author

Shohei Nakahara

- GitHub: [@shohei9278](https://github.com/shohei9278)
- Project Repo: [TechScope AI](https://github.com/shohei9278/techscope-ai)
- Stack: TypeScript / Python / NestJS / React / Supabase / OpenAI
