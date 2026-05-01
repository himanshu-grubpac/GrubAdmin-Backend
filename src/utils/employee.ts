/**
 * Resolves first_name and last_name from either:
 * - a full_name string (split at the first space)
 * - explicit first_name / last_name fields
 *
 * Priority: full_name > first_name + last_name
 */
export const resolveEmployeeName = (input: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
}): { first_name: string; last_name: string } => {
    if (input.full_name) {
        const trimmed = input.full_name.trim();
        const spaceIdx = trimmed.indexOf(" ");
        if (spaceIdx === -1) {
            return { first_name: trimmed, last_name: "" };
        }
        return {
            first_name: trimmed.slice(0, spaceIdx).trim(),
            last_name: trimmed.slice(spaceIdx + 1).trim(),
        };
    }
    return {
        first_name: (input.first_name ?? "").trim(),
        last_name: (input.last_name ?? "").trim(),
    };
};

/**
 * Enriches any employee record (or plain object) with a computed full_name field.
 */
export const withFullName = <T extends { first_name: string; last_name: string }>(
    employee: T,
): T & { full_name: string } => {
    const full_name = [employee.first_name, employee.last_name]
        .filter(Boolean)
        .join(" ");
    return { ...employee, full_name };
};

/**
 * Enrich an array of employees with full_name.
 */
export const withFullNames = <T extends { first_name: string; last_name: string }>(
    employees: T[],
): (T & { full_name: string })[] => employees.map(withFullName);
