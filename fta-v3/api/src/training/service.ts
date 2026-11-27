import {Injectable,ConflictException,NotFoundException} from '@nestjs/common';
import {TrainingAssignment,TrainingEntry} from '@prisma/client';
import {TrainingDatabase} from './database';
import {TrainingAuth,RequestInfo} from './auth';
import {record,str,planBody,date,optionalText,invalid,today} from './validation';
const dateOnly=(d:Date|null)=>d?.toISOString().slice(0,10)??null;
const plan=(p:TrainingAssignment)=>({id:p.id,athlete_id:p.athleteId,coach_id:p.coachId,title:p.title,description:p.description,sessions:p.sessions,starts_on:dateOnly(p.startsOn),ends_on:dateOnly(p.endsOn),status:p.status.toLowerCase(),created_at:p.createdAt});
const progress=(p:TrainingEntry)=>({id:p.id,athlete_id:p.athleteId,training_plan_id:p.assignmentId,performed_on:dateOnly(p.performedOn),session_day:p.sessionDay,effort:p.effort,notes:p.notes});
@Injectable()
export class TrainingService {
 constructor(private db:TrainingDatabase,private auth:TrainingAuth){}
 async athletes(req:RequestInfo){await this.auth.authorize(req,'ADMIN');return {athletes:await this.db.trainingAccount.findMany({where:{role:'ATHLETE',active:true},select:{id:true,name:true,email:true,phone:true},take:100,orderBy:{id:'asc'}})};}
 async plans(req:RequestInfo,admin=false){const {account}=await this.auth.authorize(req,admin?'ADMIN':'ATHLETE');const rows=await this.db.trainingAssignment.findMany({where:admin?{}:{athleteId:account.id,status:'PUBLISHED'},take:100,orderBy:{createdAt:'desc'}});return admin?{plans:{data:rows.map(plan)}}:{plans:rows.map(plan)};}
 async entries(req:RequestInfo,athleteId?:string){const {account}=await this.auth.authorize(req,athleteId?'ADMIN':'ATHLETE');return {progress:(await this.db.trainingEntry.findMany({where:{athleteId:athleteId??account.id},take:100,orderBy:{performedOn:'desc'}})).map(progress)};}
 async savePlan(req:RequestInfo,raw:unknown,id?:string){
  const {account}=await this.auth.authorize(req,'ADMIN');const data=planBody(raw);
  return this.db.$transaction(async tx=>{
   if(id){const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "TrainingAssignment" WHERE id=${id} FOR UPDATE`;if(!rows.length)throw new NotFoundException();}
   if(!await tx.trainingAccount.findFirst({where:{id:data.athleteId,role:'ATHLETE',active:true},select:{id:true}}))invalid('athlete_id');
   if(!id)return {plan:plan(await tx.trainingAssignment.create({data:{...data,coachId:account.id}}))};
   const current=await tx.trainingAssignment.findUniqueOrThrow({where:{id}});
   if(current.athleteId!==data.athleteId&&await tx.trainingEntry.count({where:{assignmentId:id}}))throw new ConflictException('Training history cannot change owner');
   return {plan:plan(await tx.trainingAssignment.update({where:{id},data}))};
  });
 }
 async saveProgress(req:RequestInfo,raw:unknown){
  const {account}=await this.auth.authorize(req,'ATHLETE');const b=record(raw),id=str(b.training_plan_id,'training_plan_id',80),sessionDay=str(b.session_day,'session_day',80),performedOn=date(b.performed_on,'performed_on');
  if(dateOnly(performedOn)!>today())invalid('performed_on');
  if(b.effort!=null&&(!Number.isInteger(b.effort)||Number(b.effort)<1||Number(b.effort)>10))invalid('effort');
  const effort=b.effort==null?null:Number(b.effort),notes=optionalText(b.notes,'notes',2000);
  return this.db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "TrainingAssignment" WHERE id=${id} AND "athleteId"=${account.id} FOR UPDATE`;
   if(!rows.length)throw new NotFoundException();
   const p=await tx.trainingAssignment.findUniqueOrThrow({where:{id}});if(p.status!=='PUBLISHED')throw new NotFoundException();
   if(!Array.isArray(p.sessions)||!p.sessions.some(s=>s&&typeof s==='object'&&!Array.isArray(s)&&s.day===sessionDay))invalid('session_day');
   if((p.startsOn&&performedOn<p.startsOn)||(p.endsOn&&performedOn>p.endsOn))invalid('performed_on');
   const key={assignmentId:id,athleteId:account.id,performedOn,sessionDay};
   return {progress:progress(await tx.trainingEntry.upsert({where:{assignmentId_athleteId_performedOn_sessionDay:key},create:{...key,effort,notes},update:{effort,notes}}))};
  });
 }
}
