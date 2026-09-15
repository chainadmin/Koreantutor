import argon2 from "argon2";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { PrismaClient, Role } from "@prisma/client";
import { env } from "../../config/env";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(params: { email: string; password: string; name: string; role: Role; locale?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: params.email } });
    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = await argon2.hash(params.password);
    const user = await this.prisma.user.create({
      data: {
        email: params.email,
        passwordHash,
        name: params.name,
        role: params.role,
        locale: params.locale ?? "ko",
      },
    });

    return this.issueTokens(user.id, user.role);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new Error("Invalid credentials");
    }

    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { sub: string };
    } catch {
      throw new Error("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new Error("Refresh token expired or revoked");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });

    // Rotate: revoke the used refresh token, issue a new pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string, role: Role): Promise<AuthTokens> {
    const accessToken = jwt.sign({ sub: userId, role }, env.jwtAccessSecret, {
      expiresIn: env.accessTokenTtl as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign({ sub: userId }, env.jwtRefreshSecret, {
      expiresIn: `${env.refreshTokenTtlDays}d` as jwt.SignOptions["expiresIn"],
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
