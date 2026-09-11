import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Check critical environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'OPENAI_API_KEY',
      'DATABASE_URL'
    ];

    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
      logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      logger.error('Please check your .env file and ensure all required variables are set.');
      process.exit(1);
    }

    const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: [
        /\.cloudrun\.app$/,
        'https://techscope-ai.vercel.app',
        'http://localhost:3000',
      ],
      credentials: true,
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    const port = process.env.PORT || 4000;

    await app.listen(port, '0.0.0.0');
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}
bootstrap();
