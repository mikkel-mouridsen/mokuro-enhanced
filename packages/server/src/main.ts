import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS (allow both desktop app and web reader)
  app.enableCors({
    origin: [
      'http://localhost:5173', // Desktop dev
      'http://localhost:5174', // Web dev
      process.env.CORS_ORIGIN || 'http://localhost:5173',
    ],
    credentials: true,
  });

  // Serve static files for the web reader
  const readerDistPath = join(__dirname, '..', 'reader', 'dist', 'web');
  const express = await import('express');
  
  // Serve static assets (JS, CSS, images, etc.)
  app.use('/reader', express.default.static(readerDistPath));
  
  // SPA fallback - serve index.html for all other /reader/* routes
  app.use('/reader/*', (req, res) => {
    res.sendFile(join(readerDistPath, 'index.html'));
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Mokuro Enhanced API')
    .setDescription('API for Mokuro Enhanced manga reader')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📚 API docs available at http://localhost:${port}/api/docs`);
  console.log(`📖 Web reader available at http://localhost:${port}/reader`);
}

bootstrap();

