import { prisma } from "../src/db";

async function main() {
	const faqs = await prisma.faq_question.findMany({
		where: {
			status: { not: "deleted" },
		},
		select: {
			id: true,
			question: true,
			attachments: true,
		},
	});
	console.log(JSON.stringify(faqs, null, 2));
}

main()
	.catch(e => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		// Prisma proxy doesn't need explicit disconnect, but let's call it just in case
	});
