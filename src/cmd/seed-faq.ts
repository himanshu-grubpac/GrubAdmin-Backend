import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { VERTICAL_IDS, ICON_IDS } from "./seed-verticals";

export const FAQ_CATEGORY_IDS = {
  GETTING_STARTED: "seed-faq-cat-getting-started",
  TROUBLESHOOTING: "seed-faq-cat-troubleshooting",
  BILLING: "seed-faq-cat-billing",
  MEDICAL_FAQ: "seed-faq-cat-medical",
} as const;

export const FAQ_QUESTION_IDS = {
  GS_Q1: "seed-faq-q-gs-1",
  GS_Q2: "seed-faq-q-gs-2",
  TROUBLE_Q1: "seed-faq-q-tr-1",
  TROUBLE_Q2: "seed-faq-q-tr-2",
  BILL_Q1: "seed-faq-q-bill-1",
  MED_Q1: "seed-faq-q-med-1",
} as const;

interface CategorySeed {
  id: string;
  name: string;
  name_normalized: string;
  vertical_id: string;
  icon_id: string | null;
  description: string;
  index: number;
}

interface QuestionSeed {
  id: string;
  question: string;
  answer: string;
  category_key: keyof typeof FAQ_CATEGORY_IDS;
  publishing_status: "draft" | "published";
}

const CATEGORIES: CategorySeed[] = [
  {
    id: FAQ_CATEGORY_IDS.GETTING_STARTED,
    name: "Getting Started",
    name_normalized: "getting started",
    vertical_id: VERTICAL_IDS.DELIVERY,
    icon_id: ICON_IDS.GENERAL,
    description: "Get started with your GrubPac box and account setup.",
    index: 1,
  },
  {
    id: FAQ_CATEGORY_IDS.TROUBLESHOOTING,
    name: "Troubleshooting",
    name_normalized: "troubleshooting",
    vertical_id: VERTICAL_IDS.DELIVERY,
    icon_id: ICON_IDS.UTILITIES,
    description: "Resolve common issues with your hardware and software.",
    index: 2,
  },
  {
    id: FAQ_CATEGORY_IDS.BILLING,
    name: "Billing & Plans",
    name_normalized: "billing & plans",
    vertical_id: VERTICAL_IDS.DELIVERY,
    icon_id: ICON_IDS.FINANCE,
    description: "Information about pricing, plans, and invoices.",
    index: 3,
  },
  {
    id: FAQ_CATEGORY_IDS.MEDICAL_FAQ,
    name: "Medical Device FAQ",
    name_normalized: "medical device faq",
    vertical_id: VERTICAL_IDS.MEDICAL,
    icon_id: ICON_IDS.MEDICAL_CROSS,
    description: "FAQ specific to medical-grade box usage and compliance.",
    index: 1,
  },
];

const QUESTIONS: QuestionSeed[] = [
  {
    id: FAQ_QUESTION_IDS.GS_Q1,
    question: "How do I activate my GrubPac box?",
    answer: "Press and hold the power button for 3 seconds. The LED will blink green once connected.",
    category_key: "GETTING_STARTED",
    publishing_status: "published",
  },
  {
    id: FAQ_QUESTION_IDS.GS_Q2,
    question: "How do I assign a box to a delivery employee?",
    answer: "Navigate to the employee profile, select 'Assign Box', and choose from the available inventory.",
    category_key: "GETTING_STARTED",
    publishing_status: "published",
  },
  {
    id: FAQ_QUESTION_IDS.TROUBLE_Q1,
    question: "My box is not connecting to GPS. What should I do?",
    answer: "Ensure the box is outdoors with clear sky view. Try a hard reset by holding the power button for 10 seconds.",
    category_key: "TROUBLESHOOTING",
    publishing_status: "published",
  },
  {
    id: FAQ_QUESTION_IDS.TROUBLE_Q2,
    question: "Temperature warnings keep appearing",
    answer: "Check that the box doors are properly sealed. If the issue persists, contact support.",
    category_key: "TROUBLESHOOTING",
    publishing_status: "published",
  },
  {
    id: FAQ_QUESTION_IDS.BILL_Q1,
    question: "How is billing calculated per box?",
    answer: "Billing is done monthly per active box. Enterprise plans have custom pricing.",
    category_key: "BILLING",
    publishing_status: "published",
  },
  {
    id: FAQ_QUESTION_IDS.MED_Q1,
    question: "Is the medical box FDA approved?",
    answer: "Yes, our medical-grade boxes meet FDA storage requirements for temperature-sensitive medications.",
    category_key: "MEDICAL_FAQ",
    publishing_status: "published",
  },
];

export const seedFaq = async (): Promise<void> => {
  logger.info("Seeding FAQ...");

  const categoryIdMap: Record<string, string> = {};

  for (const catDef of CATEGORIES) {
    const cat = await prisma.faq_category.upsert({
      where: {
        vertical_id_name_normalized: {
          vertical_id: catDef.vertical_id,
          name_normalized: catDef.name_normalized,
        },
      },
      update: {
        name: catDef.name,
        description: catDef.description,
        icon_id: catDef.icon_id,
        index: catDef.index,
      },
      create: catDef,
    });
    categoryIdMap[catDef.id] = cat.id;
    logger.info(`  FAQ category "${catDef.name}" ready.`);
  }

  for (const qDef of QUESTIONS) {
    const existing = await prisma.faq_question.findUnique({ where: { id: qDef.id } });
    if (!existing) {
      const question = await prisma.faq_question.create({
        data: {
          id: qDef.id,
          question: qDef.question,
          answer: qDef.answer,
          publishing_status: qDef.publishing_status,
        },
      });

      const constantId = FAQ_CATEGORY_IDS[qDef.category_key];
      const actualCategoryId = categoryIdMap[constantId];

      await prisma.faq_question_category.create({
        data: {
          question_id: question.id,
          category_id: actualCategoryId,
        },
      });

      logger.info(`  FAQ question "${qDef.question.substring(0, 40)}..." created.`);
    } else {
      logger.info(`  FAQ question already exists.`);
    }
  }

  logger.info(`Seeded ${CATEGORIES.length} categories and ${QUESTIONS.length} questions.`);
};
