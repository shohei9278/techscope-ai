import { Module } from "@nestjs/common";
import { SkillsService } from "./skills.service";
import { SkillsController } from "./skills.controller";
import { SupabaseService } from "../supabase/supabase.service";

@Module({
  controllers: [SkillsController],
  providers: [SkillsService, SupabaseService],
})
export class SkillsModule {}
