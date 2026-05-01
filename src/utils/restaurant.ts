/**
 * Enriches any restaurant record (or plain object) with a computed full_address field.
 */
export const withFullAddress = <
    T extends { line_one?: string | null; line_two?: string | null; city?: string | null; state?: string | null; pincode?: string | null }
>(
    restaurant: T,
): T & { full_address: string } => {
    const full_address = [
        restaurant.line_one,
        restaurant.line_two,
        restaurant.city,
        restaurant.state,
        restaurant.pincode,
    ]
        .filter((part): part is string => Boolean(part?.trim()))
        .join(", ");
    return { ...restaurant, full_address };
};

/**
 * Enrich an array of restaurants with full_address.
 */
export const withFullAddresses = <
    T extends { line_one?: string | null; line_two?: string | null; city?: string | null; state?: string | null; pincode?: string | null }
>(
    restaurants: T[],
): (T & { full_address: string })[] => restaurants.map(withFullAddress);
