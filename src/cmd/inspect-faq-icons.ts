import { prisma } from "../db";

async function main() {
    console.log("Fetching faq_category and mapped icons...");
    const categories = await prisma.faq_category.findMany({
        include: {
            icon: true
        }
    });
    
    console.log("Categories and Icons:");
    for (const cat of categories) {
        console.log(`- Category: "${cat.name}"`);
        console.log(`  Icon ID: ${cat.icon_id}`);
        console.log(`  Icon Name: ${cat.icon?.name}`);
        console.log(`  Icon Bucket Key: ${cat.icon?.bucket_key}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
