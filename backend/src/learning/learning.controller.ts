import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { LearningService } from './learning.service';

@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post()
  async addRecord(
    @Body() body: { articleId: number; userId: string; status?: string },
  ) {
    return this.learningService.addRecord(
      body.articleId,
      body.userId,
      body.status,
    );
  }

  @Get()
  async getRecord(
    @Query('userId') userId: string,
    @Query('articleId') articleId?: number | undefined,
  ) {
    return this.learningService.getRecord(userId, articleId);
  }
}
