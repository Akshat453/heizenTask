import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { BillingQueryService } from './services/billing-query.service.js';
import { InvoiceCreationService } from './services/invoice-creation.service.js';
import { InvoiceLifecycleService } from './services/invoice-lifecycle.service.js';
import { CreateInvoiceDto, InvoiceQueryDto } from './dto/billing.dto.js';

@Controller()
export class BillingController {
  constructor(
    private readonly queryService: BillingQueryService,
    private readonly creationService: InvoiceCreationService,
    private readonly lifecycleService: InvoiceLifecycleService,
  ) {}

  @Get('companies/:id/billing/uninvoiced')
  @RequirePermissions('billing.read')
  getUninvoicedOrders(
    @IdParam() companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.queryService.getUninvoicedOrders(companyId, query);
  }

  @Get('invoices')
  @RequirePermissions('billing.read')
  listInvoices(@Query() query: InvoiceQueryDto) {
    return this.queryService.listInvoices(query);
  }

  @Get('invoices/:id')
  @RequirePermissions('billing.read')
  getInvoiceDetail(@IdParam() invoiceId: string) {
    return this.queryService.getInvoiceDetail(invoiceId);
  }

  @Post('invoices')
  @RequirePermissions('billing.manage')
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.creationService.createInvoice(dto, staffUserId);
  }

  @Post('invoices/:id/pay')
  @RequirePermissions('billing.manage')
  markPaid(
    @IdParam() invoiceId: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.markPaid(invoiceId, staffUserId);
  }
}
