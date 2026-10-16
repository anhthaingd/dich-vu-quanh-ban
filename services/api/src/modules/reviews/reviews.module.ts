import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthService } from '../auth/auth.service.js';
import { Cursor } from '../../common/http/cursor.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';
@Module({})
export class ReviewsModule {
 static register(secret:string):DynamicModule { return {module:ReviewsModule,controllers:[ReviewsController],providers:[{provide:ReviewsService,inject:[Pool,AuthService],useFactory:(pool:Pool,auth:AuthService)=>new ReviewsService(pool,auth,new Cursor(secret))}]}; }
}
