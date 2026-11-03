import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@pinnacle/contracts';
import { Request } from 'express';

/**
 * CustomerOwnershipGuard — enforces that a customer can only access their own
 * resources. Staff users with 'customers:view:directory' bypass this check.
 *
 * Expects the route parameter to be named `customerId`.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, CustomerOwnershipGuard)
 *   @Get('customers/:customerId/addresses')
 *   getAddresses(@Param('customerId') id: string) { ... }
 */
@Injectable()
export class CustomerOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser; params: Record<string, string> }>();

    const user = request.user;

    // Staff with directory access bypass the ownership check
    if (user.permissions.includes('customers:view:directory')) {
      return true;
    }

    const resourceCustomerId = request.params['customerId'];

    if (!resourceCustomerId) {
      // No customerId param on route — guard is a no-op (misconfigured route)
      return true;
    }

    if (user.customerId !== resourceCustomerId) {
      throw new ForbiddenException('You do not have permission to access this customer resource');
    }

    return true;
  }
}
