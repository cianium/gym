import {Injectable,UnauthorizedException,ForbiddenException,HttpException,ConflictException,UnprocessableEntityException} from '@nestjs/common';
import {TrainingAccount,TrainingRole,Prisma} from '@prisma/client';
import {TrainingDatabase} from './database';
import {digest,token,hashPassword,checkPassword} from './crypto';
import {record,str,password,email,phone} from './validation';
export type RequestInfo={headers:Record<string,string|string[]|undefined>;ip?:string};
export const publicAccount=(a:TrainingAccount)=>({id:a.id,name:a.name,email:a.email,phone:a.phone,role:a.role.toLowerCase(),mustChangePassword:a.mustChangePassword,phone_verified:false,stagingBookingEnabled:a.stagingBookingEnabled});
@Injectable()
export class TrainingAuth {
 constructor(private db:TrainingDatabase){}
 async login(req:RequestInfo,raw:unknown,role:TrainingRole){
  const b=record(raw),id=str(b.identifier??b.username,'identifier',255).toLowerCase(),pw=password(b.password,1);
  let normalized=id;if(!id.includes('@')){try{normalized=phone(id)}catch{normalized=id;}}
  const now=Date.now(),window=Math.floor(now/600000);
  // Atomic counters across instances. IP is the directly observed peer, never a forwarded header.
  for(const [key,max] of [[digest('ip:'+String(req.ip??'unknown')+':'+window),40],[digest('id:'+normalized+':'+window),8]] as const){
   const bucket=await this.db.trainingLoginBucket.upsert({where:{key},create:{key,expiresAt:new Date((window+1)*600000)},update:{count:{increment:1}}});
   if(bucket.count>max)throw new HttpException('Too many login attempts',429);
  }
  const account=await this.db.trainingAccount.findFirst({where:{role,OR:[{email:normalized},{phone:normalized}]}});
  if(!await checkPassword(pw,account?.passwordHash)||!account?.active)throw new UnauthorizedException('Invalid credentials');
  const accessToken=token();
  await this.db.$transaction(async tx=>{
   const locked=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "TrainingAccount" WHERE id=${account.id} FOR UPDATE`;
   if(!locked.length)throw new UnauthorizedException();
   const current=await tx.trainingAccount.findUniqueOrThrow({where:{id:account.id}});
   if(!current.active||current.passwordHash!==account.passwordHash)throw new UnauthorizedException();
   await tx.trainingSession.deleteMany({where:{accountId:account.id,expiresAt:{lte:new Date()}}});
   const count=await tx.trainingSession.count({where:{accountId:account.id}});
   if(count>=10)throw new HttpException('Session limit reached',429);
   await tx.trainingSession.create({data:{tokenHash:digest(accessToken),accountId:account.id,expiresAt:new Date(Date.now()+8*3600000)}});
  });
  return {authenticated:true,accessToken,account:publicAccount(account)};
 }
 async authorize(req:RequestInfo,role?:TrainingRole,allowRotation=false){
  const h=req.headers.authorization;if(typeof h!=='string'||!/^Bearer [a-f0-9]{64}$/.test(h))throw new UnauthorizedException();
  const tokenHash=digest(h.slice(7));const session=await this.db.trainingSession.findUnique({where:{tokenHash},include:{account:true}});
  if(!session||session.expiresAt<=new Date()||!session.account.active)throw new UnauthorizedException();
  if(role&&session.account.role!==role)throw new ForbiddenException();
  if(session.account.mustChangePassword&&!allowRotation)throw new ForbiddenException({code:'PASSWORD_CHANGE_REQUIRED'});
  return {account:session.account,tokenHash};
 }
 async rotate(req:RequestInfo,raw:unknown){
  const {account,tokenHash}=await this.authorize(req,undefined,true);const b=record(raw),old=password(b.currentPassword,1),next=password(b.newPassword);
  const window=Math.floor(Date.now()/600000),key=digest('password-rotation:'+account.id+':'+window);
  const bucket=await this.db.trainingActionBucket.upsert({where:{key},create:{key,expiresAt:new Date((window+1)*600000)},update:{count:{increment:1}}});
  if(bucket.count>5)throw new HttpException('Too many password attempts',429);
  if(old===next||!await checkPassword(old,account.passwordHash))throw new UnprocessableEntityException({code:'INVALID_CURRENT_PASSWORD',message:'Invalid current password or unchanged password'});
  const passwordHash=await hashPassword(next);
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "TrainingAccount" WHERE id=${account.id} FOR UPDATE`;
   const current=await tx.trainingAccount.findUniqueOrThrow({where:{id:account.id}});
   if(!current.active||current.passwordHash!==account.passwordHash)throw new UnauthorizedException();
   const currentSession=await tx.trainingSession.findUnique({where:{tokenHash}});if(!currentSession||currentSession.expiresAt<=new Date())throw new UnauthorizedException();
   await tx.trainingAccount.update({where:{id:account.id},data:{passwordHash,mustChangePassword:false}});
   await tx.trainingSession.deleteMany({where:{accountId:account.id}});
   return {ok:true,relogin:true};
  });
 }
 async logout(req:RequestInfo){const {tokenHash}=await this.authorize(req,undefined,true);await this.db.trainingSession.deleteMany({where:{tokenHash}});return {ok:true};}
 async sessions(req:RequestInfo){
  const {account,tokenHash}=await this.authorize(req,undefined,true);
  const sessions=await this.db.trainingSession.findMany({where:{accountId:account.id,expiresAt:{gt:new Date()}},select:{tokenHash:true,createdAt:true,expiresAt:true},orderBy:{createdAt:'desc'}});
  return {sessions:sessions.map(s=>({id:digest('session-display:'+s.tokenHash),current:s.tokenHash===tokenHash,createdAt:s.createdAt,expiresAt:s.expiresAt}))};
 }
 async revokeOthers(req:RequestInfo){
  const {account,tokenHash}=await this.authorize(req,undefined,true);
  return this.db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "TrainingAccount" WHERE id=${account.id} FOR UPDATE`;
   const session=await tx.trainingSession.findUnique({where:{tokenHash},include:{account:true}});
   if(!session||session.expiresAt<=new Date()||!session.account.active)throw new UnauthorizedException();
   const deleted=await tx.trainingSession.deleteMany({where:{accountId:account.id,tokenHash:{not:tokenHash}}});
   return {ok:true,revoked:deleted.count};
  });
 }
 async createAthlete(req:RequestInfo,raw:unknown){
  await this.authorize(req,'ADMIN');const b=record(raw);
  try{const a=await this.db.trainingAccount.create({data:{name:str(b.name,'name',150),email:email(b.email),phone:phone(b.phone),passwordHash:await hashPassword(password(b.password)),role:'ATHLETE'}});return {athlete:publicAccount(a)};}
  catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw new ConflictException('Account already exists');throw e;}
 }
}
