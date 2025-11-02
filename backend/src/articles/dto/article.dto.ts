import { IsString, IsArray, IsOptional } from 'class-validator';

export class ArticleDto {
  @IsString()
  title: string;

  @IsString()
  summary: string;

  @IsString()
  content: string;

  @IsArray()
  tags: string[];

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  created_at?: string;
}
