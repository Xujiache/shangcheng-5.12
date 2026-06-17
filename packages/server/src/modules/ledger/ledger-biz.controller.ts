import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { LedgerService } from './ledger.service'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { LedgerMembershipGuard } from './guards/ledger-membership.guard'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import { CreateLedgerOrderDto, OrderQueryDto, UpdateLedgerOrderDto } from './dto/order.dto'
import { CreateLedgerCustomerDto, UpdateLedgerCustomerDto } from './dto/customer.dto'
import { UpdateLedgerGoalDto } from './dto/misc.dto'
import { CreateCutPlanDto, UpdateCutPlanDto } from './dto/cut.dto'

/**
 * 门窗利账 App · 业务（/api/v1/l/*，需登录 + 会员有效）。
 * 会员闸门由 LedgerMembershipGuard 统一拦截：过期/未开通 → MEMBER_EXPIRED(6001)。
 */
@ApiTags('门窗利账-业务')
@Public()
@UseGuards(LedgerJwtGuard, LedgerMembershipGuard)
@Controller('l')
export class LedgerBizController {
  constructor(private readonly svc: LedgerService) {}

  // ── 订单 ──
  @Get('orders')
  listOrders(@CurrentLedgerUser() u: LedgerAuthUser, @Query() q: OrderQueryDto) {
    return this.svc.listOrders(u.id, q)
  }
  @Post('orders')
  createOrder(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateLedgerOrderDto) {
    return this.svc.createOrder(u.id, dto)
  }
  @Get('orders/:id')
  getOrder(@CurrentLedgerUser() u: LedgerAuthUser, @Param('id') id: string) {
    return this.svc.getOrder(u.id, id)
  }
  @Patch('orders/:id')
  updateOrder(
    @CurrentLedgerUser() u: LedgerAuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLedgerOrderDto,
  ) {
    return this.svc.updateOrder(u.id, id, dto)
  }
  @Delete('orders/:id')
  deleteOrder(@CurrentLedgerUser() u: LedgerAuthUser, @Param('id') id: string) {
    return this.svc.deleteOrder(u.id, id)
  }

  // ── 客户 ──
  @Get('customers')
  listCustomers(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.listCustomers(u.id)
  }
  @Post('customers')
  createCustomer(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateLedgerCustomerDto) {
    return this.svc.createCustomer(u.id, dto)
  }
  // 无档客户（订单自动生成）点击进入时：按姓名幂等建档 + 关联同名历史订单
  @Post('customers/ensure')
  ensureCustomer(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateLedgerCustomerDto) {
    return this.svc.ensureCustomerByName(u.id, dto.name)
  }
  @Get('customers/:id')
  getCustomer(@CurrentLedgerUser() u: LedgerAuthUser, @Param('id') id: string) {
    return this.svc.getCustomer(u.id, id)
  }
  @Patch('customers/:id')
  updateCustomer(
    @CurrentLedgerUser() u: LedgerAuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLedgerCustomerDto,
  ) {
    return this.svc.updateCustomer(u.id, id, dto)
  }
  @Delete('customers/:id')
  deleteCustomer(@CurrentLedgerUser() u: LedgerAuthUser, @Param('id') id: string) {
    return this.svc.deleteCustomer(u.id, id)
  }

  // ── 统计 ──
  @Get('stats/overview')
  overview(@CurrentLedgerUser() u: LedgerAuthUser, @Query('period') period?: string) {
    return this.svc.overview(u.id, period || 'month')
  }
  @Get('stats/monthly')
  monthly(@CurrentLedgerUser() u: LedgerAuthUser, @Query('year') year?: string) {
    return this.svc.monthlySeries(u.id, year ? Number(year) : undefined)
  }

  @Get('stats/series')
  series(@CurrentLedgerUser() u: LedgerAuthUser, @Query('granularity') granularity?: string) {
    return this.svc.series(u.id, granularity || 'month')
  }

  // ── 经营目标 ──
  @Get('goal')
  getGoal(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.getGoal(u.id)
  }
  @Put('goal')
  setGoal(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: UpdateLedgerGoalDto) {
    return this.svc.setGoal(u.id, dto)
  }

  // ── 优化下料·云端历史方案（按 userId 隔离）──
  @Get('cut/plans')
  listCutPlans(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.listCutPlans(u.id)
  }
  @Post('cut/plans')
  createCutPlan(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateCutPlanDto) {
    return this.svc.createCutPlan(u.id, dto)
  }
  @Put('cut/plans/:id')
  updateCutPlan(
    @CurrentLedgerUser() u: LedgerAuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCutPlanDto,
  ) {
    return this.svc.updateCutPlan(u.id, id, dto)
  }
  @Delete('cut/plans/:id')
  deleteCutPlan(@CurrentLedgerUser() u: LedgerAuthUser, @Param('id') id: string) {
    return this.svc.deleteCutPlan(u.id, id)
  }
}
