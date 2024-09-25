import { Body, Controller, Get, HttpException, HttpStatus, Post, Request, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';
import VError from 'verror';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { SilentLoginType } from '@bcpros/lixi-models';

@SkipThrottle()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { data: SilentLoginType },
    @Res({ passthrough: true }) response: FastifyReply
  ): Promise<string> {
    try {
      const { data } = body;
      const token = await this.authService.login(data);

      response.header('Authorization', `Bearer ${token}`);

      // response.setCookie('_auth_token', token, {
      //   httpOnly: true,
      //   sameSite: 'none',
      //   signed: true,
      //   secure: true,
      //   path: '/',
      //   priority: 'high',
      //   domain: 'ecash-escrow.test',
      //   maxAge: 15552000 // 6 months
      // });

      return token;
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const error = new VError.WError(err as Error, 'auth.messages.loginFailed');
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('csrf')
  @UseGuards(JwtAuthGuard)
  async csrf(@Request() req: FastifyRequest, @Res({ passthrough: true }) response: FastifyReply) {
    const csrfToken = await response.generateCsrf({
      signed: true,
      sameSite: 'strict',
      path: '/api',
      httpOnly: true
    });
    return csrfToken;
  }
}
