import { Module } from '@nestjs/common'
import { MerchantModule } from '../merchant/merchant.module'
import {
  HarmonyMerchantController,
  HuaweiIapNotificationController,
} from './harmony-merchant.controller'
import { HarmonyIapService } from './harmony-iap.service'
import { HarmonyPushModule } from './harmony-push.module'
import { HuaweiIapJwsService } from './huawei-iap-jws.service'
import { HuaweiIapServerService } from './huawei-iap-server.service'

@Module({
  imports: [MerchantModule, HarmonyPushModule],
  controllers: [HarmonyMerchantController, HuaweiIapNotificationController],
  providers: [HuaweiIapJwsService, HuaweiIapServerService, HarmonyIapService],
  // Re-export the module that owns HarmonyPushService. Exporting an imported
  // provider directly is rejected by Nest during a real application boot,
  // even though TypeScript compilation and isolated service tests succeed.
  exports: [HarmonyPushModule, HarmonyIapService],
})
export class HarmonyMerchantModule {}
