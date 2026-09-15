import type { PrismaClient } from "@prisma/client";

/**
 * Student-scoped services (mastery, homework, tutoring) key off
 * StudentProfile.id, while the JWT's `sub` is always User.id. Routes
 * authenticated as STUDENT must resolve this before calling into them.
 */
export async function resolveStudentProfileId(prisma: PrismaClient, userId: string): Promise<string> {
  const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId } });
  return profile.id;
}
