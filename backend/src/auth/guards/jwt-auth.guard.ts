import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Acesso não autorizado. Token JWT ausente, expirado ou inválido (RNF01).',
        )
      );
    }
    return user;
  }
}
