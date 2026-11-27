import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {DemoModule} from './demo.module';
import {TrainingModule} from './training/module';
async function bootstrap(){
 const mode=process.env.FTA_MODE;
 if(mode==='training-staging'){
  if(process.env.FTA_STAGING_ACK!=='isolated-test-only'||new URL(process.env.DATABASE_URL??'').pathname!=='/fta_training_staging')throw Error('Only isolated staging database allowed');
 }else if(mode!=='demo')throw Error('Unsupported runtime mode');
 const app=await NestFactory.create(mode==='demo'?DemoModule:TrainingModule,{cors:false,logger:['error','warn']});
 app.getHttpAdapter().getInstance().disable('x-powered-by');
 app.use((_req:unknown,res:{setHeader:(k:string,v:string)=>void},next:()=>void)=>{
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  next();
 });
 app.setGlobalPrefix('api/v1');app.enableShutdownHooks();
 await app.listen(4000,'0.0.0.0');
}
bootstrap().catch(()=>{console.error('FTA startup failed');process.exit(1);});
