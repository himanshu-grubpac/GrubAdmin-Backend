import { logHospitalityScoped, type HospitalityLogContext } from "hospitality/utils/hospitality-logger";

export interface HospitalityMailJob {
	label: string;
	send: () => Promise<void>;
	onFailure?: () => Promise<void>;
	onSuccess?: () => void;
	/** Propagate request_id / client_id into async mail failure logs. */
	logScope?: HospitalityLogContext;
}

/**
 * Non-blocking hospitality SMTP — returns immediately; mail runs on next tick.
 * Use onFailure for compensating deletes when OTP/magic-link mail fails.
 */
export function queueHospitalityMail(job: HospitalityMailJob): void {
	setImmediate(() => {
		void (async () => {
			try {
				await job.send();
				job.onSuccess?.();
			} catch (error) {
				logHospitalityScoped("error", "hospitality_mail_failed", job.logScope ?? {}, {
					label: job.label,
					error: String(error),
				});
				if (job.onFailure) {
					try {
						await job.onFailure();
					} catch (cleanupError) {
						logHospitalityScoped("error", "hospitality_mail_cleanup_failed", job.logScope ?? {}, {
							label: job.label,
							error: String(cleanupError),
						});
					}
				}
			}
		})();
	});
}
