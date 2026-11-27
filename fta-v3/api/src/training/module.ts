import {Controller,Get,Post,Put,Body,Req,Param,Module,HttpCode} from '@nestjs/common';
import {TrainingDatabase} from './database';
import {TrainingAuth,RequestInfo,publicAccount} from './auth';
import {TrainingService} from './service';
import {CommunicationService} from './communication';
@Controller()
class TrainingController {
 constructor(private auth:TrainingAuth,private service:TrainingService,private db:TrainingDatabase,private comm:CommunicationService){}
 @Get('health') async health(){await this.db.$queryRaw`SELECT 1`;return {status:'ok',mode:'training-staging',product:'FTA'};}
 @Post('auth/admin/login') @HttpCode(200) adminLogin(@Req() r:RequestInfo,@Body() b:unknown){return this.auth.login(r,b,'ADMIN');}
 @Post('athlete/login') @HttpCode(200) login(@Req() r:RequestInfo,@Body() b:unknown){return this.auth.login(r,b,'ATHLETE');}
 @Get('auth/me') async me(@Req() r:RequestInfo){return {account:publicAccount((await this.auth.authorize(r,undefined,true)).account)};}
 @Post('auth/password') @HttpCode(200) rotate(@Req() r:RequestInfo,@Body() b:unknown){return this.auth.rotate(r,b);}
 @Get('auth/sessions') sessions(@Req() r:RequestInfo){return this.auth.sessions(r);}
 @Post('auth/sessions/revoke-others') @HttpCode(200) revokeOthers(@Req() r:RequestInfo){return this.auth.revokeOthers(r);}
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
 @Get('athlete/consultations/slots') available(@Req() r:RequestInfo){return this.comm.available(r);}
 @Get('athlete/consultations/bookings') mine(@Req() r:RequestInfo){return this.comm.bookings(r);}
 @Post('athlete/consultations/bookings') book(@Req() r:RequestInfo,@Body() b:unknown){return this.comm.book(r,b);}
 @Post('athlete/consultations/bookings/:id/cancel') @HttpCode(200) cancel(@Req() r:RequestInfo,@Param('id') id:string){return this.comm.transition(r,id,null);}
 @Get('admin/consultation-slots') slots(@Req() r:RequestInfo){return this.comm.slots(r);}
 @Post('admin/consultation-slots') createSlot(@Req() r:RequestInfo,@Body() b:unknown){return this.comm.createSlot(r,b);}
 @Post('admin/consultation-slots/:id/disable') @HttpCode(200) disable(@Req() r:RequestInfo,@Param('id') id:string){return this.comm.disable(r,id);}
 @Get('admin/consultation-bookings') bookings(@Req() r:RequestInfo){return this.comm.bookings(r,true);}
 @Post('admin/consultation-bookings/:id/status') @HttpCode(200) status(@Req() r:RequestInfo,@Param('id') id:string,@Body() b:unknown){return this.comm.transition(r,id,b,true);}
 @Get('athlete/messages') messages(@Req() r:RequestInfo){return this.comm.messages(r);}
 @Post('athlete/messages') send(@Req() r:RequestInfo,@Body() b:unknown){return this.comm.send(r,b);}
 @Post('athlete/messages/read') @HttpCode(200) read(@Req() r:RequestInfo){return this.comm.read(r);}
 @Get('admin/athletes/:id/messages') adminMessages(@Req() r:RequestInfo,@Param('id') id:string){return this.comm.messages(r,id);}
 @Post('admin/athletes/:id/messages') adminSend(@Req() r:RequestInfo,@Param('id') id:string,@Body() b:unknown){return this.comm.send(r,b,id);}
 @Post('admin/athletes/:id/messages/read') @HttpCode(200) adminRead(@Req() r:RequestInfo,@Param('id') id:string){return this.comm.read(r,id);}
}
@Module({providers:[TrainingDatabase,TrainingAuth,TrainingService,CommunicationService],controllers:[TrainingController]})
export class TrainingModule {}
