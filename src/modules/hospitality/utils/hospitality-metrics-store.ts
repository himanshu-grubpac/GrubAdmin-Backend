const MAX_LATENCY_SAMPLES = 1000;

export interface HospitalityMetricsSnapshot {
	request_count: number;
	status_4xx_count: number;
	status_5xx_count: number;
	latency_ms: {
		p95: number | null;
		sample_size: number;
	};
	uptime_seconds: number;
}

const startedAt = Date.now();

let requestCount = 0;
let status4xxCount = 0;
let status5xxCount = 0;
const latencySamples: number[] = [];

function computeP95(samples: number[]): number | null {
	if (samples.length === 0) return null;
	const sorted = [...samples].sort((a, b) => a - b);
	const index = Math.ceil(sorted.length * 0.95) - 1;
	return sorted[Math.max(0, index)] ?? null;
}

export function recordHospitalityRequestMetrics(status: number, durationMs: number): void {
	requestCount += 1;
	if (status >= 400 && status < 500) status4xxCount += 1;
	if (status >= 500) status5xxCount += 1;

	latencySamples.push(durationMs);
	if (latencySamples.length > MAX_LATENCY_SAMPLES) {
		latencySamples.shift();
	}
}

export function getHospitalityMetricsSnapshot(): HospitalityMetricsSnapshot {
	return {
		request_count: requestCount,
		status_4xx_count: status4xxCount,
		status_5xx_count: status5xxCount,
		latency_ms: {
			p95: computeP95(latencySamples),
			sample_size: latencySamples.length,
		},
		uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
	};
}

/** Test-only reset — does not affect production counters across hot reload in prod. */
export function clearHospitalityMetricsForTests(): void {
	requestCount = 0;
	status4xxCount = 0;
	status5xxCount = 0;
	latencySamples.length = 0;
}
