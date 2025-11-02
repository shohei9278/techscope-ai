import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { Worker } from 'bullmq';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const recommendationsService = app.get(RecommendationsService);

  console.log('Worker started. Waiting for jobs...');

  const worker = new Worker(
    'recommendation-queue',
    async (job) => {
      const { userId } = job.data;
      console.log(`[Worker] Recommendation job started for user: ${userId}`);

      try {
        await recommendationsService.getRecommendations(userId);
        console.log(`[Worker] Recommendation completed for ${userId}`);
      } catch (err) {
        console.error(`[Worker] Job failed for ${userId}`, err);
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
      removeOnComplete: { age: 3600 }, // 完了ジョブは1時間で削除
      removeOnFail: { age: 86400 }, //  失敗ジョブは1日で削除
    },
  );

  worker.on('completed', (job) => {
    console.log(`Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job failed: ${job?.id}`, err);
  });
}

bootstrap();
