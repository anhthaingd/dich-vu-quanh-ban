import { Body, Controller, Get, Header, Headers, HttpCode, HttpException, Inject, Post, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthService } from './auth.service.js';
import { credentials, refreshInput } from './auth.input.js';

@Controller()
export class AuthController {
  // Local single-process limiter; never trust X-Forwarded-For from the client.
  private readonly attempts = new Map<string, { count: number; reset: number }>();
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  private limit(req: IncomingMessage, res: ServerResponse) {
    const now = Date.now();
    for (const [key, value] of this.attempts) if (value.reset <= now) this.attempts.delete(key);
    const key = req.socket.remoteAddress ?? 'unknown';
    const entry = this.attempts.get(key) ?? { count: 0, reset: now + 60000 };
    if (entry.count >= 10 || (!this.attempts.has(key) && this.attempts.size >= 10000)) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.reset - now) / 1000)));
      throw new HttpException('Rate limited', 429);
    }
    entry.count++; this.attempts.set(key, entry);
  }
  @Post('auth/register') @Header('Cache-Control', 'no-store')
  register(@Body() body: unknown, @Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    this.limit(req, res); const input = credentials(body, true);
    return this.auth.register(input.email, input.password, input.name);
  }
  @Post('auth/login') @HttpCode(200) @Header('Cache-Control', 'no-store')
  login(@Body() body: unknown, @Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    this.limit(req, res); const input = credentials(body);
    return this.auth.login(input.email, input.password);
  }
  @Post('auth/refresh') @HttpCode(200) @Header('Cache-Control', 'no-store')
  refresh(@Body() body: unknown, @Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    this.limit(req, res); return this.auth.refresh(refreshInput(body));
  }
  @Post('auth/logout') @HttpCode(200) @Header('Cache-Control', 'no-store')
  logout(@Headers('authorization') header: string | undefined) { return this.auth.logout(header); }
  @Get('me') @Header('Cache-Control', 'no-store')
  async me(@Headers('authorization') header: string | undefined) { return (await this.auth.authenticate(header,undefined,true)).user; }
}
