import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AdminPcCompatController } from './admin-pc-compat.controller'
import { PlatformModule } from '../platform/platform.module'
import { RefreshTokenBlacklistService } from './refresh-token-blacklist.service'
import { resolveJwtSecret } from '../../common/utils/jwt-secret.util'

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: '2h' },
    }),
    // 引入 PlatformModule 让 admin-pc-compat 委托 PlatformService 完成
    // 管理员/角色列表查询，避免在该 controller 直接调 Prisma 散漏鉴权/分页逻辑
    PlatformModule,
  ],
  controllers: [AuthController, AdminPcCompatController],
  providers: [AuthService, RefreshTokenBlacklistService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
