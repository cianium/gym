import { Controller, Get, Injectable, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
class DemoDatabase extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
@Injectable()
class DemoService {
  constructor(private readonly db: DemoDatabase) {}
  async overview() {
    const [athletes, coaches, activePlans, appointments] = await this.db.$transaction([
      this.db.demoMember.count(), this.db.demoCoach.count(),
      this.db.demoPlan.count({where:{status:'active'}}),
      this.db.demoAppointment.count({where:{status:'scheduled'}})
    ]);
    return {mode:'demo', athletes, coaches, activePlans, appointments};
  }
  members() { return this.db.demoMember.findMany({orderBy:{id:'asc'},select:{id:true,name:true,status:true,coach:{select:{name:true}}}}); }
  coaches() { return this.db.demoCoach.findMany({orderBy:{id:'asc'},select:{id:true,name:true,specialty:true}}); }
  plans() { return this.db.demoPlan.findMany({orderBy:{id:'asc'},select:{id:true,title:true,status:true,member:{select:{name:true}}}}); }
  appointments() { return this.db.demoAppointment.findMany({orderBy:{startsAt:'asc'},select:{id:true,title:true,startsAt:true,status:true,member:{select:{name:true}}}}); }
  products() { return this.db.demoProduct.findMany({orderBy:{id:'asc'}}); }
  athlete() { return this.db.demoMember.findUniqueOrThrow({where:{id:'m1'},select:{name:true,status:true,coach:{select:{name:true}},plans:{select:{title:true,status:true}},appointments:{select:{title:true,startsAt:true,status:true}}}}); }
}
@Controller('demo')
class DemoController {
  constructor(private readonly demo: DemoService) {}
  @Get('overview') overview() { return this.demo.overview(); }
  @Get('members') members() { return this.demo.members(); }
  @Get('coaches') coaches() { return this.demo.coaches(); }
  @Get('plans') plans() { return this.demo.plans(); }
  @Get('appointments') appointments() { return this.demo.appointments(); }
  @Get('products') products() { return this.demo.products(); }
  @Get('athlete') athlete() { return this.demo.athlete(); }
}
@Controller()
class HealthController {
  constructor(private readonly db: DemoDatabase) {}
  @Get('health') async health() { await this.db.$queryRaw`SELECT 1`; return { status:'ok',product:'FTA',mode:'demo' }; }
}
@Module({providers:[DemoDatabase,DemoService],controllers:[DemoController,HealthController]})
export class DemoModule {}
