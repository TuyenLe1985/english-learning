// apps/api/src/auth/jwt-auth.guard.ts
// Source: https://authjs.dev/reference/core/jwt + community verification via GitHub discussions #9133, #11811
//
// IMPORTANT: This guard implements CanActivate directly (NOT extending AuthGuard('jwt')).
// Auth.js v5 issues JWE (A256CBC-HS512 encrypted) tokens, not plain JWS tokens.
// passport-jwt's secretOrKey verify step fails on JWE tokens — use @auth/core/jwt decode instead.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode } from '@auth/core/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.slice(7);
    const secret = this.config.get<string>('NEXTAUTH_SECRET') ?? '';
    const isProd = this.config.get('NODE_ENV') === 'production';

    // Salt must match the cookie name used by Auth.js.
    // Dev: "authjs.session-token"  |  Prod: "__Secure-authjs.session-token"
    // Ref: RESEARCH Pitfall 2 — wrong salt causes HKDF to derive a different key
    const salt = isProd
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

    try {
      const payload = await decode({ token, secret, salt });
      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }
      // Attach decoded payload { userId, role, cefrLevel, email, ... } to request
      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Token decode failed');
    }
  }
}
