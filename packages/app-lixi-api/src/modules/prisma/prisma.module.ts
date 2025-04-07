import { Global, Module, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { KyselyExecutorService } from './kysely-executor.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [PrismaService, Logger, KyselyExecutorService],
  exports: [PrismaService, KyselyExecutorService]
})
export class PrismaModule {}
