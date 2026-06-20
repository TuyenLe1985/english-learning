// apps/api/src/auth/roles.guard.ts
// RolesGuard reads the @Roles() metadata and compares req.user.role (JWT-decoded
// by JwtAuthGuard) against the required roles.
//
// Security (T-08-08): role is read from server-decoded JWT payload (not client-asserted).
// JwtAuthGuard runs before RolesGuard via @UseGuards(JwtAuthGuard, RolesGuard) ordering.
//
// Pitfall 3: Use 'ADMIN' / 'STUDENT' literals — UserRole enum is STUDENT | ADMIN (not USER).

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → allow any authenticated user through
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: { role?: string } }>();

    // user.role is the JWT-decoded role ('ADMIN' | 'STUDENT')
    // Returns false if user is missing or role doesn't match — results in 403 from NestJS
    return requiredRoles.includes(user?.role ?? '');
  }
}
