import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AdminPcCompatController } from './admin-pc-compat.controller'

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'please-change-me-in-production',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController, AdminPcCompatController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
