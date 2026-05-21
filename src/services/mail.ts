import { MAIL, MAIL_PASS, MAIL_MIRROR, MAIL_MIRROR_PASS, NODE_ENV } from "@/configs/env";
import { logger } from "@/utils/logger";
import { createTransport, type Transporter } from "nodemailer";

export interface MailingOptions {
	from: string;
	to: string;
	subject: string;
	text?: string;
	html?: string;
	cc?: string;
	bcc?: string;
}

export class Mail {
	mail: string;
	mailPass: string;

	transporter: Transporter;
	mirrorTransporter: Transporter | null = null;

	constructor() {
		this.mail = MAIL;
		this.mailPass = MAIL_PASS;

		this.transporter = createTransport({
			service: "gmail",
			auth: {
				user: MAIL,
				pass: MAIL_PASS,
			},

		});

		if (NODE_ENV !== "production" && MAIL_MIRROR && MAIL_MIRROR_PASS) {
			this.mirrorTransporter = createTransport({
				service: "gmail",
				auth: {
					user: MAIL_MIRROR,
					pass: MAIL_MIRROR_PASS,
				},

			});
		}
	}

	async sendEmail(options: MailingOptions) {
		const info = await this.transporter.sendMail({
			...options,
		});

		logger.info(info);

		// Mirror all outgoing emails to the mirror account if configured
		if (this.mirrorTransporter && MAIL_MIRROR) {
			try {
				await this.mirrorTransporter.sendMail({
					...options,
					to: MAIL_MIRROR, // Send a copy to the mirror account
					text: options.text ? `${options.text}\n\nOriginal Recipient: ${options.to}` : undefined,
					html: options.html ? `${options.html}<br><br><b>Original Recipient:</b> ${options.to}` : undefined,
				});
				logger.info(`✅ Copied email for [${options.to}] to mirror [${MAIL_MIRROR}]`);
			} catch (error) {
				logger.error(`❌ Failed to send mirror email to [${MAIL_MIRROR}]: ${error}`);
			}
		}
	}
}
