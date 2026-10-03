import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { StaffService } from '../staff/staff.service.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type.js';
import type { LoginDto } from './dto/login.dto.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const DUMMY_PASSWORD_HASH =
  '$2b$12$Ef5RdkvLxncY5oo1Nmffxuv47ZPe2E2/mJYUHE/ptCK7ttgbZ1vhm';

export type LoginResult = {
  accessToken: string;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly staffService: StaffService,
    private readonly jwtService: JwtService,
  ) {}

  async login(credentials: LoginDto): Promise<LoginResult> {
    const loginRecord = await this.staffService.findLoginRecordByEmail(
      credentials.email,
    );
    const passwordMatches = await bcrypt.compare(
      credentials.password,
      loginRecord?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!loginRecord || !loginRecord.isActive || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await this.staffService.findActiveAuthenticatedUserById(
      loginRecord.id,
    );

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id }),
      user,
    };
  }
}
