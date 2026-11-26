import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Controller()
class DemoController {
  @Get('health')
  health() { return { status: 'ok', product: 'FTA', mode: 'demo' }; }

  @Get('demo/overview')
  overview() {
    return { mode: 'demo', athletes: 128, coaches: 6, activePlans: 94, appointments: 12 };
  }
}
@Module({ controllers: [DemoController] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(4000, '0.0.0.0');
}
bootstrap().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
