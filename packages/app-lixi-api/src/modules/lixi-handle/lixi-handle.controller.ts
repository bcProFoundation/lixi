
import { Controller, Get, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { LixiHandleService } from './lixi-handle.service';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle()
@Controller('handles')
export class LixiHandleController {
  constructor(
    private prisma: PrismaService,
    private readonly lixiHandleService: LixiHandleService,
    private readonly notificationService: NotificationService
  ) { }

  @Get('address/:address')
  async getHandleByAddress(@Param('address') address: string) {
    return '';
    // return this.lixiHandleService.getHandleByAddress(address);
  }


  @Get('name/:name')
  async getHandleByName(@Param('name') name: string) {
    return '';
  }

}
