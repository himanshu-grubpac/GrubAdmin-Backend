import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	type ObjectCannedACL,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import {
	AWS_BUCKET_NAME,
	AWS_KEY,
	AWS_REGION,
	AWS_SECRET,
} from "@/configs/env.ts";
import { ulid } from "ulid";

interface UploadToS3Args {
	file: File;
	prefix: string;
	acl?: ObjectCannedACL; // Kept for backwards compatibility, but ignored in execution to prevent bucket ownership crashes
}

interface UploadToS3Response {
	key: string;
	file_name: string;
}

export class s3Service {
	client: S3Client;
	bucket: string;

	constructor() {
		this.client = new S3Client({
			region: AWS_REGION,
			credentials: {
				accessKeyId: AWS_KEY,
				secretAccessKey: AWS_SECRET,
			},
		});

		this.bucket = AWS_BUCKET_NAME;
	}

	private async convertFileToBuffer(file: File) {
		return Buffer.from(await file.arrayBuffer());
	}

	async uploadToS3(args: UploadToS3Args): Promise<UploadToS3Response> {
		const { file, prefix } = args;

		const fileBuffer = await this.convertFileToBuffer(file);

		// Clean filename spaces for clean URLs
		const cleanFileName = file.name.replace(/\s+/g, "_");
		const key = `${ulid()}-${cleanFileName}`;
		const bucketKey = `${prefix}/${key}`;

		// 🔒 Strip ACL parameter to comply with ACL-disabled buckets
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: bucketKey,
				Body: fileBuffer,
				ContentType: file.type,
			}),
		);

		return {
			key,
			file_name: file.name,
		};
	}

	/**
	 * Deletes objects from S3 for transactional rollbacks on database write failures
	 */
	async deleteFromS3(keys: string[], prefix: string): Promise<void> {
		if (keys.length === 0) return;
		try {
			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: {
						Objects: keys.map((key) => ({ Key: `${prefix}/${key}` })),
						Quiet: true,
					},
				}),
			);
		} catch (error) {
			console.error("Critical: Failed to clean up uploaded S3 objects during rollback:", error);
		}
	}

	async emptyBucket() {
		let token: string | undefined = undefined;

		do {
			// @ts-ignore
			const list = await this.client.send(
				new ListObjectsV2Command({
					Bucket: this.bucket,
					ContinuationToken: token,
					MaxKeys: 1000,
				}),
			);

			const objects = list.Contents ?? [];

			if (objects.length > 0) {
				// Build Delete payload (max 1000 keys per request)
				const deleteParams = {
					Bucket: this.bucket,
					Delete: {
						// @ts-ignore
						Objects: objects.map((o) => ({ Key: o.Key })),
						Quiet: true,
					},
				};
				await this.client.send(new DeleteObjectsCommand(deleteParams));
				console.log(`Deleted ${objects.length} objects`);
			}

			token = list.IsTruncated ? list.NextContinuationToken : undefined;
		} while (token);
	}
}
