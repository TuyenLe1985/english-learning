// apps/api/src/auth/roles.decorator.ts
// Defines the @Roles() decorator and ROLES_KEY metadata key for RolesGuard.
// Use string literals 'ADMIN' / 'STUDENT' — matches UserRole enum values in schema.
// Pitfall 3 (RESEARCH.md): UserRole enum is STUDENT | ADMIN, never USER.

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a controller method or class.
 * Usage: @Roles('ADMIN') or @Roles('STUDENT', 'ADMIN')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
