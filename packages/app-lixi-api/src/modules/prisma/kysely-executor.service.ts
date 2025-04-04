import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path as needed
import { InferResult, CompiledQuery } from 'kysely';

@Injectable()
export class KyselyExecutorService {
  constructor(private prisma: PrismaService) {}

  async executeQuery<T extends CompiledQuery>(query: T): Promise<InferResult<T>> {
    return this.prisma.$queryRawUnsafe<InferResult<T>>(query.sql, ...query.parameters);
  }
}
