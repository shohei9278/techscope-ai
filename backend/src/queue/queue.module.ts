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
            url:
              process.env.REDIS_URL ||
              `redis://${process.env.REDIS_HOST || 'localhost'}:${
                process.env.REDIS_PORT || 6379
              }`,
          },
        }),
    },
  ],
  exports: ['RECOMMENDATION_QUEUE'],
})
export class QueueModule {}
