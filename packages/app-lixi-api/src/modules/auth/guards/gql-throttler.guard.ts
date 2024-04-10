import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlArgumentsHost, GqlExecutionContext } from '@nestjs/graphql';
import {
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerOptions,
  ThrottlerStorage
} from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  private logger: Logger = new Logger(GqlThrottlerGuard.name);

  constructor(options: ThrottlerModuleOptions, storageService: ThrottlerStorage, reflector: Reflector) {
    super(options, storageService, reflector);
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    return req.ips && req.ips.length ? req.ips[0] : req.ip; // individualize IP extraction to meet your own needs
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
    getTracker: ThrottlerGetTrackerFunction,
    generateKey: ThrottlerGenerateKeyFunction
  ): Promise<boolean> {
    // Here we start to check the amount of requests being done against the ttl.
    const { req, res } = this.getRequestResponse(context);

    // Return early if the current user agent should be ignored.
    if (Array.isArray(throttler.ignoreUserAgents)) {
      for (const pattern of throttler.ignoreUserAgents) {
        if (pattern.test(req.headers['user-agent'])) {
          return true;
        }
      }
    }
    const tracker = await getTracker(req);
    const key = generateKey(context, tracker, 'default');
    const { totalHits, timeToExpire } = await this.storageService.increment(key, ttl);

    // Throw an error when the user reached their limit.
    if (totalHits > limit) {
      res.header('Retry-After', timeToExpire);
      this.throwThrottlingException(context, {
        ttl,
        limit,
        tracker,
        key
      } as ThrottlerLimitDetail);
    }

    res.header(`${this.headerPrefix}-Limit`, limit);
    // We're about to add a record so we need to take that into account here.
    // Otherwise the header says we have a request left when there are none.
    res.header(`${this.headerPrefix}-Remaining`, Math.max(0, limit - totalHits));
    res.header(`${this.headerPrefix}-Reset`, timeToExpire);

    return true;
  }

  getRequestResponse(context: ExecutionContext) {
    this.logger.log('getRequestResponse');
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.reply }; // ctx.request and ctx.reply for fastify
  }
}
