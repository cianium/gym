import {Controller,Get,Post,Put,Body,Req,Param,Module,HttpCode} from '@nestjs/common';
import {TrainingDatabase} from './database';
import {TrainingAuth,RequestInfo,publicAccount} from './auth';
import {TrainingService} from './service';
@Controller()
class TrainingController {
 constructor(private auth:TrainingAuth,private service:TrainingService,private db:TrainingDatabase){}
 @Get('health') async health(){await this.db.$queryRaw`SELECT 1`;return {status:'ok',mode:'training-staging',product:'FTA'};}
 @Post('auth/admin/login') @HttpCode(200) adminLogin(@Req() r:RequestInfo,@Body() b:unknown){return this.auth.login(r,b,'ADMIN');}
 @Post('athlete/login') @HttpCode(200) login(@Req() r:RequestInfo,@Body() b:unknown){return this.auth.login(r,b,'ATHLETE');}
 @Get('auth/me') async me(@Req() r:RequestInfo){return {account:publicAccount((await this.auth.authorize(r,undefined,true)).account)};}
 @Post('auth/password') @HttpCode(200) rotate(@Req() r:RequestInfo,@Body() b:unknown){return this.auth.rotate(r,b);}
 @Post('auth/logout') @HttpCode(200) logout(@Req() r:RequestInfo){return this.auth.logout(r);}
 @Get('athlete/me') async athlete(@Req() r:RequestInfo){return {athlete:publicAccount((await this.auth.authorize(r,'ATHLETE')).account)};}
 @Get('athlete/plans') plans(@Req() r:RequestInfo){return this.service.plans(r);}
 @Get('athlete/progress') entries(@Req() r:RequestInfo){return this.service.entries(r);}
 @Post('athlete/progress') @HttpCode(200) save(@Req() r:RequestInfo,@Body() b:unknown){return this.service.saveProgress(r,b);}
 @Get('admin/athletes') athletes(@Req() r:RequestInfo){return this.service.athletes(r);}
 @Post('admin/athletes') createAthlete(@Req() r:RequestInfo,@Body() b:unknown){return this.auth.createAthlete(r,b);}
 @Get('admin/training-plans') adminPlans(@Req() r:RequestInfo){return this.service.plans(r,true);}
 @Post('admin/training-plans') createPlan(@Req() r:RequestInfo,@Body() b:unknown){return this.service.savePlan(r,b);}
 @Put('admin/training-plans/:id') updatePlan(@Req() r:RequestInfo,@Param('id') id:string,@Body() b:unknown){return this.service.savePlan(r,b,id);}
 @Get('admin/athletes/:id/progress') athleteProgress(@Req() r:RequestInfo,@Param('id') id:string){return this.service.entries(r,id);}
}
@Module({providers:[TrainingDatabase,TrainingAuth,TrainingService],controllers:[TrainingController]})
export class TrainingModule {}
