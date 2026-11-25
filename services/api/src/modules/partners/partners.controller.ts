import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Post,
  Put,
  Query
} from '@nestjs/common';
import { PartnersService } from './partners.service.js';
import { createInput, deactivationInput, editInput, type Edit } from './partners.input.js';
import { parseQuery } from '../catalog/catalog.query.js';
import { identifier, idempotencyKey, object } from '../accounts/accounts.input.js';
import { invalid } from './partners.errors.js';
import { SearchService } from '../search/search.service.js';
import { searchInput } from '../search/search.query.js';
@Controller('partners')
export class PartnersController {
  constructor(
    @Inject(PartnersService) private readonly service: PartnersService,
    @Inject(SearchService) private readonly search: SearchService
  ) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: Record<string, unknown>) {
    return this.search.list(searchInput(query));
  }
  @Get(':id/gallery')
  @Header('Cache-Control','no-store')
  gallery(@Headers('authorization')auth:string|undefined,@Param('id')id:string){return this.service.gallery(auth,identifier(id));}
  @Get(':id/management')
  @Header('Cache-Control', 'no-store')
  management(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string
  ) {
    return this.service.management(auth, identifier(id));
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  profile(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Query() query: Record<string, unknown>
  ) {
    object(query, ['locale']);
    return this.service.publicProfile(
      auth,
      identifier(id),
      parseQuery(query, 'skills').locale
    );
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  create(
    @Headers('authorization') auth: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown
  ) {
    return this.service.create(auth, createInput(body), idempotencyKey(key));
  }
  @Post(':id/deactivation')
  @Header('Cache-Control', 'no-store')
  deactivate(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown){
    return this.service.deactivate(auth,identifier(id),deactivationInput(body),idempotencyKey(key));
  }
  @Put(':id/:action')
  @Header('Cache-Control', 'no-store')
  edit(
    @Headers('authorization') auth: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('id') id: string,
    @Param('action') action: string,
    @Body() body: unknown
  ) {
    if (
      ![
        'gallery',
        'profile',
        'skills',
        'service-areas',
        'locations',
        'publication',
        'availability'
      ].includes(action)
    )
      throw invalid('PARTNER_EDIT_ACTION_INVALID', 'action');
    return this.service.edit(
      auth,
      identifier(id),
      editInput(action as Edit['action'], body),
      idempotencyKey(key)
    );
  }
}
