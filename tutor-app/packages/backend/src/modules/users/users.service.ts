import type { PrismaClient } from "@prisma/client";

/**
 * Links always start PENDING and are approved by the student themselves —
 * never automatic. The approval check is scoped to the authenticated
 * student's own StudentProfile.id, so there is no separate invite-code
 * secret to leak or type in.
 */
export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  /** A parent requests a link to a student by the student's account email. */
  async requestLink(parentId: string, studentEmail: string) {
    const studentUser = await this.prisma.user.findUnique({
      where: { email: studentEmail },
      include: { studentProfile: true },
    });
    if (!studentUser || studentUser.role !== "STUDENT" || !studentUser.studentProfile) {
      throw new Error("No student account found for that email");
    }

    return this.prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: { parentId, studentId: studentUser.studentProfile.id },
      },
      update: {},
      create: {
        parentId,
        studentId: studentUser.studentProfile.id,
        status: "PENDING",
      },
    });
  }

  /** The student explicitly approves a pending link by its id. */
  async approveLink(studentProfileId: string, linkId: string) {
    const link = await this.prisma.parentStudentLink.findUniqueOrThrow({ where: { id: linkId } });
    if (link.studentId !== studentProfileId) {
      throw new Error("Not authorized to approve this link");
    }
    if (link.status !== "PENDING") {
      throw new Error("Link is not pending");
    }

    return this.prisma.parentStudentLink.update({
      where: { id: linkId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
  }

  async revokeLink(parentUserId: string, studentProfileId: string, linkId: string) {
    const link = await this.prisma.parentStudentLink.findUniqueOrThrow({ where: { id: linkId } });
    if (link.parentId !== parentUserId && link.studentId !== studentProfileId) {
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
      include: { student: { select: { id: true, displayName: true } } },
    });
  }

  async listPendingRequests(studentProfileId: string) {
    return this.prisma.parentStudentLink.findMany({
      where: { studentId: studentProfileId, status: "PENDING" },
      include: { parent: { select: { id: true, email: true } } },
    });
  }
}
