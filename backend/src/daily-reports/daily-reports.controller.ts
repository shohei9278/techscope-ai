import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { DailyReportsService } from './daily-reports.service';

@Controller('reports')
export class DailyReportsController {
  constructor(private readonly reportsService: DailyReportsService) {}

  @Post()
  async create(@Body() body: { userId: string; content: string }) {
    if (!body.userId || !body.content) {
      throw new BadRequestException('userIdとcontentは必須です');
    }
    return this.reportsService.createReport(body.userId, body.content);
  }

  @Get()
  async getAll(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userIdは必須です');
    return this.reportsService.findAll(userId);
  }
}
