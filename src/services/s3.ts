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
	acl?: ObjectCannedACL;
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
		const { file, prefix, acl } = args;

		const fileBuffer = await this.convertFileToBuffer(file);

		const key = `${file.name}-${ulid()}`;
		const bucketKey = `${prefix}/${key}`;

		const response = await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				ACL: acl ?? "public-read",
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
