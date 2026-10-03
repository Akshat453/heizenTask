import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.setup.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.PORT ?? 3001;

  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}`);
}

void bootstrap();
