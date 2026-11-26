import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DemoModule } from './demo.module';
async function bootstrap() {
  if (process.env.FTA_MODE !== 'demo') throw new Error('Only isolated demo mode is implemented');
  const app = await NestFactory.create(DemoModule, {cors:false});
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(4000,'0.0.0.0');
}
bootstrap().catch((error: unknown)=>{console.error(error instanceof Error ? error.message : 'Startup failed');process.exit(1);});
