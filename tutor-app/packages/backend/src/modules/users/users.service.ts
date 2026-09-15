import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  /** A parent creates a pending invite; nothing links automatically. */
  async createInvite(parentId: string, studentEmail: string) {
    const student = await this.prisma.user.findUnique({ where: { email: studentEmail } });
    if (!student || student.role !== "STUDENT") {
      throw new Error("No student account found for that email");
    }

    return this.prisma.parentStudentLink.create({
      data: {
        parentId,
        studentId: student.id,
        inviteCode: generateInviteCode(),
        status: "PENDING",
      },
    });
  }

  /** The student explicitly approves the link using the invite code. */
  async approveInvite(studentId: string, inviteCode: string) {
    const link = await this.prisma.parentStudentLink.findUnique({ where: { inviteCode } });
    if (!link || link.studentId !== studentId) {
      throw new Error("Invalid invite code");
    }
    if (link.status !== "PENDING") {
      throw new Error("Invite is not pending");
    }

    return this.prisma.parentStudentLink.update({
      where: { id: link.id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
  }

  async revokeLink(requesterId: string, linkId: string) {
    const link = await this.prisma.parentStudentLink.findUniqueOrThrow({ where: { id: linkId } });
    if (link.parentId !== requesterId && link.studentId !== requesterId) {
      throw new Error("Not authorized to revoke this link");
    }

    return this.prisma.parentStudentLink.update({
      where: { id: linkId },
      data: { status: "REVOKED" },
    });
  }

  async listLinkedStudents(parentId: string) {
    return this.prisma.parentStudentLink.findMany({
      where: { parentId, status: "APPROVED" },
      include: { student: { select: { id: true, name: true, email: true } } },
    });
  }

  async listLinkedParents(studentId: string) {
    return this.prisma.parentStudentLink.findMany({
      where: { studentId, status: "APPROVED" },
      include: { parent: { select: { id: true, name: true, email: true } } },
    });
  }
}
