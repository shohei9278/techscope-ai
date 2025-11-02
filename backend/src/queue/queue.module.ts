// src/queue/queue.module.ts
import { Module, Global } from '@nestjs/common';
import { Queue } from 'bullmq';

@Global()
@Module({
  providers: [
    {
      provide: 'RECOMMENDATION_QUEUE',
      useFactory: () =>
        new Queue('recommendation-queue', {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_URL) || 6379,
          },
        }),
    },
  ],
  exports: ['RECOMMENDATION_QUEUE'],
})
export class QueueModule {}
