import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  async addSkill(
    @Body() body: { userId: string; skill_name: string; level: number },
  ) {
    return this.skillsService.create(body.userId, body.skill_name, body.level);
  }

  @Get()
  async getSkills(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.skillsService.findAll(userId);
  }

  @Delete()
  async removeSkill(@Query('id') id: number) {
    return this.skillsService.remove(id);
  }
}
