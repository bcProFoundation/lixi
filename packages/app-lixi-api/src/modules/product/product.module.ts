import _ from 'lodash';
import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductResolver } from './product.resolver';

@Module({
  imports: [AuthModule],
  providers: [ProductResolver, Logger],
  exports: [ProductResolver, Logger]
})
export class ProductModule {}
