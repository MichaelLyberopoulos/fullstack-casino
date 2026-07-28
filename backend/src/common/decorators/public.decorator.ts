import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * [Question 4 — Security] Marks a route as exempt from the global JwtAuthGuard.
 * Everything is protected by default; public routes must opt out explicitly.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
