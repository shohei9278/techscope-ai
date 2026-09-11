import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { LearningService } from './learning.service';

@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post()
  async addRecord(
    @Body() body: {
      articleId: number;
      userId: string;
      status?: string;
      comprehensionLevel?: number;
      memo?: string;
      practicalTaskDone?: boolean;
    },
  ) {
    return this.learningService.addRecord(
      body.articleId,
      body.userId,
      body.status,
      body.comprehensionLevel,
      body.memo,
      body.practicalTaskDone,
    );
  }

  @Post('quiz')
  async generateQuiz(@Body() body: { articleId: number }) {
    return this.learningService.generateQuiz(body.articleId);
  }

  @Post('quiz/submit')
  async submitQuiz(@Body() body: { userId: string; articleId: number; score: number; total: number }) {
    return this.learningService.submitQuiz(body.userId, body.articleId, body.score, body.total);
  }

  @Post('review/complete')
  async completeReview(@Body() body: { userId: string; recordId: number; comprehensionLevel?: number }) {
    return this.learningService.completeReview(body.userId, body.recordId, body.comprehensionLevel);
  }

  @Post('ask')
  async askAboutArticle(@Body() body: { articleId: number; question: string }) {
    return this.learningService.askAboutArticle(body.articleId, body.question);
  }

  @Post('task')
  async generatePracticalTask(@Body() body: { articleId: number }) {
    return this.learningService.generatePracticalTask(body.articleId);
  }

  @Get('overview')
  async getOverview(@Query('userId') userId: string) {
    return this.learningService.getOverview(userId);
  }

  @Get()
  async getRecord(
    @Query('userId') userId: string,
    @Query('articleId') articleId?: number | undefined,
  ) {
    return this.learningService.getRecord(userId, articleId);
  }
}
