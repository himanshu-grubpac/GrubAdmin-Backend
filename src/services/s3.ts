import {
	DeleteObjectsCommand,
	GetBucketLocationCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	type ObjectCannedACL,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	AWS_BUCKET_NAME,
	AWS_KEY,
	AWS_REGION,
	AWS_SECRET,
} from "@/configs/env.ts";
import { ulid } from "ulid";
import path from "path";


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
	currentRegion: string;
	bucketRegionResolved = false;

	constructor() {
		this.currentRegion = AWS_REGION;
		this.client = this.createClient(this.currentRegion);
		this.bucket = AWS_BUCKET_NAME;
	}

	private createClient(region: string) {
		return new S3Client({
			region,
			credentials: {
				accessKeyId: AWS_KEY,
				secretAccessKey: AWS_SECRET,
			},
		});
	}

	private normalizeBucketLocation(location?: string | null): string {
		if (!location || location === "") {
			return "us-east-1";
		}

		if (location.toUpperCase() === "EU") {
			return "eu-west-1";
		}

		return location;
	}

	private async resolveBucketRegion(): Promise<void> {
		if (this.bucketRegionResolved) {
			return;
		}

		try {
			const response = await this.client.send(
				new GetBucketLocationCommand({
					Bucket: this.bucket,
				}),
			);

			const region = this.normalizeBucketLocation(response.LocationConstraint);
			if (region && region !== this.currentRegion) {
				this.currentRegion = region;
				this.client = this.createClient(region);
			}
		} catch (error: any) {
			console.error("Failed to resolve S3 bucket region:", error);
		} finally {
			this.bucketRegionResolved = true;
		}
	}

	private async convertFileToBuffer(file: File) {
		return Buffer.from(await file.arrayBuffer());
	}

	async uploadToS3(args: UploadToS3Args): Promise<UploadToS3Response> {
		const { file, prefix } = args;

		const fileBuffer = await this.convertFileToBuffer(file);


		const baseName = path.basename(file.name);
		const safeFileName = baseName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
		const key = `${ulid()}-${safeFileName}`;
		const bucketKey = `${prefix}/${key}`;

		const upload = async () => {
			await this.client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: bucketKey,
					Body: fileBuffer,
					ContentType: file.type,
				}),
			);
		};

		try {
			await upload();
			return {
				key: bucketKey,
				file_name: file.name,
			};
		} catch (error: any) {
			const message = String(error?.message || error || "Failed to upload file to S3");
			console.error("S3 upload failed:", message);

			if (message.includes("must be addressed using the specified endpoint")) {
				await this.resolveBucketRegion();
				if (this.currentRegion !== AWS_REGION) {
					try {
						await upload();
						return {
							key: bucketKey,
							file_name: file.name,
						};
					} catch (retryError: any) {
						console.error("Retry after bucket region resolution failed:", retryError);
						throw new Error(String(retryError?.message || retryError || message));
					}
				}
			}

			throw new Error(message);
		}
	}


	async deleteFromS3(keys: string[], prefix: string): Promise<void> {
		if (keys.length === 0) return;
		try {
			await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: {
						Objects: keys.map((key) => ({ Key: key })),
						Quiet: true,
					},
				}),
			);
		} catch (error) {
			console.error("Critical: Failed to clean up uploaded S3 objects during rollback:", error);
		}
	}
	async getObjectFromS3(key: string) {
		const download = async () => {
			const command = new GetObjectCommand({
				Bucket: this.bucket,
				Key: key,
			});
			return await this.client.send(command);
		};

		try {
			return await download();
		} catch (error: any) {
			const isRedirect = error.$metadata?.httpStatusCode === 301 || 
				String(error?.message || error || "").includes("must be addressed using the specified endpoint");

			if (isRedirect) {
				await this.resolveBucketRegion();
				try {
					return await download();
				} catch (retryError: any) {
					console.error("S3 getObject retry failed:", retryError);
					throw retryError;
				}
			}
			throw error;
		}
	}

	async objectExists(key: string): Promise<boolean> {
		const check = async () => {
			await this.client.send(
				new HeadObjectCommand({
					Bucket: this.bucket,
					Key: key,
				}),
			);
			return true;
		};

		try {
			return await check();
		} catch (error: any) {
			const status = error?.$metadata?.httpStatusCode;
			if (status === 404 || error?.name === "NotFound") {
				return false;
			}

			const isRedirect =
				status === 301 ||
				String(error?.message || error || "").includes(
					"must be addressed using the specified endpoint",
				);

			if (isRedirect) {
				await this.resolveBucketRegion();
				try {
					return await check();
				} catch (retryError: any) {
					const retryStatus = retryError?.$metadata?.httpStatusCode;
					if (retryStatus === 404 || retryError?.name === "NotFound") {
						return false;
					}
					throw retryError;
				}
			}

			throw error;
		}
	}

	async getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
		const sign = async () => {
			const command = new GetObjectCommand({
				Bucket: this.bucket,
				Key: key,
			});
			return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
		};

		try {
			return await sign();
		} catch (error: any) {
			const isRedirect =
				error.$metadata?.httpStatusCode === 301 ||
				String(error?.message || error || "").includes(
					"must be addressed using the specified endpoint",
				);

			if (isRedirect) {
				await this.resolveBucketRegion();
				return sign();
			}

			throw error;
		}
	}

	async getPresignedPutUrl(
		key: string,
		contentType?: string,
		expiresInSeconds = 900,
	): Promise<string> {
		const sign = async () => {
			const command = new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				...(contentType ? { ContentType: contentType } : {}),
			});
			return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
		};

		try {
			return await sign();
		} catch (error: any) {
			const isRedirect =
				error.$metadata?.httpStatusCode === 301 ||
				String(error?.message || error || "").includes(
					"must be addressed using the specified endpoint",
				);

			if (isRedirect) {
				await this.resolveBucketRegion();
				return sign();
			}

			throw error;
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

						Objects: objects.map((o: any) => ({ Key: o.Key })),
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
