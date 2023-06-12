import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  controllers: [StoresController],
  providers: [StoresService],
  imports: [TypeOrmModule.forFeature([Store]), AuthModule],
  exports: [StoresService, TypeOrmModule],
})
export class StoresModule {}
