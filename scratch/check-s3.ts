import { services } from "../src/db/../../src/services";

async function main() {
	const key = "faq/01KV2PC70FD1V0AEWD1KARJ1PW-system_logs_2026-06-13__6_.csv";
	console.log("Checking S3 bucket:", services.s3.bucket);
	try {
		const res = await services.s3.getObjectFromS3(key);
		console.log("Success! File retrieved from S3:", res.ContentType);
		const bytes = await res.Body?.transformToByteArray();
		console.log("Bytes downloaded:", bytes?.length);
	} catch (err: any) {
		console.error("Full S3 Error Details:", err);
		if (err.stack) {
			console.error("Stack trace:", err.stack);
		}
	}
}

main().catch(console.error);
