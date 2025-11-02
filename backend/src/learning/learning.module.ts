import { Module } from "@nestjs/common";
import { LearningService } from "./learning.service";
import { LearningController } from "./learning.controller";
import { SupabaseService } from "../supabase/supabase.service";

@Module({
  controllers: [LearningController],
  providers: [LearningService, SupabaseService],
})
export class LearningModule {}
