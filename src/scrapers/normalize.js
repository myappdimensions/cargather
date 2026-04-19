function extractPrice(value) {
  if (!value) return undefined;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

function extractMileage(text) {
  if (!text) return undefined;
  const match = text.replace(/,/g, "").match(/(\d{1,6})\s*miles?/i);
  return match ? Number(match[1]) : undefined;
}

function extractYear(text) {
  if (!text) return undefined;
  const match = text.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

export function normalizeListing(provider, raw) {
  const summary = [raw.title, raw.subtitle, raw.details].filter(Boolean).join(" ");

  return {
    id: raw.id ?? `${provider.name}:${raw.url ?? raw.title ?? Math.random().toString(36).slice(2)}`,
    source: provider.label,
    title: raw.title?.trim() ?? "Untitled listing",
    subtitle: raw.subtitle?.trim() ?? "",
    price: raw.price ? extractPrice(raw.price) : undefined,
    mileage: raw.mileage ? extractMileage(raw.mileage) : extractMileage(summary),
    year: raw.year ? extractYear(raw.year) : extractYear(summary),
    fuelType: raw.fuelType?.trim() ?? "",
    transmission: raw.transmission?.trim() ?? "",
    imageUrl: raw.imageUrl ?? "",
    location: raw.location?.trim() ?? "",
    dealer: raw.dealer?.trim() ?? "",
    url: raw.url ?? "",
    details: raw.details?.trim() ?? "",
    raw
  };
}

export function applyFilters(listings, filters) {
  return listings.filter((listing) => {
    if (filters.minYear && (!listing.year || listing.year < filters.minYear)) return false;
    if (filters.minPrice && (!listing.price || listing.price < filters.minPrice)) return false;
    if (filters.maxPrice && (!listing.price || listing.price > filters.maxPrice)) return false;
    if (filters.maxMileage && (!listing.mileage || listing.mileage > filters.maxMileage)) return false;
    if (filters.fuelType && listing.fuelType && !listing.fuelType.toLowerCase().includes(filters.fuelType.toLowerCase())) return false;
    if (filters.transmission && listing.transmission && !listing.transmission.toLowerCase().includes(filters.transmission.toLowerCase())) return false;
    return true;
  });
}
