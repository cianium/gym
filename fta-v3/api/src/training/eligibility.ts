import {PrismaClient} from '@prisma/client';
async function main(){
 if(process.env.FTA_MODE!=='training-staging'||process.env.FTA_STAGING_ACK!=='isolated-test-only'||new URL(process.env.DATABASE_URL??'').pathname!=='/fta_training_staging')throw Error('Isolated staging only');
 const email=(process.argv[2]??'').toLowerCase();if(!/^[a-z0-9._+-]+@example\.test$/.test(email))throw Error('Synthetic example.test accounts only');
 const db=new PrismaClient();try{const r=await db.trainingAccount.updateMany({where:{email,role:'ATHLETE',active:true},data:{stagingBookingEnabled:true}});if(r.count!==1)throw Error('Synthetic athlete not found');console.log('Staging booking enabled; phone remains unverified');}finally{await db.$disconnect();}
}
main().catch(()=>{console.error('Eligibility grant rejected');process.exitCode=1;});
