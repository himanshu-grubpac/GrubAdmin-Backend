/**
 * Short-TTL in-process memo for hot hospitality read paths (Phase 2 P2-15).
 * Complements HTTP Cache-Control / ETag — dedupes identical DB work within a
 * single Bun process when the FE polls badge counts or reopens dropdowns.
 *
 * Not shared across PM2/cluster instances; Phase 4 Redis covers multi-instance.
 */

const DEFAULT_TTL_MS = 8_000;

interface MemoEntry<T> {
	value: T;
	expiresAt: number;
}

class HospitalityRequestMemo {
	private readonly cache = new Map<string, MemoEntry<unknown>>();

	get<T>(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}
		if (Date.now() >= entry.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}
		return entry.value as T;
	}

	async getOrLoad<T>(
		key: string,
		loader: () => Promise<T>,
		ttlMs: number = DEFAULT_TTL_MS,
	): Promise<T> {
		const cached = this.get<T>(key);
		if (cached !== undefined) {
			return cached;
		}
		const value = await loader();
		this.set(key, value, ttlMs);
		return value;
	}

	set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
		this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
	}

	invalidatePrefix(prefix: string): void {
		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
			}
		}
	}

	clearForTests(): void {
		this.cache.clear();
	}
}

export const hospitalityRequestMemo = new HospitalityRequestMemo();

export function buildHospitalityMemoKey(
	scope: string,
	clientId: string,
	verticalId?: string,
): string {
	return `${scope}:${clientId}:${verticalId ?? ""}`;
}

/** Test hook */
export function clearHospitalityRequestMemoForTests(): void {
	hospitalityRequestMemo.clearForTests();
}
