declare var console: {
	error: (...args: any[]) => void;
	log: (...args: any[]) => void;
	warn: (...args: any[]) => void;
	info: (...args: any[]) => void;
};

declare var process: {
	env: Record<string, string | undefined>;
	exit: (code?: number) => never;
	argv: string[];
	cwd: () => string;
	pid: number;
	on: (event: string, listener: (...args: any[]) => void) => void;
	hrtime: {
		bigint: () => bigint;
	};
};

declare var Buffer: {
	from: (data: ArrayBuffer, encoding?: string) => Uint8Array;
	isBuffer: (obj: any) => boolean;
	alloc: (size: number) => Uint8Array;
};


