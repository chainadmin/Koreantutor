/**
 * Seeds DEMO DATA only: one subject (Middle School Grade 1 Math, Korea 2022
 * curriculum) with a couple of units/concepts, plus a demo student + parent
 * already linked. Safe to run repeatedly (upserts on unique keys).
 */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  // --- DEMO DATA: curriculum -------------------------------------------------
  const subject = await prisma.subject.upsert({
    where: {
      name_curriculumYear_grade: {
        name: "Math",
        curriculumYear: "Korea 2022",
        grade: "Middle School Grade 1",
      },
    },
    update: {},
    create: {
      name: "Math",
      curriculumYear: "Korea 2022",
      grade: "Middle School Grade 1",
    },
  });

  const unit = await prisma.unit.create({
    data: {
      subjectId: subject.id,
      title: "DEMO DATA — Integers and Rational Numbers",
      order: 1,
      concepts: {
        create: [
          {
            title: "DEMO DATA — Adding integers",
            description: "Adding positive and negative integers on a number line.",
            order: 1,
            difficulty: 1,
          },
          {
            title: "DEMO DATA — Multiplying rational numbers",
            description: "Multiplying signed fractions and decimals.",
            order: 2,
            difficulty: 2,
          },
        ],
      },
    },
    include: { concepts: true },
  });

  // --- DEMO DATA: users --------------------------------------------------
  const passwordHash = await argon2.hash("demo-password");

  const student = await prisma.user.upsert({
    where: { email: "demo.student@example.com" },
    update: {},
    create: {
      email: "demo.student@example.com",
      passwordHash,
      role: "STUDENT",
      name: "DEMO DATA — Student",
      locale: "ko",
    },
  });

  const parent = await prisma.user.upsert({
    where: { email: "demo.parent@example.com" },
    update: {},
    create: {
      email: "demo.parent@example.com",
      passwordHash,
      role: "PARENT",
      name: "DEMO DATA — Parent",
      locale: "ko",
    },
  });

  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    update: {},
    create: {
      parentId: parent.id,
      studentId: student.id,
      inviteCode: "DEMO-CODE-0001",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  console.log(`Seeded subject "${subject.name}" with ${unit.concepts.length} concepts.`);
  console.log("Seeded demo student:", student.email);
  console.log("Seeded demo parent:", parent.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
