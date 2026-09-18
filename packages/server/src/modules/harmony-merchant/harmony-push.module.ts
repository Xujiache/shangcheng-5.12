import { Module } from '@nestjs/common'
import { HarmonyPushService } from './harmony-push.service'

@Module({
  providers: [HarmonyPushService],
  exports: [HarmonyPushService],
})
export class HarmonyPushModule {}
