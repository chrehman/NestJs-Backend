import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';
import { UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

interface JWTPayload {
  id: number;
  name: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request?.headers?.authorization?.split('Bearer ')[1];
    try {
      if (token) {
        const payload = (await jwt.verify(
          token,
          process.env.JSON_TOKEN_SECRET,
        )) as JWTPayload;

        const user = await this.prismaService.user.findUnique({
          where: { id: payload.id },
        });

        if (!user) return false;
        if (roles.includes(user.userType)) {
          return true;
        } else {
          return false;
        }
      } else {
        request.user = null;
        return false;
      }
    } catch (error) {
      return false;
    }
  }
}
