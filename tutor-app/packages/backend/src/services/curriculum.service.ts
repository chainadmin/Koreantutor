import type { PrismaClient } from "@prisma/client";

/**
 * All curriculum content is read from the DB — never hard-coded here.
 * Hierarchy: Curriculum -> SchoolLevel -> Grade -> Subject -> Semester -> Unit -> Concept -> LearningObjective.
 */
export class CurriculumService {
  constructor(private readonly prisma: PrismaClient) {}

  async listCurricula() {
    return this.prisma.curriculum.findMany({ orderBy: { name: "asc" } });
  }

  async listGrades(schoolLevelId?: string) {
    return this.prisma.grade.findMany({
      where: schoolLevelId ? { schoolLevelId } : undefined,
      orderBy: { level: "asc" },
    });
  }

  async getGradeTree(gradeId: string) {
    return this.prisma.grade.findUniqueOrThrow({
      where: { id: gradeId },
      include: {
        subjects: {
          include: {
            semesters: {
              orderBy: { order: "asc" },
              include: {
                units: {
                  orderBy: { order: "asc" },
                  include: { concepts: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async getConcept(conceptId: string) {
    return this.prisma.concept.findUniqueOrThrow({
      where: { id: conceptId },
      include: {
        learningObjectives: true,
        unit: { include: { semester: { include: { subject: true } } } },
      },
    });
  }

  async listConceptsForUnit(unitId: string) {
    return this.prisma.concept.findMany({ where: { unitId } });
  }
}
