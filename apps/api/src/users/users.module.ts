/**
 * UsersModule — registers UsersController and UsersService.
 *
 * PrismaService is provided globally via PrismaModule (imported in AppModule).
 * AuthModule is imported to expose JwtAuthGuard for @UseGuards(JwtAuthGuard).
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
