/**
 * Seeds DEMO DATA only: one curriculum -> school level -> grade -> subject
 * -> semester -> unit -> concept (Middle School Grade 1 Math, Korea 2022
 * curriculum) with a lesson and a couple of questions, plus a demo student
 * (with profile) and a demo parent already linked. Safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  // --- DEMO DATA: curriculum hierarchy ---------------------------------
  const curriculum = await prisma.curriculum.create({
    data: { country: "KR", name: "DEMO DATA — 2022 Revised National Curriculum" },
  });

  const schoolLevel = await prisma.schoolLevel.create({
    data: { curriculumId: curriculum.id, name: "Middle School" },
  });

  const grade = await prisma.grade.create({
    data: { schoolLevelId: schoolLevel.id, name: "Grade 1", level: 1 },
  });

  const subject = await prisma.subject.create({
    data: { gradeId: grade.id, nameKo: "수학", nameEn: "Math" },
  });

  const semester = await prisma.semester.create({
    data: { subjectId: subject.id, name: "1st Semester", order: 1 },
  });

  const unit = await prisma.unit.create({
    data: {
      semesterId: semester.id,
      nameKo: "정수와 유리수",
      nameEn: "Integers and Rational Numbers",
      order: 1,
    },
  });

  const additionConcept = await prisma.concept.create({
    data: {
      unitId: unit.id,
      titleKo: "정수의 덧셈",
      titleEn: "Adding integers",
      description: "Adding positive and negative integers on a number line.",
      difficulty: 1,
      estimatedMinutes: 15,
      lessons: {
        create: [
          {
            titleKo: "정수의 덧셈 소개",
            titleEn: "Introduction to adding integers",
            order: 1,
            content: {
              steps: [
                "Same sign: add the absolute values, keep the sign.",
                "Different signs: subtract the smaller absolute value from the larger, keep the sign of the larger.",
              ],
            },
          },
        ],
      },
      questions: {
        create: [
          {
            type: "PRACTICE",
            prompt: "(-3) + 5 = ?",
            difficulty: 1,
            explanation: "Different signs: 5 - 3 = 2, and 5 has the larger absolute value, so the result is positive.",
            choices: {
              create: [
                { text: "2", isCorrect: true },
                { text: "-2", isCorrect: false },
                { text: "8", isCorrect: false },
                { text: "-8", isCorrect: false },
              ],
            },
          },
          {
            type: "HOMEWORK",
            prompt: "(-7) + (-2) = ?",
            difficulty: 1,
            explanation: "Same sign: add the absolute values (7 + 2 = 9) and keep the negative sign.",
            choices: {
              create: [
                { text: "-9", isCorrect: true },
                { text: "9", isCorrect: false },
                { text: "-5", isCorrect: false },
                { text: "5", isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  });

  const multiplyConcept = await prisma.concept.create({
    data: {
      unitId: unit.id,
      titleKo: "유리수의 곱셈",
      titleEn: "Multiplying rational numbers",
      description: "Multiplying signed fractions and decimals.",
      difficulty: 2,
      estimatedMinutes: 20,
    },
  });

  await prisma.conceptPrerequisite.create({
    data: { conceptId: multiplyConcept.id, prerequisiteId: additionConcept.id },
  });

  // --- DEMO DATA: users --------------------------------------------------
  const passwordHash = await argon2.hash("demo-password");

  const studentUser = await prisma.user.upsert({
    where: { email: "demo.student@example.com" },
    update: {},
    create: {
      email: "demo.student@example.com",
      passwordHash,
      role: "STUDENT",
      studentProfile: {
        create: { displayName: "DEMO DATA — Student", gradeId: grade.id },
      },
    },
    include: { studentProfile: true },
  });

  const parentUser = await prisma.user.upsert({
    where: { email: "demo.parent@example.com" },
    update: {},
    create: { email: "demo.parent@example.com", passwordHash, role: "PARENT" },
  });

  await prisma.parentStudentLink.upsert({
    where: {
      parentId_studentId: { parentId: parentUser.id, studentId: studentUser.studentProfile!.id },
    },
    update: {},
    create: {
      parentId: parentUser.id,
      studentId: studentUser.studentProfile!.id,
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  console.log(`Seeded curriculum "${curriculum.name}" with concepts: ${additionConcept.titleEn}, ${multiplyConcept.titleEn}`);
  console.log("Seeded demo student:", studentUser.email);
  console.log("Seeded demo parent:", parentUser.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
