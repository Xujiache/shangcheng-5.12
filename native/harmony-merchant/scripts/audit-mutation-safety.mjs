import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// These are the business mutations where a second tap can create duplicate
// records, rotate a token twice, charge twice, or apply an action to stale UI.
// Keep the checks explicit so a refactor cannot silently remove the guard while
// leaving a visually disabled button behind.
const guardedContracts = [
  ['entry/src/main/ets/features/auth/LoginPage.ets', ['if (this.loading) return;', 'if (this.sendingCode || this.countdown > 0) return;']],
  ['entry/src/main/ets/features/auth/MerchantApplyPage.ets', ['if (this.submitting) return;', 'if (this.sendingCode || this.countdown > 0) return;']],
  ['entry/src/main/ets/features/auth/SetPasswordPage.ets', ['if (this.submitting) return;']],
  ['entry/src/main/ets/features/auth/ChangePhonePage.ets', ['if (this.saving) return;', 'this.sendingOld || this.oldCountdown > 0', 'if (this.sendingNew || this.newCountdown > 0) return;']],
  ['entry/src/main/ets/features/product/ProductListPage.ets', ['if (this.processingBatch) return;', 'this.processingBatch = true']],
  ['entry/src/main/ets/features/product/ProductEditPage.ets', ['if (this.saving) return;', 'if (this.uploading || this.saving) return;', 'if (this.skuUploading || this.saving) return;', 'if (this.uploading || this.skuUploading)']],
  ['entry/src/main/ets/features/product/CategoryPage.ets', ['if (this.saving || this.workingId) return;', 'if (this.workingId || this.saving) return;']],
  ['entry/src/main/ets/features/order/OrderDetailPage.ets', ['if (this.submitting) return;', 'if (this.parsing || this.submitting) return;']],
  ['entry/src/main/ets/features/order/AfterSalePage.ets', ['if (!this.selected || this.submitting) return;']],
  ['entry/src/main/ets/features/order/AfterSaleDetailPage.ets', ['if (!this.item || this.submitting) return;']],
  ['entry/src/main/ets/features/business/CustomerPage.ets', ['if (this.processingId) return;']],
  ['entry/src/main/ets/features/business/CommissionPage.ets', ['if (this.saving) {', 'this.dirty = true;']],
  ['entry/src/main/ets/features/business/StorePage.ets', ['if (this.processingId) return;']],
  ['entry/src/main/ets/features/business/StoreAuthPage.ets', ['if (this.saving) return;']],
  ['entry/src/main/ets/features/business/StaffPage.ets', ['if (this.saving || this.actionId) return;', 'if (this.actionId || this.saving) return;']],
  ['entry/src/main/ets/features/business/DecoratePage.ets', ['if (this.uploading) return;', 'if (this.saving) return;', 'if (this.uploading) {']],
  ['entry/src/main/ets/features/business/MarketingPage.ets', ['if (this.formSaving) return;', 'if (this.actionId || this.formSaving) return;']],
  ['entry/src/main/ets/features/chat/ChatDetailPage.ets', ['if (!normalized || this.sending) return;', 'if (this.uploading || this.sending) return;']],
  ['entry/src/main/ets/features/plaza/PlazaPage.ets', ['if (this.applyingProductId) return;', 'if (this.ratingFactoryId) return;', 'if (scope === this.plazaScope || this.savingVisibility) return;']],
  ['entry/src/main/ets/features/plaza/FactoryPage.ets', ['if (!this.data || this.following) return;', 'if (!this.data || this.rating > 0 || this.ratingSubmitting) return;', 'if (!this.data || this.applying) return;']],
  ['entry/src/main/ets/features/plaza/AgencyPage.ets', ['if (this.saving) return;', 'if (this.actionId || this.saving) return;']],
  ['entry/src/main/ets/features/member/MembershipPage.ets', ['if (this.purchasing || this.restoring)', 'this.purchasing = plan.id', 'this.restoring = true']],
  ['entry/src/main/ets/features/profile/ProfilePage.ets', ['if (this.uploading || this.saving) return;', 'if (this.saving) return;', 'if (this.uploading) {']],
  ['entry/src/main/ets/features/business/PriceRulePage.ets', ['if (this.saving || !this.dirty) return;', 'if (this.dirty) this.flushSave();']],
  ['entry/src/main/ets/pages/Index.ets', ['UpdatePolicy.canCheck(this.updateChecking', 'if (this.initializing) return;', 'if (this.updateOpening) return;']]
]

const errors = []
let checks = 0
for (const [relative, fragments] of guardedContracts) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    errors.push(`missing mutation owner ${relative}`)
    continue
  }
  const source = fs.readFileSync(absolute, 'utf8')
  for (const fragment of fragments) {
    checks += 1
    if (!source.includes(fragment)) {
      errors.push(`${relative}: missing mutation single-flight contract ${fragment}`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Native mutation-safety audit passed: ${checks} single-flight contracts verified.`)
