import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle()
@Controller('order')
export class OrderController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check(): Promise<any> {}
}
