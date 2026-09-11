import { Module } from "@nestjs/common";
import { LearningService } from "./learning.service";
import { LearningController } from "./learning.controller";
import { SupabaseService } from "../supabase/supabase.service";
import { OpenAIModule } from "../openai/openai.module";

@Module({
  controllers: [LearningController],
  providers: [LearningService, SupabaseService],
  imports: [OpenAIModule],
})
export class LearningModule {}
