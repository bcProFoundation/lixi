import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Query,
  UseInterceptors
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import geoip from 'geoip-country';
import * as _ from 'lodash';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ReqSocket } from 'src/decorators/req.socket.decorator';
import { VError } from 'verror';
import { PrismaService } from '../../prisma/prisma.service';
import { MeiliService } from 'src/modules/page/meili.service';

@SkipThrottle()
@Controller('countries')
export class CountryController {
  private logger: Logger = new Logger(this.constructor.name);
  constructor(
    private prisma: PrismaService,
    private meiliService: MeiliService
  ) {}

  @CacheTTL(600000)
  @Get()
  async getCountries(@I18n() i18n: I18nContext): Promise<any> {
    try {
      const countries = await this.prisma.country.findMany();
      const result = countries;
      return result;
    } catch (err: unknown) {
      const unableGetEnvelope = await i18n.t('country.messages.unableToGetCountries');
      throw new HttpException(unableGetEnvelope, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @Get(':countryCode/states')
  async getStates(@Param('countryCode') countryCode: string, @I18n() i18n: I18nContext): Promise<any> {
    try {
      const states = await this.prisma.worldcities.findMany({
        where: {
          iso2: countryCode
        },
        distinct: 'adminNameAscii',
        orderBy: { adminNameAscii: 'asc' }
      });

      const resultApi = states;
      return resultApi;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToGetLixi = await i18n.t('country.messages.unableToGetState');
        const error = new VError.WError(err as Error, unableToGetLixi);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @Get('/cities')
  async getCities(
    @Query('countryCode') countryCode: string,
    @Query('adminCode') adminCode: string,
    @I18n() i18n: I18nContext
  ): Promise<any> {
    try {
      const cities = await this.prisma.worldcities.findMany({
        where: {
          iso2: countryCode,
          adminCode: adminCode
        },
        distinct: 'cityAscii',
        orderBy: { cityAscii: 'asc' }
      });

      const resultApi = cities;
      return resultApi;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToGetLixi = await i18n.t('country.messages.unableToGetCity');
        const error = new VError.WError(err as Error, unableToGetLixi);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @Get('locations')
  async getLocations(@Query('query') query: string, @I18n() i18n: I18nContext): Promise<any> {
    try {
      const locations = await this.meiliService.searchByLocationQueryHits(
        `${process.env.MEILISEARCH_BUCKET}_locations`,
        query,
        0,
        20
      );

      return locations;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToGetLixi = await i18n.t('country.messages.unableToGetState');
        const error = new VError.WError(err as Error, unableToGetLixi);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000)
  @Get('coordinate')
  async getCoordinate(@Query('lat') lat: string, @Query('lng') lng: string, @I18n() i18n: I18nContext): Promise<any> {
    try {
      const locations = await this.meiliService.searchByLatLngHits(
        `${process.env.MEILISEARCH_BUCKET}_locations`,
        lat,
        lng,
        0,
        20
      );

      return locations;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToGetLixi = await i18n.t('country.messages.unableToGetState');
        const error = new VError.WError(err as Error, unableToGetLixi);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('ipaddr')
  async getCountryFromIpAddress(@Headers('x-forwarded-for') headerIp: string, @ReqSocket() socket: any): Promise<any> {
    try {
      const ip = headerIp.includes(',') ? headerIp.split(',')[0] : headerIp || socket.remoteAddress;
      const geolocation = geoip.lookup(ip);
      if (geolocation) {
        return geolocation?.country;
      }
      throw Error('Unable to detect ip address');
    } catch (err) {
      throw new HttpException(err as string, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
