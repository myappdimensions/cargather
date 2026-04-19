const form = document.querySelector("#search-form");
const summary = document.querySelector("#summary");
const providers = document.querySelector("#providers");
const results = document.querySelector("#results");
const template = document.querySelector("#card-template");

function formatMoney(value) {
  if (typeof value !== "number") return "Price unavailable";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value, suffix = "") {
  if (typeof value !== "number") return "Unknown";
  return `${new Intl.NumberFormat("en-GB").format(value)}${suffix}`;
}

function setLoading(loading) {
  summary.textContent = loading ? "Searching Auto Trader, Motor, Carzoo and Cinch..." : summary.textContent;
}

function renderProviders(items) {
  providers.innerHTML = "";

  items.forEach((item) => {
    const pill = document.createElement("div");
    pill.className = `provider-pill ${item.ok ? "is-ok" : "is-error"}`;
    pill.textContent = item.ok ? `${item.label}: ${item.count}` : `${item.label}: ${item.error || "unavailable"}`;
    providers.appendChild(pill);
  });
}

function renderListings(listings) {
  results.innerHTML = "";

  if (!listings.length) {
    results.innerHTML = `<div class="empty-state">No matching listings were found. Try widening the filters or reducing the site limit.</div>`;
    return;
  }

  listings.forEach((listing) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".listing-card");
    const img = fragment.querySelector("img");

    fragment.querySelector(".source-badge").textContent = listing.source;
    fragment.querySelector(".price").textContent = formatMoney(listing.price);
    fragment.querySelector("h2").textContent = listing.title;
    fragment.querySelector(".subtitle").textContent = listing.subtitle || listing.location || " ";
    fragment.querySelector(".details").textContent = listing.details || listing.dealer || "";

    const specs = [
      ["Year", listing.year ?? "Unknown"],
      ["Mileage", typeof listing.mileage === "number" ? formatNumber(listing.mileage, " mi") : "Unknown"],
      ["Fuel", listing.fuelType || "Unknown"],
      ["Transmission", listing.transmission || "Unknown"]
    ];

    const specsList = fragment.querySelector(".specs");
    specs.forEach(([label, value]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = String(value);
      specsList.append(dt, dd);
    });

    const link = fragment.querySelector(".cta");
    link.href = listing.url || "#";

    if (listing.imageUrl) {
      img.src = listing.imageUrl;
      img.alt = listing.title;
    } else {
      card.classList.add("no-image");
      img.remove();
    }

    results.appendChild(fragment);
  });
}

async function runSearch(event) {
  event.preventDefault();
  setLoading(true);

  const params = new URLSearchParams(new FormData(form));

  try {
    const response = await fetch(`/api/search?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.details || payload.error || "Search failed");
    }

    summary.textContent = `${payload.count} listings aggregated across ${payload.providers.length} providers.`;
    renderProviders(payload.providers);
    renderListings(payload.listings);
  } catch (error) {
    summary.textContent = error instanceof Error ? error.message : "Search failed";
    providers.innerHTML = "";
    renderListings([]);
  }
}

form.addEventListener("submit", runSearch);
