import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { DELIVERY_VERTICAL_NAME } from "@/configs/constants.ts";

export const fixDeliveryFaqs = async () => {
    logger.info("Starting fix-delivery-faqs script...");

    // 1. Get the Delivery Vertical
    const vertical = await prisma.vertical.findUnique({
        where: { name: DELIVERY_VERTICAL_NAME },
    });

    if (!vertical) {
        logger.error("Delivery vertical not found.");
        return;
    }

    const verticalId = vertical.id;

    // 2. Remove extra categories
    const categoriesToRemove = ["Getting started", "Billing & plans"];
    for (const catName of categoriesToRemove) {
        const cat = await prisma.faq_category.findFirst({
            where: {
                vertical_id: verticalId,
                name: catName,
            },
        });

        if (cat) {
            logger.info(`Deleting extra category: ${catName}`);
            await prisma.faq_category.delete({
                where: { id: cat.id },
            });
        }
    }

    // 3. Reorder remaining categories
    const targetOrder = [
        "Setup & Installation",
        "Troubleshooting",
        "Device Connection",
        "Alerts & Notification",
        "Account & App Support",
        "Others",
    ];

    for (let i = 0; i < targetOrder.length; i++) {
        const catName = targetOrder[i];
        const cat = await prisma.faq_category.findFirst({
            where: {
                vertical_id: verticalId,
                name: catName,
            },
        });

        if (cat) {
            await prisma.faq_category.update({
                where: { id: cat.id },
                data: { index: i + 1 },
            });
            logger.info(`Reordered category '${catName}' to index ${i + 1}`);
        }
    }

    // 4. Seed Troubleshooting Questions
    const troubleshootingCat = await prisma.faq_category.findFirst({
        where: {
            vertical_id: verticalId,
            name: "Troubleshooting",
        },
    });

    if (troubleshootingCat) {
        const questionsToSeed = [
            {
                question: "Why is my box offline?",
                answer: "Your box might be offline due to power issues or network connectivity loss. Please ensure the box is powered on and within range of a stable network.",
            },
            {
                question: "How do I reconnect my box?",
                answer: "To reconnect your box, follow these simple steps:\n\n1. Make sure your box is powered on and within range of your network.\n\n2. Go to the home page in the app.\n\n3. Press the \"Try to connect\" button and connect the device.\n\nIf the connection still fails, double-check your network settings or restart your box.",
            },
            {
                question: "What should I do if I'm not receiving alerts?",
                answer: "If you are not receiving alerts, follow the following steps:\n\n1. Check Your Connection:\nEnsure your phone has a stable internet connection and that the app's notifications are enabled in your device settings.\n\n2. Review Alert Preferences:\nOpen the app's Settings and verify that your Alert Preferences are configured to receive alerts.\n\n3. Reconnect or Restart:\nTry reconnecting your box or restarting the app to refresh the connection.\n\nIf you still aren't receiving alerts, please reach out to support for further assistance.",
            },
            {
                question: "Is there a way to test my connection?",
                answer: "Yes. From the app's home screen, you can check the connection status indicator. If it shows 'Connected', your connection is active and working properly.",
            },
        ];

        for (const q of questionsToSeed) {
            // Check if question already exists to prevent duplicates
            const existingQ = await prisma.faq_question.findFirst({
                where: { question: q.question },
            });

            if (!existingQ) {
                const newQuestion = await prisma.faq_question.create({
                    data: {
                        question: q.question,
                        answer: q.answer,
                        publishing_status: "published",
                        status: "active",
                    },
                });

                await prisma.faq_question_category.create({
                    data: {
                        question_id: newQuestion.id,
                        category_id: troubleshootingCat.id,
                    },
                });
                logger.info(`Seeded question: '${q.question}'`);
            } else {
                logger.info(`Question already exists: '${q.question}'`);
            }
        }
    } else {
        logger.error("Troubleshooting category not found. Cannot seed questions.");
    }

    logger.info("Finished fix-delivery-faqs script.");
};

if (import.meta.main) {
    fixDeliveryFaqs()
        .then(() => process.exit(0))
        .catch((error) => {
            logger.error(`Error in fixDeliveryFaqs: ${error}`);
            process.exit(1);
        });
}
