import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { FetchArticlesService } from './fetch.service';
import { ArticleDto } from './dto/article.dto';

@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly fetchService: FetchArticlesService,
  ) {}

  @Get()
  async findAll() {
    return this.articlesService.findAll();
  }

  @Get('sync')
  async syncArticles(@Query('tag') tag?: string) {
    const qiita = await this.fetchService.fetchQiita(tag);
    const zenn = await this.fetchService.fetchZenn(tag);

    const combined = [...qiita, ...zenn];
    await this.articlesService.createMany(combined);
    return { count: combined.length, saved: true };
  }

  @Post('batch')
  async createMany(@Body() articles: ArticleDto[]) {
    return this.articlesService.createMany(articles);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.articlesService.findOne(Number(id));
  }
}
