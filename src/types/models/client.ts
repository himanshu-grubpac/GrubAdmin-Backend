import type { client } from "@/db/types";
import type { BoxType } from "@/types/common/box-type.ts";

export interface ClientWithBoxCounts extends client {
	counts: Partial<Record<BoxType, number>> | undefined;
}
