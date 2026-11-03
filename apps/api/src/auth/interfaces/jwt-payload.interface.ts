import { AuthenticatedUser } from '@pinnacle/contracts';

/**
 * Shape of the JWT payload this API issues and validates.
 * Must match AuthenticatedUser from @pinnacle/contracts exactly so
 * the frontend type-checks correctly against the same definition.
 */
export type JwtPayload = AuthenticatedUser;
