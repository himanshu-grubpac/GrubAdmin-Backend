import { prisma } from "../db";

async function main() {
    console.log("=== VERTICALS ===");
    const verticals = await prisma.vertical.findMany();
    console.log(JSON.stringify(verticals, null, 2));

    console.log("=== ICONS ===");
    const icons = await prisma.icon.findMany();
    console.log(JSON.stringify(icons, null, 2));

    console.log("=== FAQ CATEGORIES ===");
    const categories = await prisma.faq_category.findMany({
        include: { icon: true }
    });
    console.log(JSON.stringify(categories, null, 2));

    console.log("=== FAQ QUESTIONS ===");
    const questions = await prisma.faq_question.findMany();
    console.log(JSON.stringify(questions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
