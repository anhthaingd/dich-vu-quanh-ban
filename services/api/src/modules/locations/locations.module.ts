import { Module, type DynamicModule } from '@nestjs/common';
import { GeoapifyProvider } from '../../integrations/maps/geoapify.js';
import { LocationLimit } from './locations.limit.js';
import { LocationsController } from './locations.controller.js';
@Module({})
export class LocationsModule {
  static register(key?:string):DynamicModule {return {module:LocationsModule,controllers:[LocationsController],providers:[{provide:GeoapifyProvider,useFactory:()=>new GeoapifyProvider(key)},{provide:LocationLimit,useFactory:()=>new LocationLimit()}]};}
}
