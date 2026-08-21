import { Global, Module } from '@nestjs/common'
import { ContentSecurityService } from './content-security.service'

/**
 * 微信内容安全能力。
 *
 * 作为全局模块注册，确保所有会持久化用户生成内容（UGC）的业务域都使用同一套
 * access_token 缓存、超时和 fail-closed 策略，而不是在各 controller 内复制调用逻辑。
 */
@Global()
@Module({
  providers: [ContentSecurityService],
  exports: [ContentSecurityService],
})
export class ContentSecurityModule {}
