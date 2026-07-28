import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;

/**
 * [Question 4 — Security] bcrypt hash of a throwaway random string at the same
 * cost (12). Unknown-email logins compare against this so both failure paths
 * perform exactly one bcrypt compare — response timing cannot reveal whether
 * an email is registered. Not a secret: any valid cost-12 hash works.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$O9AwTZC4Pb.aJ7.d14zqcOx5Mkr919hQx4B8lRryC5O0zEnEsaLbO';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Question 3: registration. New users start with 20 coins (schema default). */
  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
        },
      });
      return this.buildAuthResponse(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = (e.meta?.target as string[] | undefined)?.join(', ');
        throw new ConflictException(
          target?.includes('email')
            ? 'An account with this email already exists'
            : 'This username is already taken',
        );
      }
      throw e;
    }
  }

  /**
   * Question 3: login. Identical error AND timing for wrong email vs wrong
   * password: the compare always runs (against a dummy hash when the email is
   * unknown), so latency cannot be used to enumerate registered emails.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildAuthResponse(user);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, balance: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, balance: user.balance.toFixed(2) };
  }

  private buildAuthResponse(user: {
    id: number;
    email: string;
    username: string;
    balance: Prisma.Decimal;
  }) {
    const { id, email, username } = user;
    const payload: JwtPayload = { sub: id, email, username };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id, email, username, balance: user.balance.toFixed(2) },
    };
  }
}
