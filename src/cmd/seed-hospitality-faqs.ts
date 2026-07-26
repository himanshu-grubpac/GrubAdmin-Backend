import { prisma } from "@/db";
import { ulid } from "ulid";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";

const FAQ_BY_CATEGORY: Record<string, { question: string; answer: string }[]> = {
  "Setup & Installation": [
    {
      question: "How do I install the GrubPac Hospitality box?",
      answer: "Place the box in a well-ventilated area near a power outlet. Connect the power adapter, turn on the main switch, and follow the on-screen setup wizard or use the GrubPac Hospitality app to complete the pairing process.",
    },
    {
      question: "What are the power requirements for the box?",
      answer: "The GrubPac Hospitality box requires a standard 110-240V AC power outlet. It includes a backup battery that provides up to 4 hours of operation during power outages.",
    },
  ],
  Troubleshooting: [
    {
      question: "Why is my box not connecting to the network?",
      answer: "Ensure the box is within range of your WiFi network and that the correct credentials are entered. You can also try restarting the box by holding the power button for 10 seconds. If the issue persists, check if your network firewall is blocking the connection.",
    },
    {
      question: "What should I do if the temperature readings seem incorrect?",
      answer: "First, verify that the temperature probe is properly inserted and not damaged. Clean the probe with a soft cloth and ensure it's not obstructed. If readings are still inaccurate, recalibrate the sensor through the Settings menu in your app.",
    },
    {
      question: "The box display is not turning on. What should I do?",
      answer: "Press and hold the power button for 5 seconds. If the display remains off, connect the charger and wait 2 minutes. If it still doesn't power on, contact support for a replacement.",
    },
  ],
  "Device Connection": [
    {
      question: "How do I connect the box to Bluetooth?",
      answer: "Open the GrubPac Hospitality app, go to Devices, and tap 'Scan for Box'. Ensure Bluetooth is enabled on your phone. Select your box from the list of discovered devices and confirm the pairing code shown on the box display.",
    },
    {
      question: "Can I connect multiple devices to one box?",
      answer: "Yes, a single box can pair with up to 5 authorized devices simultaneously. Each device must be authenticated using your account credentials.",
    },
  ],
  "Alert & Notification": [
    {
      question: "How do I set up temperature alerts?",
      answer: "In the app, navigate to Settings > Alerts > Temperature. Set your minimum and maximum temperature thresholds. You'll receive push notifications whenever readings fall outside these ranges.",
    },
    {
      question: "Why am I not receiving push notifications?",
      answer: "Check that notifications are enabled for the GrubPac Hospitality app in your phone's system settings. Also verify that your device is connected to the internet and that alert preferences are configured in the app settings.",
    },
  ],
  "Account & App Support": [
    {
      question: "How do I update my account information?",
      answer: "Go to the Profile tab in the app and select 'Edit Profile'. You can update your name, email address, phone number, and facility details.",
    },
    {
      question: "How do I reset my password?",
      answer: "On the login screen, tap 'Forgot Password'. Enter your registered email address and follow the instructions sent to your email.",
    },
  ],
  Others: [
    {
      question: "How do I view daily activity logs?",
      answer: "Navigate to the Logs section in the app dashboard. You can filter logs by date range, box ID, or event type.",
    },
    {
      question: "How can I request additional boxes for my facility?",
      answer: "Contact your account manager or submit a request through the app by going to Support > Request Equipment.",
    },
  ],
};

async function main() {
  console.log("Seeding Hospitality FAQ data...");

  const vertical = await prisma.vertical.findUnique({ where: { name: HOSPITALITY_VERTICAL_NAME } });
  if (!vertical) { console.error(`Vertical "${HOSPITALITY_VERTICAL_NAME}" not found.`); process.exit(1); }
  console.log(`Vertical: ${vertical.name} (${vertical.id})`);

  const existingCats = await prisma.faq_category.findMany({ where: { vertical_id: vertical.id } });
  const catByName = new Map(existingCats.map((c) => [c.name.toLowerCase().trim(), c]));

  let total = 0;
  for (const [catName, faqs] of Object.entries(FAQ_BY_CATEGORY)) {
    const cat = catByName.get(catName.toLowerCase().trim());
    if (!cat) { console.warn(`  Category "${catName}" not found, skipping.`); continue; }

    for (const faq of faqs) {
      const exists = await prisma.faq_question.findFirst({ where: { question: faq.question } });
      if (exists) { console.log(`  Skipped (exists): "${faq.question.substring(0, 50)}..."`); continue; }

      const question = await prisma.faq_question.create({
        data: { id: ulid(), question: faq.question, answer: faq.answer, publishing_status: "published", status: "active" },
      });
      await prisma.faq_question_category.create({
        data: { id: ulid(), question_id: question.id, category_id: cat.id },
      });
      total++;
      console.log(`  Created: "${faq.question.substring(0, 50)}..."`);
    }
  }

  console.log(`\nDone! Created ${total} new FAQ questions.`);
}

main().catch((e) => { console.error("Failed:", e); process.exit(1); }).finally(() => prisma.$disconnect());
