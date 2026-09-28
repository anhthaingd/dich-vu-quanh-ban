import { Controller, Get, Inject, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { parseQuery } from './catalog.query.js';

@Controller()
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly service: CatalogService) {}
  @Get('categories') categories(@Query() query: Record<string, unknown>) {
    return this.service.list('categories', parseQuery(query, 'categories'));
  }
  @Get('skills') skills(@Query() query: Record<string, unknown>) {
    return this.service.list('skills', parseQuery(query, 'skills'));
  }
}
