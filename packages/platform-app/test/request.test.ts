import { requestContract } from '../../../scripts/quality/uni-request-contract'
requestContract(() => import('../src/utils/request'), true)
