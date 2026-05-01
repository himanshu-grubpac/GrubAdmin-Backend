/**
 * Checks if a value is "empty" (null, undefined, or empty string).
 */
export function isEmptyValue(val: unknown): boolean {
    return val === null || val === undefined || (typeof val === "string" && val.trim() === "");
}

/**
 * Removes null, undefined, and empty string properties from an object (shallow).
 */
export function cleanQueryObject<T extends object>(obj: T): Partial<T> {
    const result: any = {};
    for (const key in obj) {
        const val = obj[key];
        if (!isEmptyValue(val)) {
            result[key] = val;
        }
    }
    return result;
}

/**
 * Deeply traverses an object and converts all empty strings to null.
 * Also formats "joining_date" to Y-m-d if it's a Date object and formatDates is true.
 */
export function nullifyEmptyStrings<T>(obj: T, keyName?: string, formatDates = true): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") return (obj.trim() === "" ? null : obj) as any;
    if (Array.isArray(obj)) return (obj as any[]).map((v) => nullifyEmptyStrings(v, keyName, formatDates)) as any;
    if (typeof obj === "object") {
        if (obj instanceof Date) {
            if (formatDates && keyName === "joining_date") {
                const year = obj.getFullYear();
                const month = String(obj.getMonth() + 1).padStart(2, "0");
                const day = String(obj.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}` as any;
            }
            return obj;
        }

        if (obj.constructor !== Object && obj.constructor !== undefined) {
             return obj;
        }

        const result: any = {};
        for (const key in obj) {
            result[key] = nullifyEmptyStrings((obj as any)[key], key, formatDates);
        }
        return result;
    }
    return obj;
}

/**
 * Specifically converts empty strings to null for keys that look like foreign keys (ending in _id).
 */
export function nullifyEmptyFKs<T>(obj: T): T {
    if (obj === null || obj === undefined || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return (obj as any[]).map(nullifyEmptyFKs) as any;
    
    if ((obj as any).constructor !== Object && (obj as any).constructor !== undefined) {
        return obj;
    }

    const result: any = {};
    for (const key in obj) {
        let val = (obj as any)[key];
        if (key.endsWith("_id") && typeof val === "string" && val.trim() === "") {
            val = null;
        } else if (typeof val === "object" && val !== null) {
            val = nullifyEmptyFKs(val);
        }
        result[key] = val;
    }
    return result as T;
}
