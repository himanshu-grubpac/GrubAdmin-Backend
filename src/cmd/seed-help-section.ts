import { prisma } from "../db";
import { ulid } from "ulid";

const VERTICAL_ID = "01KR0DHRG48S8MT3J3WS1E00PD";

async function main() {
    console.log("Starting Help Section seeding sequence...");

    // Step 1: Verify Delivery vertical exists
    const vertical = await prisma.vertical.findUnique({
        where: { id: VERTICAL_ID }
    });

    if (!vertical) {
        throw new Error(`Vertical with ID ${VERTICAL_ID} not found. Please seed verticals first.`);
    }
    console.log(`Found active vertical: ${vertical.name} (${vertical.id})`);

    // Step 2: Cleanup existing support/help/FAQ tables to ensure re-runnability
    console.log("Cleaning up existing FAQ and support categories...");
    
    // Get all categories to delete mapping join records
    const categories = await prisma.faq_category.findMany({
        where: { vertical_id: VERTICAL_ID }
    });
    const categoryIds = categories.map(c => c.id);

    if (categoryIds.length > 0) {
        // Delete join table entries
        await prisma.faq_question_category.deleteMany({
            where: { category_id: { in: categoryIds } }
        });
        
        // Delete categories
        await prisma.faq_category.deleteMany({
            where: { id: { in: categoryIds } }
        });
    }

    // Delete questions that might be orphaned
    await prisma.faq_question.deleteMany({});

    // Clean up support icons to avoid duplicates (handle both legacy and new keys)
    const iconKeys = [
        "icons/gear.svg",
        "icons/suitcase-medical.svg",
        "icons/bluetooth-on.svg",
        "icons/exclamation-triangle.svg",
        "icons/user-shield.svg",
        "icons/question-circle.svg",
        "Support/Card/gear.svg",
        "Support/Card/suitcase-medical.svg",
        "Support/Card/bluetooth-on.svg",
        "Support/Card/exclamation-triangle.svg",
        "Support/Card/user-shield.svg",
        "Support/Card/question-circle.svg"
    ];
    await prisma.icon.deleteMany({
        where: { bucket_key: { in: iconKeys } }
    });

    console.log("Cleanup complete.");

    // Step 3: Seed icons
    console.log("\nSeeding icons for categories...");
    const seededIcons: Record<string, string> = {};

    const iconsToSeed = [
        { name: "Setup & Installation", key: "icons/gear.svg" },
        { name: "Troubleshooting", key: "icons/suitcase-medical.svg" },
        { name: "Device Connection", key: "icons/bluetooth-on.svg" },
        { name: "Alert & Notification", key: "icons/exclamation-triangle.svg" },
        { name: "Account & App Support", key: "icons/user-shield.svg" },
        { name: "Others", key: "icons/question-circle.svg" }
    ];

    for (const icon of iconsToSeed) {
        const record = await prisma.icon.create({
            data: {
                id: ulid(),
                name: icon.name,
                bucket_key: icon.key
            }
        });
        seededIcons[icon.name] = record.id;
        console.log(`  Seeded icon: ${icon.name} -> Key: ${icon.key} (ID: ${record.id})`);
    }

    // Step 4: Seed categories
    console.log("\nSeeding FAQ categories...");
    const categoryRecords: Record<string, string> = {};

    const categoriesToSeed = [
        { name: "Setup & Installation", iconName: "Setup & Installation", index: 1, desc: "GrubPac setup guides and hardware installation instructions." },
        { name: "Troubleshooting", iconName: "Troubleshooting", index: 2, desc: "Solve common hardware, battery, and zone heating/cooling issues." },
        { name: "Device Connection", iconName: "Device Connection", index: 3, desc: "Bluetooth, Cellular, and offline connectivity guidance." },
        { name: "Alert & Notification", iconName: "Alert & Notification", index: 4, desc: "Understanding and customizing notifications and alerts." },
        { name: "Account & App Support", iconName: "Account & App Support", index: 5, desc: "Update your profile, change settings, and report bugs." },
        { name: "Others", iconName: "Others", index: 6, desc: "General information, daily logs, and capacity expansion requests." }
    ];

    for (const cat of categoriesToSeed) {
        const record = await prisma.faq_category.create({
            data: {
                id: ulid(),
                name: cat.name,
                name_normalized: cat.name.trim().replace(/\s+/g, " ").toLowerCase(),
                icon_id: seededIcons[cat.iconName],
                vertical_id: VERTICAL_ID,
                description: cat.desc,
                status: "active",
                index: cat.index
            }
        });
        categoryRecords[cat.name] = record.id;
        console.log(`  Seeded category: ${cat.name} (Index: ${cat.index}, ID: ${record.id})`);
    }

    // Step 5: Seed questions & join entries
    console.log("\nSeeding FAQ questions and category mappings...");

    const faqsToSeed = [
        // Category 1: Setup & Installation
        {
            category: "Setup & Installation",
            question: "How do I set up my GrubPac box?",
            answer: "To set up your GrubPac box, plug the box into a power source using the provided charger, turn on the main power switch, and follow the on-screen prompts on the box's digital display or use the mobile app to sync."
        },
        {
            category: "Setup & Installation",
            question: "How to mount the box on a delivery vehicle?",
            answer: "Use the provided bracket mount and secure it to the delivery carrier rack. Ensure the locking screws are tightly closed and check that the anti-vibration rubber pads are in place before starting your route."
        },

        // Category 2: Troubleshooting
        {
            category: "Troubleshooting",
            question: "Why is my box not heating or cooling?",
            answer: "Please check if the dual-zone cables are plugged in securely. If the cables are fully inserted and the issue persists, connect the charger and verify that the battery level is above 15%. Contact support if it still fails to regulate temperature."
        },
        {
            category: "Troubleshooting",
            question: "What does the red blinking indicator mean?",
            answer: "A red blinking indicator means either the battery is critically low (below 15%) or there is an active sensor alert. Connect the charger immediately and verify the telemetry status in your portal."
        },

        // Category 3: Device Connection
        {
            category: "Device Connection",
            question: "How to connect the box via Bluetooth?",
            answer: "Turn on Bluetooth on your mobile phone, open the GrubPac Delivery App, navigate to the GrubPacs tab, and select 'Scan and Connect Box'. Select your box display ID (e.g., GP-CP01) from the discovered devices list to connect."
        },
        {
            category: "Device Connection",
            question: "Why is my box showing offline?",
            answer: "Ensure the box's cellular/WiFi toggle is turned on. If you are in a low cellular coverage zone (e.g. basement or remote areas), try connecting via Bluetooth instead to sync the latest telemetry logs."
        },

        // Category 4: Alert & Notification
        {
            category: "Alert & Notification",
            question: "How do I silence temperature alerts?",
            answer: "You can customize the temperature threshold limits in the settings panel of your box detail screen on the GrubAdmin portal or temporarily silence alerts directly from your phone's active push notifications."
        },
        {
            category: "Alert & Notification",
            question: "What is a GrubLock alert?",
            answer: "A GrubLock alert triggers when the box is unlocked without an authorized OTP or without manager permission while transit is in progress. This warning helps prevent unauthorized access and cargo tampering."
        },

        // Category 5: Account & App Support
        {
            category: "Account & App Support",
            question: "How do I update my profile details?",
            answer: "Navigate to the 'Account Settings' tab from the sidebar menu to update your profile photo, full name, email, and contact details."
        },
        {
            category: "Account & App Support",
            question: "How to report app issues?",
            answer: "Click on the 'WRITE TO US' button at the bottom of the help section, write your issue details, attach screenshots if possible, and click submit. Our support team will get back to you shortly."
        },

        // Category 6: Others
        {
            category: "Others",
            question: "How to check daily logs?",
            answer: "Go to the 'System Logs' tab in your sidebar navigation menu to view all past logs, telemetry history, and box status activity history."
        },
        {
            category: "Others",
            question: "Can I request more box capacity?",
            answer: "Yes, contact your client administrator or organization manager to purchase and assign new GrubPac devices to your specific restaurant account."
        }
    ];

    for (const faq of faqsToSeed) {
        const questionRecord = await prisma.faq_question.create({
            data: {
                id: ulid(),
                question: faq.question,
                answer: faq.answer,
                publishing_status: "published",
                status: "active"
            }
        });

        await prisma.faq_question_category.create({
            data: {
                id: ulid(),
                question_id: questionRecord.id,
                category_id: categoryRecords[faq.category]!
            }
        });

        console.log(`  Seeded FAQ: [${faq.category}] -> "${faq.question}"`);
    }

    console.log("\nHelp Section seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error("Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
