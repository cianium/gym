import {PrismaClient} from '@prisma/client';
import {hashPassword} from './crypto';
import {email,password} from './validation';
async function main(){
 if(process.env.FTA_MODE!=='training-staging'||process.env.FTA_STAGING_ACK!=='isolated-test-only'||new URL(process.env.DATABASE_URL??'').pathname!=='/fta_training_staging')throw Error('Isolated staging database required');
 const db=new PrismaClient();
 try{const address=email(process.env.FTA_BOOTSTRAP_EMAIL),hash=await hashPassword(password(process.env.FTA_BOOTSTRAP_PASSWORD));
 await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(730381)`;if(await tx.trainingAccount.count({where:{role:'ADMIN'}}))throw Error('Admin already provisioned');await tx.trainingAccount.create({data:{name:'FTA staging administrator',email:address,passwordHash:hash,role:'ADMIN',mustChangePassword:true}});});
 console.log('Staging administrator provisioned; password rotation required');
 }finally{await db.$disconnect();}
}
main().catch(()=>{console.error('Provisioning rejected');process.exitCode=1;});
