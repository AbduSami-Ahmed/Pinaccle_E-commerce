import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 4000;
  const corsOrigin = process.env['CORS_ORIGIN'] ?? 'http://localhost:3000';

  // Security headers
  app.use(helmet());

  // Cookie parsing — required for httpOnly cookie auth
  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global API prefix (all routes under /api/v1)
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Pinnacle Automotive Parts API')
    .setDescription('Modular Monolith REST API for Pinnacle Automotive Parts E-Commerce Platform')
    .setVersion('0.1.0')
    .addTag('Health', 'Service health check and telemetry')
    .addTag('Auth', 'Authentication and session management')
    .addTag('Users', 'User management (staff only)')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[Pinnacle API] Application running on: http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[Pinnacle API] Swagger documentation: http://localhost:${port}/api/docs`);
}

void bootstrap();
