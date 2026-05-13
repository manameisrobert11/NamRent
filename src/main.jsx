import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import GoogleSignIn from "./components/GoogleSignIn.jsx";
import WindhoekMap from "./components/WindhoekMap.jsx";
import { listings, locations, futureLocations, propertyTypes, priceRanges } from "./namrentData.js";

const currency = new Intl.NumberFormat("en-NA", {
  style: "currency",
  currency: "NAD",
  maximumFractionDigits: 0,
});

const emptyVisitProfile = {
  listingViews: {},
  locations: {},
  categories: {},
  propertyTypes: {},
  totalPrice: 0,
  viewCount: 0,
  recentIds: [],
};

function getVisitProfileKey(user) {
  return `namrent-visit-profile:${user?.email ?? "guest"}`;
}

function readVisitProfile(user) {
  if (typeof window === "undefined") return emptyVisitProfile;
  try {
    return { ...emptyVisitProfile, ...JSON.parse(window.localStorage.getItem(getVisitProfileKey(user)) || "{}") };
  } catch {
    return emptyVisitProfile;
  }
}

function saveVisitProfile(user, profile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getVisitProfileKey(user), JSON.stringify(profile));
}

function incrementMapValue(map, key) {
  if (!key) return map;
  return { ...map, [key]: (map[key] ?? 0) + 1 };
}

function recordListingVisit(profile, listing) {
  return {
    listingViews: incrementMapValue(profile.listingViews, listing.id),
    locations: incrementMapValue(profile.locations, listing.location),
    categories: incrementMapValue(profile.categories, listing.category),
    propertyTypes: incrementMapValue(profile.propertyTypes, listing.propertyType),
    totalPrice: (profile.totalPrice ?? 0) + Number(listing.price || 0),
    viewCount: (profile.viewCount ?? 0) + 1,
    recentIds: [listing.id, ...(profile.recentIds ?? []).filter((id) => id !== listing.id)].slice(0, 20),
  };
}

function scoreListingForUser(listing, profile) {
  const viewCount = profile.viewCount ?? 0;
  if (!viewCount) return (listing.isFeatured ? 35 : 0) + (listing.popularity ?? 0) * 0.45;

  const averageViewedPrice = (profile.totalPrice ?? 0) / viewCount;
  const priceGap = Math.abs(Number(listing.price || 0) - averageViewedPrice);
  const priceFit = Math.max(0, 18 - priceGap / 450);
  const alreadyViewedPenalty = Math.min(profile.listingViews?.[listing.id] ?? 0, 3) * 6;

  return (
    (listing.isFeatured ? 22 : 0) +
    (listing.popularity ?? 0) * 0.3 +
    (profile.locations?.[listing.location] ?? 0) * 20 +
    (profile.categories?.[listing.category] ?? 0) * 12 +
    (profile.propertyTypes?.[listing.propertyType] ?? 0) * 10 +
    priceFit -
    alreadyViewedPenalty
  );
}

function getPersonalizedFeaturedListings(allListings, profile, limit = 12) {
  const ranked = [...allListings]
    .map((listing) => ({ listing, score: scoreListingForUser(listing, profile) }))
    .sort((a, b) => b.score - a.score || (b.listing.popularity ?? 0) - (a.listing.popularity ?? 0))
    .map(({ listing }) => listing);

  const featured = allListings.filter((listing) => listing.isFeatured);
  return [...new Map([...ranked, ...featured].map((listing) => [listing.id, listing])).values()].slice(0, limit);
}

function App() {
  const [page, setPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [platformListings, setPlatformListings] = useState(listings);
  const [pendingListings, setPendingListings] = useState([]);
  const [emailNotifications, setEmailNotifications] = useState([]);
  const [visitProfile, setVisitProfile] = useState(() => readVisitProfile(null));
  const [selectedListingId, setSelectedListingId] = useState(listings[0].id);
  const [filters, setFilters] = useState({
    q: "",
    location: "",
    type: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    sort: "newest",
  });

  const selectedListing = platformListings.find((listing) => listing.id === selectedListingId) ?? platformListings[0];

  const filteredListings = useMemo(() => {
    let results = platformListings.filter((listing) => {
      const query = filters.q.trim().toLowerCase();
      const matchesQuery =
        !query ||
        [listing.title, listing.location, listing.category, listing.propertyType, listing.description].some((field) =>
          field.toLowerCase().includes(query),
        );
      const matchesLocation = !filters.location || listing.location === filters.location;
      const matchesType = !filters.type || listing.propertyType === filters.type;
      const matchesCategory = !filters.category || listing.category === filters.category;
      const matchesMin = !filters.minPrice || listing.price >= Number(filters.minPrice);
      const matchesMax = !filters.maxPrice || listing.price <= Number(filters.maxPrice);
      return matchesQuery && matchesLocation && matchesType && matchesCategory && matchesMin && matchesMax;
    });

    if (filters.sort === "lowest") results = results.sort((a, b) => a.price - b.price);
    if (filters.sort === "highest") results = results.sort((a, b) => b.price - a.price);
    if (filters.sort === "popular") results = results.sort((a, b) => b.popularity - a.popularity);
    if (filters.sort === "student") {
      results = results.sort((a, b) => Number(b.category === "Student rentals") - Number(a.category === "Student rentals"));
    }
    return results;
  }, [filters, platformListings]);

  useEffect(() => {
    setVisitProfile(readVisitProfile(currentUser));
  }, [currentUser?.email]);

  const submitListingForApproval = (formListing) => {
    const pending = {
      ...formListing,
      id: `pending-${Date.now()}`,
      ownerEmail: currentUser?.email ?? formListing.contact.email,
      ownerName: currentUser?.name ?? formListing.contact.name,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    setPendingListings((current) => [pending, ...current]);
    return pending;
  };

  const approveListing = (id) => {
    const pending = pendingListings.find((listing) => listing.id === id);
    if (!pending) return;
    const approved = {
      ...pending,
      id: `approved-${Date.now()}`,
      status: "active",
      isFeatured: true,
      popularity: 70,
      badges: [...new Set([...(pending.badges ?? []), "NamRent Approved"])],
      approvedAt: new Date().toISOString(),
    };
    setPendingListings((current) => current.filter((listing) => listing.id !== id));
    setPlatformListings((current) => [approved, ...current]);
    setEmailNotifications((current) => [
      {
        id: `email-${Date.now()}`,
        to: pending.ownerEmail,
        subject: "Your NamRent listing has been approved",
        message: `${pending.title} has been approved and is now live on NamRent.`,
        listingTitle: pending.title,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const goToListing = (id) => {
    const viewedListing = platformListings.find((listing) => listing.id === id);
    if (viewedListing) {
      setVisitProfile((current) => {
        const updated = recordListingVisit(current, viewedListing);
        saveVisitProfile(currentUser, updated);
        return updated;
      });
    }
    setSelectedListingId(id);
    setPage("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Header page={page} setPage={setPage} currentUser={currentUser} setCurrentUser={setCurrentUser} />
      <main>
        {page === "home" && (
          <Home
            currentUser={currentUser}
            emailNotifications={emailNotifications}
            listingsData={platformListings}
            pendingListings={pendingListings}
            visitProfile={visitProfile}
            filters={filters}
            setFilters={setFilters}
            setPage={setPage}
            goToListing={goToListing}
          />
        )}
        {page === "rentals" && (
          <ListingsPage
            title="Rentals in Windhoek"
            intro="Search rooms, flats, apartments, student accommodation, and houses with focused filters."
            filters={filters}
            setFilters={setFilters}
            listingsToShow={filteredListings}
            goToListing={goToListing}
          />
        )}
        {page === "student" && (
          <ListingsPage
            title="Student Rentals in Windhoek"
            intro="Affordable rooms, shared accommodation, bachelor flats, and rentals near campus routes."
            filters={{ ...filters, category: "Student rentals" }}
            setFilters={setFilters}
            listingsToShow={filteredListings.filter((listing) => listing.category === "Student rentals")}
            goToListing={goToListing}
            studentMode
          />
        )}
        {page === "houses" && (
          <ListingsPage
            title="Houses and Family Rentals"
            intro="Long-term homes, townhouses, duplexes, and larger flats for families and professionals."
            filters={{ ...filters, category: "Family homes" }}
            setFilters={setFilters}
            listingsToShow={filteredListings.filter((listing) => listing.category === "Family homes")}
            goToListing={goToListing}
          />
        )}
        {page === "airbnb" && (
          <ListingsPage
            title="Airbnb-Style Short Stays"
            intro="Furnished guest suites, holiday apartments, and temporary stays for visitors, students, and relocating workers."
            filters={{ ...filters, category: "Short stays" }}
            setFilters={setFilters}
            listingsToShow={filteredListings.filter((listing) => listing.category === "Short stays")}
            goToListing={goToListing}
            shortStayMode
          />
        )}
        {page === "details" && <PropertyDetails listing={selectedListing} setPage={setPage} />}
        {page === "locations" && (
          <LocationsPage
            listingsData={platformListings}
            goToListing={goToListing}
            setFilters={setFilters}
            setPage={setPage}
          />
        )}
        {page === "advertise" && <AdvertisePage />}
        {page === "contact" && <ContactPage />}
        {page === "login" && <LoginPage setUser={setCurrentUser} setPage={setPage} />}
        {page === "dashboard" && (
          <UserDashboard
            currentUser={currentUser}
            emailNotifications={emailNotifications}
            goToListing={goToListing}
            listingsData={platformListings}
            pendingListings={pendingListings}
            submitListingForApproval={submitListingForApproval}
          />
        )}
        {page === "admin" && (
          <AdminDashboard
            approveListing={approveListing}
            emailNotifications={emailNotifications}
            listingsData={platformListings}
            pendingListings={pendingListings}
          />
        )}
        {page === "safety" && <SafetyPage />}
        {page === "terms" && <PolicyPage type="terms" />}
        {page === "privacy" && <PolicyPage type="privacy" />}
      </main>
      <Chatbot setPage={setPage} setFilters={setFilters} />
      <Footer setPage={setPage} />
    </>
  );
}

function Header({ page, setPage, currentUser, setCurrentUser }) {
  const [scrolled, setScrolled] = useState(false);
  const navItems = [
    ["rentals", "Rent"],
    ["houses", "Houses"],
    ["student", "Student"],
    ["airbnb", "Short Stays"],
    ["locations", "Locations"],
    ["advertise", "Advertise"],
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={scrolled ? "site-header hidden" : "site-header"}>
      <button className="brand" onClick={() => setPage("home")} aria-label="Go to NamRent home">
        <img className="brand-logo" src="/namrent-logo.png" alt="" />
      </button>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map(([key, label]) => (
          <button className={page === key ? "active" : ""} key={key} onClick={() => setPage(key)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="nav-actions">
        {currentUser ? (
          <>
            {currentUser.role === "landlord" && (
              <button className="nav-list-button" onClick={() => setPage("dashboard")}>Add listing</button>
            )}
            <button className="account-button" onClick={() => setPage(currentUser.role === "agent" ? "admin" : "dashboard")}>
              {currentUser.role === "agent" ? "Agent" : "Dashboard"}
            </button>
            <button className="account-button subtle" onClick={() => { setCurrentUser(null); setPage("home"); }}>Sign out</button>
          </>
        ) : (
          <button className="account-button" onClick={() => setPage("login")}>Sign in</button>
        )}
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ["home", "Home"],
          ["rentals", "Search"],
          ["student", "Student"],
          ["airbnb", "Stays"],
          [currentUser?.role === "landlord" ? "dashboard" : "advertise", currentUser?.role === "landlord" ? "Add" : "Ads"],
        ].map(([key, label]) => (
          <button className={page === key ? "active" : ""} key={key} onClick={() => setPage(key)}>
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Home({ currentUser, emailNotifications, listingsData, pendingListings, visitProfile, filters, setFilters, setPage, goToListing }) {
  const featured = getPersonalizedFeaturedListings(listingsData, visitProfile);
  const studentListings = listingsData.filter((listing) => listing.category === "Student rentals").slice(0, 3);
  const shortStayListings = listingsData.filter((listing) => listing.category === "Short stays").slice(0, 3);
  const topVisitedLocations = Object.entries(visitProfile.locations ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([location]) => location);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Windhoek first, Namibia next</p>
          <h1>Find Rentals in Windhoek, Fast and Easily</h1>
          <p>
            Search rooms, flats, student accommodation, apartments, townhouses, and family homes across Windhoek.
          </p>
          <SearchPanel filters={filters} setFilters={setFilters} onSearch={() => setPage("rentals")} />
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setPage("rentals")}>Search Rentals</button>
            <button className="secondary-button" onClick={() => setPage(currentUser?.role === "landlord" ? "dashboard" : "advertise")}>
              {currentUser?.role === "landlord" ? "Add Your Listing" : "Advertise With Us"}
            </button>
          </div>
        </div>
      </section>

      {currentUser && (
        <HomeDashboard
          currentUser={currentUser}
          emailNotifications={emailNotifications}
          featuredCount={featured.length}
          pendingListings={pendingListings}
          visitProfile={visitProfile}
          setPage={setPage}
        />
      )}

      <RentalFlashcards
        eyebrow={visitProfile.viewCount ? "Recommended" : "Featured"}
        title="Featured Rental Properties"
        text={
          visitProfile.viewCount
            ? `Suggested from your recent browsing${topVisitedLocations.length ? ` around ${topVisitedLocations.join(" and ")}` : ""}.`
            : "Promoted and high-interest rentals from around Windhoek."
        }
        flashListings={featured}
        goToListing={goToListing}
      />

      <StatsBand />

      <SponsoredCarousel />

      <RentalFlashcards
        className="pale"
        eyebrow="Students"
        title="Student Rentals in Windhoek"
        text="Affordable rooms, shared accommodation, bachelor flats, and residences near universities, colleges, and transport routes."
        flashListings={studentListings}
        goToListing={goToListing}
      />

      <section className="short-stay-section">
        <RentalFlashcards
          compact
          eyebrow="Airbnb-style stays"
          title="Short Stays and Furnished Guest Rentals"
          text="Nightly and weekly rentals for visitors, temporary workers, students on placement, and people relocating to Windhoek."
          flashListings={shortStayListings}
          goToListing={goToListing}
        />
        <button className="secondary-button section-action" onClick={() => setPage("airbnb")}>Browse Airbnb-Style Stays</button>
      </section>

      <BrowseLocations setFilters={setFilters} setPage={setPage} />
      <HowItWorks />
      <SafetyNotice />
    </>
  );
}

function HomeDashboard({ currentUser, emailNotifications, featuredCount, pendingListings, visitProfile, setPage }) {
  const ownPending = pendingListings.filter((listing) => listing.ownerEmail === currentUser.email);
  const ownEmails = emailNotifications.filter((email) => email.to === currentUser.email);
  const topVisitedLocation = Object.entries(visitProfile.locations ?? {}).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Start browsing";
  const roleLabel = currentUser.role === "agent" ? "Realtor Agent" : currentUser.role === "landlord" ? "Landlord" : "Renter";
  const action =
    currentUser.role === "landlord"
      ? { label: "Add a Listing", page: "dashboard" }
      : currentUser.role === "agent"
        ? { label: "Review Listings", page: "admin" }
        : { label: "Browse Rentals", page: "rentals" };

  return (
    <section className="home-dashboard">
      <div className="home-dashboard-copy">
        <p className="eyebrow">Welcome back</p>
        <h2>Hello, {currentUser.name}</h2>
        <p>
          You are signed in as a {roleLabel}. Your NamRent tools are now available directly from the home page.
        </p>
      </div>
      <div className="home-dashboard-stats">
        <article>
          <strong>{roleLabel}</strong>
          <span>Account type</span>
        </article>
        <article>
          <strong>{currentUser.role === "landlord" ? ownPending.length : featuredCount}</strong>
          <span>{currentUser.role === "landlord" ? "Pending listings" : "Featured rentals"}</span>
        </article>
        <article>
          <strong>{ownEmails.length}</strong>
          <span>Approval emails</span>
        </article>
        <article>
          <strong>{topVisitedLocation}</strong>
          <span>Most visited area</span>
        </article>
      </div>
      <button className="primary-button" onClick={() => setPage(action.page)}>{action.label}</button>
    </section>
  );
}

function SearchPanel({ filters, setFilters, onSearch, compact }) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <form className={compact ? "search-panel compact" : "search-panel"} onSubmit={(event) => { event.preventDefault(); onSearch?.(); }}>
      <label>
        <span>Search</span>
        <input
          value={filters.q}
          onChange={(event) => update("q", event.target.value)}
          placeholder="Location, room, flat, student..."
        />
      </label>
      <LocationDropdown value={filters.location} onChange={(value) => update("location", value)} />
      <PropertyTypeDropdown value={filters.type} onChange={(value) => update("type", value)} />
      <PriceRangeDropdown
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        onChange={(minPrice, maxPrice) => setFilters((current) => ({ ...current, minPrice, maxPrice }))}
      />
      <button className="primary-button" type="submit">Search</button>
    </form>
  );
}

function PropertyTypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const popularTypes = ["Room", "Bachelor flat", "Apartment", "Flat", "House", "Student accommodation"];
  const chooseType = (type) => {
    onChange(type);
    setOpen(false);
  };

  return (
    <div className="location-field">
      <span>Property Type</span>
      <button
        className={open ? "location-trigger open" : "location-trigger"}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{value || "Any type"}</span>
        <span className="dropdown-arrow" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="location-menu selector-menu">
          <div className="location-menu-top">
            <strong>Choose property type</strong>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
          </div>
          <p className="location-menu-label">Popular types</p>
          <div className="location-chip-grid">
            {popularTypes.map((type) => (
              <button className={value === type ? "selected" : ""} key={type} type="button" onClick={() => chooseType(type)}>
                {type}
              </button>
            ))}
          </div>
          <p className="location-menu-label">All property types</p>
          <div className="location-list">
            {propertyTypes.map((type) => (
              <button className={value === type ? "selected" : ""} key={type} type="button" onClick={() => chooseType(type)}>
                <span>{type}</span>
                <small>Rental type</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriceRangeDropdown({ minPrice, maxPrice, onChange }) {
  const [open, setOpen] = useState(false);
  const label = priceRanges.find((range) => range.min === minPrice && range.max === maxPrice)?.label;
  const displayValue = label || (minPrice || maxPrice ? `N$${minPrice || "0"} - ${maxPrice ? `N$${maxPrice}` : "Any"}` : "Any price");
  const chooseRange = (range) => {
    onChange(range.min, range.max);
    setOpen(false);
  };

  return (
    <div className="location-field">
      <span>Price Range</span>
      <button
        className={open ? "location-trigger open" : "location-trigger"}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{displayValue}</span>
        <span className="dropdown-arrow" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="location-menu selector-menu">
          <div className="location-menu-top">
            <strong>Choose monthly rent</strong>
            <button type="button" onClick={() => { onChange("", ""); setOpen(false); }}>Clear</button>
          </div>
          <div className="price-option-grid">
            {priceRanges.map((range) => (
              <button
                className={range.min === minPrice && range.max === maxPrice ? "selected" : ""}
                key={range.label}
                type="button"
                onClick={() => chooseRange(range)}
              >
                {range.label}
              </button>
            ))}
          </div>
          <p className="location-menu-label">Custom range</p>
          <div className="custom-price-grid">
            <label>
              <span>Minimum</span>
              <input value={minPrice} onChange={(event) => onChange(event.target.value, maxPrice)} inputMode="numeric" placeholder="N$ min" />
            </label>
            <label>
              <span>Maximum</span>
              <input value={maxPrice} onChange={(event) => onChange(minPrice, event.target.value)} inputMode="numeric" placeholder="N$ max" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredLocations = locations.filter((location) => location.toLowerCase().includes(query.trim().toLowerCase()));
  const popularLocations = ["Windhoek Central", "Academia", "Khomasdal", "Klein Windhoek", "Pioneers Park", "Eros"];
  const chooseLocation = (location) => {
    onChange(location);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="location-field">
      <span>Location</span>
      <button
        className={open ? "location-trigger open" : "location-trigger"}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{value || "All Windhoek areas"}</span>
        <span className="dropdown-arrow" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="location-menu">
          <div className="location-menu-top">
            <strong>Search by suburb or area</strong>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing a Windhoek suburb"
          />
          {!query && (
            <>
              <p className="location-menu-label">Popular areas</p>
              <div className="location-chip-grid">
                {popularLocations.map((location) => (
                  <button
                    className={value === location ? "selected" : ""}
                    key={location}
                    type="button"
                    onClick={() => chooseLocation(location)}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="location-menu-label">{query ? "Matching areas" : "All Windhoek areas"}</p>
          <div className="location-list">
            {filteredLocations.map((location) => (
              <button
                className={value === location ? "selected" : ""}
                key={location}
                type="button"
                onClick={() => chooseLocation(location)}
              >
                <span>{location}</span>
                <small>Windhoek</small>
              </button>
            ))}
            {!filteredLocations.length && <div className="location-empty">No matching area yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingsPage({ title, intro, filters, setFilters, listingsToShow, goToListing, studentMode, shortStayMode }) {
  return (
    <section className="section listings-shell">
      <SectionHeading eyebrow="Browse" title={title} text={intro} />
      <div className="listing-layout">
        <aside className="filter-panel">
          <h2>Filters</h2>
          <SearchPanel filters={filters} setFilters={setFilters} compact />
          <label>
            <span>Sort by</span>
            <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}>
              <option value="newest">Newest first</option>
              <option value="lowest">Lowest price first</option>
              <option value="highest">Highest price first</option>
              <option value="popular">Most popular</option>
              <option value="student">Student-friendly first</option>
            </select>
          </label>
          {studentMode && (
            <div className="mini-note">
              <strong>Student filters</strong>
              <p>Look for Wi-Fi, shared rooms, campus proximity, and utilities included before contacting the advertiser.</p>
            </div>
          )}
          {shortStayMode && (
            <div className="mini-note">
              <strong>Short-stay checks</strong>
              <p>Confirm nightly rate, minimum stay, cleaning fees, check-in rules, and cancellation terms before paying.</p>
            </div>
          )}
        </aside>
        <div>
          <div className="results-bar">
            <strong>{listingsToShow.length} rentals found</strong>
            <span>Windhoek launch area</span>
          </div>
          <ListingGrid listingsToShow={listingsToShow} goToListing={goToListing} />
        </div>
      </div>
    </section>
  );
}

function ListingGrid({ listingsToShow, goToListing }) {
  if (!listingsToShow.length) {
    return <div className="empty-state">No listings match these filters yet. Try widening your search.</div>;
  }
  return (
    <div className="listing-grid">
      {listingsToShow.map((listing) => <ListingCard key={listing.id} listing={listing} goToListing={goToListing} />)}
    </div>
  );
}

function ListingCard({ listing, goToListing }) {
  return (
    <article className="listing-card">
      <button className="image-button" onClick={() => goToListing(listing.id)}>
        <img src={listing.image} alt={listing.title} />
        {listing.isFeatured && <span className="image-badge">Featured</span>}
      </button>
      <div className="card-body">
        <div className="price-row">
          <strong>{currency.format(listing.price).replace("NAD", "N$")}</strong>
          <span>{listing.pricePeriod ?? "per month"}</span>
        </div>
        <h3>{listing.title}</h3>
          <p>{listing.location}, {listing.city}</p>
        <div className="spec-row">
          <span>{listing.bedrooms} bed</span>
          <span>{listing.bathrooms} bath</span>
          <span>{listing.parking} parking</span>
        </div>
        <div className="badge-row">
          {listing.badges.slice(0, 3).map((badge) => <span key={badge}>{badge}</span>)}
        </div>
        <button className="primary-button full" onClick={() => goToListing(listing.id)}>View Details</button>
      </div>
    </article>
  );
}

function PropertyDetails({ listing, setPage }) {
  return (
    <section className="details-page">
      <div className="details-gallery">
        <img className="main-photo" src={listing.gallery[0]} alt={listing.title} />
        <div className="thumb-grid">
          {listing.gallery.slice(1).map((image) => <img key={image} src={image} alt="" />)}
        </div>
      </div>
      <div className="details-layout">
        <article className="details-main">
          <div className="crumb">
            <button onClick={() => setPage("rentals")}>Rentals</button>
            <span>/</span>
            <span>{listing.location}</span>
          </div>
          <h1>{listing.title}</h1>
          <p className="details-price">{currency.format(listing.price).replace("NAD", "N$")} {listing.pricePeriod ?? "per month"}</p>
          <p>{listing.description}</p>
          <div className="details-stats">
            <span>{listing.bedrooms} bedrooms</span>
            <span>{listing.bathrooms} bathrooms</span>
            <span>{listing.parking} parking</span>
            <span>{listing.furnished}</span>
          </div>
          <h2>Property Details</h2>
          <dl className="detail-list">
            <div><dt>{listing.category === "Short stays" ? "Booking deposit" : "Deposit"}</dt><dd>{listing.deposit ? currency.format(listing.deposit).replace("NAD", "N$") : "Confirm with host"}</dd></div>
            <div><dt>Location</dt><dd>{listing.location}, {listing.city}</dd></div>
            <div><dt>Type</dt><dd>{listing.propertyType}</dd></div>
            <div><dt>Category</dt><dd>{listing.category}</dd></div>
            <div><dt>Utilities</dt><dd>{listing.utilities}</dd></div>
            <div><dt>Available</dt><dd>{listing.availableFrom}</dd></div>
          </dl>
          <h2>Amenities and Nearby Features</h2>
          <div className="feature-list">
            {listing.features.map((feature) => <span key={feature}>{feature}</span>)}
          </div>
          <SafetyNotice compact text={listing.safety} />
        </article>
        <aside className="contact-card">
          <h2>Contact Advertiser</h2>
          <p>{listing.contact.name}</p>
          {listing.contact.whatsapp && listing.contact.whatsapp !== "264000000000" ? (
            <a className="primary-button full" href={`https://wa.me/${listing.contact.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>
          ) : (
            <button className="ghost-button full">Verify on Facebook</button>
          )}
          {listing.contact.phone.startsWith("+") && <a className="secondary-button full" href={`tel:${listing.contact.phone}`}>Call</a>}
          <a className="secondary-button full" href={`mailto:${listing.contact.email}`}>Email</a>
          <button className="ghost-button full" onClick={() => setPage("safety")}>Rental Safety Tips</button>
        </aside>
      </div>
    </section>
  );
}

function SponsoredCarousel() {
  const [activeAd, setActiveAd] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const adverts = [
    {
      title: "Gencorp Investment CC",
      text: "Property development, investment opportunities, and real estate solutions.",
      image: "/ads/gencorp-investment.png",
    },
    {
      title: "PWA Railway",
      text: "Smart rail scanning, barcode tracking, and mobile-friendly inventory tools.",
      image: "/ads/pwa-railway.png",
    },
  ];
  const showPrevious = () => setActiveAd((current) => (current === 0 ? adverts.length - 1 : current - 1));
  const showNext = () => setActiveAd((current) => (current + 1) % adverts.length);
  const endDrag = () => {
    if (Math.abs(dragOffset) > 70) {
      if (dragOffset < 0) showNext();
      if (dragOffset > 0) showPrevious();
    }
    setDragStart(null);
    setDragOffset(0);
  };

  useEffect(() => {
    const timer = window.setInterval(showNext, 5000);
    return () => window.clearInterval(timer);
  }, [adverts.length]);

  return (
    <section className="section sponsored-section" aria-label="Sponsored advertisements">
      <div className="carousel-heading">
        <SectionHeading
          eyebrow="Sponsored"
          title="Featured Partners"
          text="Premium carousel placements for businesses that want to reach renters, students, and property seekers."
        />
      </div>
      <div
        className={dragStart === null ? "ad-carousel-viewport" : "ad-carousel-viewport dragging"}
        onPointerDown={(event) => {
          setDragStart(event.clientX);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart !== null) setDragOffset(event.clientX - dragStart);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="ad-carousel-track"
          style={{ transform: `translateX(calc(-${activeAd * 100}% + ${dragOffset}px))` }}
        >
          {adverts.map((advert) => (
            <article className="ad-carousel-card" key={advert.title}>
              <img src={advert.image} alt={`${advert.title} advertisement`} />
              <div className="carousel-caption">
                <span>Featured Partner</span>
                <h3>{advert.title}</h3>
                <p>{advert.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="carousel-dots" aria-label="Choose advert">
        {adverts.map((advert, index) => (
          <button
            className={index === activeAd ? "active" : ""}
            key={advert.title}
            onClick={() => setActiveAd(index)}
            aria-label={`Show ${advert.title}`}
          />
        ))}
      </div>
    </section>
  );
}

function RentalFlashcards({ eyebrow, title, text, flashListings, goToListing, className = "", compact = false }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const bufferCards = 4;
  const maxPage = Math.max(0, flashListings.length - bufferCards);
  const showPrevious = () => setPageIndex((current) => (current <= 0 ? maxPage : current - 1));
  const showNext = () => setPageIndex((current) => (current >= maxPage ? 0 : current + 1));
  const endDrag = () => {
    if (Math.abs(dragOffset) > 70) {
      if (dragOffset < 0) showNext();
      if (dragOffset > 0) showPrevious();
    }
    setDragStart(null);
    setDragOffset(0);
  };

  useEffect(() => {
    setPageIndex(0);
  }, [flashListings]);

  return (
    <section className={compact ? "room-flash-section compact" : `room-flash-section ${className}`.trim()}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        text={text}
      />
      <div
        className={dragStart === null ? "room-flash-viewport" : "room-flash-viewport dragging"}
        onPointerDown={(event) => {
          setDragStart(event.clientX);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart !== null) setDragOffset(event.clientX - dragStart);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button
          className="room-scroll-button left"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            showPrevious();
          }}
          aria-label="Show previous rental properties"
        >
          ‹
        </button>
        <div
          className="room-flash-track"
          style={{ transform: `translateX(calc((-${pageIndex} * var(--room-card-step)) + ${dragOffset}px))` }}
        >
          {flashListings.map((listing) => (
            <article className="room-flash-card" key={listing.id}>
              <img src={listing.image} alt={listing.title} />
              <h3>{listing.title}</h3>
              <p className="room-residence">{listing.location}, {listing.city}</p>
              <p>{currency.format(listing.price).replace("NAD", "N$")} {listing.pricePeriod ?? "per month"}</p>
              <button className="apply-button" onClick={() => goToListing(listing.id)}>View Details</button>
            </article>
          ))}
        </div>
        <button
          className="room-scroll-button right"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            showNext();
          }}
          aria-label="Show more rental properties"
        >
          ›
        </button>
      </div>
      <div className="room-dots" aria-label="Choose rental property">
        {flashListings.slice(0, maxPage + 1).map((listing, index) => (
          <button
            className={index === pageIndex ? "active" : ""}
            key={`${listing.id}-dot`}
            onClick={() => setPageIndex(index)}
            aria-label={`Show ${listing.title}`}
          />
        ))}
      </div>
    </section>
  );
}

function BrowseLocations({ setFilters, setPage }) {
  return (
    <section className="section">
      <SectionHeading eyebrow="Locations" title="Browse by Windhoek Area" text="Start with popular suburbs, then expand to coastal and national towns later." />
      <div className="location-grid">
        {locations.map((location) => (
          <button
            key={location}
            onClick={() => {
              setFilters((current) => ({ ...current, location }));
              setPage("rentals");
            }}
          >
            {location}
          </button>
        ))}
      </div>
    </section>
  );
}

function LocationsPage({ listingsData, goToListing, setFilters, setPage }) {
  return (
    <>
      <section className="section locations-intro">
        <SectionHeading eyebrow="Expansion" title="Locations" text="NamRent starts with Windhoek and is structured for broader Namibian coverage." />
      </section>
      <WindhoekMap listings={listingsData} goToListing={goToListing} setFilters={setFilters} setPage={setPage} />
      <section className="section">
        <h2>Windhoek launch areas</h2>
        <div className="location-grid">
          {locations.map((location) => (
            <button key={location} onClick={() => { setFilters((current) => ({ ...current, location })); setPage("rentals"); }}>
              {location}
            </button>
          ))}
        </div>
        <h2 className="top-gap">Future towns</h2>
        <div className="location-grid muted">
          {futureLocations.map((location) => <button key={location}>{location}</button>)}
        </div>
      </section>
    </>
  );
}

function HowItWorks() {
  return (
    <section className="section pale">
      <SectionHeading eyebrow="How it works" title="Simple for renters and advertisers" text="The MVP focuses on search, details, contact, submission, and listing approval." />
      <div className="steps-grid">
        {[
          ["Search", "Find rentals by location, price, type, and category."],
          ["Compare", "Review photos, rent, deposit, utilities, and availability."],
          ["Contact", "Reach the landlord, agent, or student accommodation provider."],
          ["Advertise", "Partners can book sponsored carousel placements."],
        ].map(([title, text], index) => (
          <article key={title}>
            <span>{index + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PropertyForm({ currentUser, onSubmitListing }) {
  const fields = [
    ["title", "Property title", "text"],
    ["location", "Location/suburb", "text"],
    ["price", "Monthly rental price", "number"],
    ["deposit", "Deposit amount", "number"],
    ["bedrooms", "Bedrooms", "text"],
    ["bathrooms", "Bathrooms", "number"],
    ["availableFrom", "Availability date", "date"],
    ["contactName", "Contact name", "text"],
    ["phone", "Phone number", "tel"],
    ["whatsapp", "WhatsApp number", "tel"],
    ["email", "Email address", "email"],
  ];
  const submitForm = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = data.get("title");
    const location = data.get("location");
    const propertyType = data.get("propertyType");
    const created = {
      title,
      description: data.get("description") || `${propertyType} submitted by ${currentUser?.name ?? "a landlord"} for NamRent approval.`,
      price: Number(data.get("price")),
      deposit: Number(data.get("deposit")),
      location,
      city: "Windhoek",
      propertyType,
      category: propertyType === "House" || propertyType === "Townhouse" ? "Family homes" : "Affordable rentals",
      bedrooms: data.get("bedrooms"),
      bathrooms: Number(data.get("bathrooms")),
      parking: data.get("amenities")?.toString().toLowerCase().includes("parking") ? 1 : 0,
      furnished: data.get("furnished"),
      utilities: "Confirm water/electricity details with advertiser",
      availableFrom: data.get("availableFrom") || "Confirm with advertiser",
      pricePeriod: "per month",
      badges: ["Pending Approval"],
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      ],
      contact: {
        name: data.get("contactName"),
        phone: data.get("phone"),
        whatsapp: String(data.get("whatsapp") || "").replace(/\D/g, ""),
        email: data.get("email"),
      },
      features: String(data.get("amenities") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      safety: "This landlord-submitted listing is reviewed by NamRent before publication.",
    };
    onSubmitListing(created);
    event.currentTarget.reset();
  };

  return (
    <form className="wide-form" onSubmit={submitForm}>
      <label>
        <span>Property type</span>
        <select name="propertyType">
          {propertyTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      {fields.map(([name, label, type]) => (
        <label key={name}>
          <span>{label}</span>
          <input name={name} type={type} defaultValue={name === "contactName" ? currentUser?.name ?? "" : name === "email" ? currentUser?.email ?? "" : ""} required />
        </label>
      ))}
      <label>
        <span>Furnished status</span>
        <select name="furnished">
          <option>Furnished</option>
          <option>Semi-furnished</option>
          <option>Unfurnished</option>
        </select>
      </label>
      <label className="full-field">
        <span>Description</span>
        <textarea name="description" rows="5" placeholder="Describe the rental, rules, utilities, security, parking, and nearby landmarks." />
      </label>
      <label className="full-field">
        <span>Optional amenities</span>
        <input name="amenities" placeholder="Parking, Wi-Fi, security, nearby campus, pet-friendly..." />
      </label>
      <button className="primary-button" type="submit">Submit for Approval</button>
    </form>
  );
}

function AdvertisePage() {
  const packages = [
    ["Basic Listing", "Normal search results placement with standard contact details."],
    ["Featured Listing", "Higher visibility in results and homepage featured sections."],
    ["Business Advertisement", "Banner or board placement for services like moving, furniture, internet, cleaning, or security."],
    ["Student Accommodation Promotion", "Featured placement inside the student rentals section."],
  ];

  return (
    <section className="section">
      <SectionHeading eyebrow="Advertising" title="Advertise With NamRent" text="Reach people actively searching for rental accommodation in Windhoek." />
      <div className="package-grid">
        {packages.map(([title, text]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
            <button className="secondary-button">Choose Package</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContactPage() {
  return (
    <section className="section form-page">
      <SectionHeading eyebrow="Support" title="Contact NamRent" text="For listing help, advertising enquiries, safety reports, or general questions." />
      <form className="wide-form contact-form" onSubmit={(event) => { event.preventDefault(); alert("Demo message received."); }}>
        <label><span>Name</span><input required /></label>
        <label><span>Email</span><input type="email" required /></label>
        <label><span>Topic</span><select><option>Rental enquiry</option><option>Advertise</option><option>Report listing</option><option>General support</option></select></label>
        <label className="full-field"><span>Message</span><textarea rows="6" required /></label>
        <button className="primary-button">Send Message</button>
      </form>
    </section>
  );
}

function LoginPage({ setUser, setPage }) {
  const demoUsers = [
    { role: "renter", label: "Renter", name: "Lisan Renter", email: "renter@namrent.na" },
    { role: "landlord", label: "Landlord", name: "Martha Landlord", email: "landlord@namrent.na" },
    { role: "agent", label: "Realtor Agent", name: "Realtor Agent", email: "agent@namrent.na" },
  ];
  const [mode, setMode] = useState("signin");
  const [role, setRole] = useState("renter");
  const selectedDemo = demoUsers.find((user) => user.role === role);
  const handleAuth = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const user = {
      role,
      name: data.get("name") || (mode === "signin" ? selectedDemo.name : "New NamRent User"),
      email: data.get("email") || selectedDemo.email,
    };
    setUser(user);
    setPage("home");
  };
  const handleSocialAuth = (provider) => {
    setUser({
      role,
      name: `${selectedDemo.label} via ${provider}`,
      email: `${selectedDemo.role}.${provider.toLowerCase()}@namrent.na`,
      provider,
    });
    setPage("home");
  };
  const handleAuthSuccess = (user) => {
    setUser(user);
    setPage("home");
  };

  return (
    <section className="section form-page auth-page">
      <div className="auth-header">
        <p className="eyebrow">Accounts</p>
        <h1>Access your NamRent profile</h1>
        <p>Sign in or create an account to browse, submit, or approve rentals.</p>
      </div>
      <div className="auth-grid">
        <form className="auth-card" onSubmit={handleAuth}>
          <div className="auth-tabs">
            <button className={mode === "signin" ? "active" : ""} type="button" onClick={() => setMode("signin")}>Sign in</button>
            <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>Sign up</button>
          </div>
          <h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <div className="role-picker">
            {demoUsers.map((user) => (
              <button className={role === user.role ? "selected" : ""} key={user.role} type="button" onClick={() => setRole(user.role)}>
                {user.label}
              </button>
            ))}
          </div>
          <div className="social-login-grid">
            <GoogleSignIn role={role} fallbackUser={selectedDemo} onSuccess={handleAuthSuccess} />
            <button className="social-login-button facebook" type="button" onClick={() => handleSocialAuth("Facebook")}>
              <span aria-hidden="true">f</span>
              Continue with Facebook
            </button>
          </div>
          <div className="auth-divider"><span>or use email</span></div>
          {mode === "signup" && <label><span>Full name</span><input name="name" placeholder="Your full name" autoComplete="name" required /></label>}
          <label><span>Email</span><input name="email" type="email" placeholder={selectedDemo.email} autoComplete="off" /></label>
          <label><span>Password</span><input type="password" placeholder={mode === "signin" ? "Enter password" : "Create password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
          {mode === "signup" && (
            <label><span>Phone number</span><input name="phone" type="tel" placeholder="+264 ..." autoComplete="tel" /></label>
          )}
          <button className="primary-button full">{mode === "signin" ? `Sign in as ${selectedDemo.label}` : `Sign up as ${selectedDemo.label}`}</button>
        </form>
        <article className="auth-side-card">
          <h2>{mode === "signin" ? "Need an account?" : "Already registered?"}</h2>
          <p>
            {mode === "signin"
              ? "Use Sign up to create a renter, landlord, or realtor agent profile."
              : "Use Sign in if you already have a NamRent profile."}
          </p>
          <button className="secondary-button full" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Go to Sign up" : "Go to Sign in"}
          </button>
          <h2>Role access</h2>
          <p><strong>Renter:</strong> browse rentals and saved options.</p>
          <p><strong>Landlord:</strong> submit a rental for NamRent approval.</p>
          <p><strong>Realtor Agent:</strong> review pending listings and trigger approval emails.</p>
        </article>
      </div>
    </section>
  );
}

function UserDashboard({ currentUser, emailNotifications, goToListing, listingsData, pendingListings, submitListingForApproval }) {
  if (!currentUser) {
    return (
      <section className="section">
        <SectionHeading eyebrow="Dashboard" title="Please sign in" text="Sign in as a renter, landlord, or realtor agent to continue." />
      </section>
    );
  }
  const ownPending = pendingListings.filter((listing) => listing.ownerEmail === currentUser.email);
  const ownEmails = emailNotifications.filter((email) => email.to === currentUser.email);

  if (currentUser.role === "landlord") {
    return (
      <section className="section dashboard-page">
        <SectionHeading eyebrow="Landlord Dashboard" title="Submit a Place for Listing" text="Your property will stay pending until NamRent approves it. Once approved, an email notification is generated for you." />
        {ownEmails.length > 0 && (
          <div className="email-panel">
            <h2>Approval Emails</h2>
            {ownEmails.map((email) => (
              <article key={email.id}>
                <strong>{email.subject}</strong>
                <p>{email.message}</p>
              </article>
            ))}
          </div>
        )}
        <PropertyForm currentUser={currentUser} onSubmitListing={submitListingForApproval} />
        <div className="admin-table">
          <div className="table-row head"><span>Your Submission</span><span>Status</span><span>Submitted</span></div>
          {ownPending.map((listing) => (
            <div className="table-row" key={listing.id}>
              <span>{listing.title}</span>
              <span>{listing.status}</span>
              <span>{new Date(listing.submittedAt).toLocaleDateString()}</span>
            </div>
          ))}
          {!ownPending.length && <div className="table-row"><span>No pending submissions yet.</span><span>-</span><span>-</span></div>}
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <SectionHeading eyebrow="Renter Dashboard" title={`Welcome, ${currentUser.name}`} text="Browse highlighted rentals and continue comparing places." />
      <ListingGrid listingsToShow={listingsData.slice(0, 2)} goToListing={goToListing} />
    </section>
  );
}

function AdminDashboard({ approveListing, emailNotifications, listingsData, pendingListings }) {
  const stats = [
    ["Total listings", listingsData.length],
    ["Awaiting approval", pendingListings.length],
    ["Active rentals", listingsData.length],
    ["Student listings", listingsData.filter((listing) => listing.category === "Student rentals").length],
    ["Short stays", listingsData.filter((listing) => listing.category === "Short stays").length],
    ["Advertisements", 2],
  ];

  return (
    <section className="section admin-page">
      <SectionHeading eyebrow="Realtor Agent" title="Approval Dashboard" text="Review landlord submissions, approve listings, and generate approval email notifications." />
      <div className="stat-grid">
        {stats.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
      </div>
      <div className="admin-table">
        <div className="table-row head"><span>Pending Listing</span><span>Status</span><span>Action</span></div>
        {pendingListings.map((listing) => (
          <div className="table-row" key={listing.id}>
            <span>{listing.title}</span>
            <span>{listing.status}</span>
            <button className="table-action" onClick={() => approveListing(listing.id)}>Approve</button>
          </div>
        ))}
        {!pendingListings.length && <div className="table-row"><span>No pending listings.</span><span>-</span><span>-</span></div>}
      </div>
      <div className="email-panel">
        <h2>Approval Email Log</h2>
        {emailNotifications.map((email) => (
          <article key={email.id}>
            <strong>{email.to}</strong>
            <p>{email.subject}: {email.message}</p>
          </article>
        ))}
        {!emailNotifications.length && <p>No approval emails generated yet.</p>}
      </div>
      <form className="import-panel" onSubmit={(event) => { event.preventDefault(); alert("Demo import staged. A full build would parse this text into pending listings."); }}>
        <h2>Facebook Group Import</h2>
        <p>Paste rental posts copied from a group, CSV export, or approved data source. Imported listings should remain pending until realtor agent verification.</p>
        <textarea rows="7" placeholder="Paste listing text here: title, location, price, bedrooms, contact details, and description..." />
        <button className="primary-button">Stage Imported Listings</button>
      </form>
    </section>
  );
}

function SafetyPage() {
  return (
    <section className="section">
      <SectionHeading eyebrow="Trust and safety" title="Rental Safety Tips" text="NamRent should help users avoid rental scams and verify listings before payment." />
      <div className="safety-list">
        {[
          "Always view a property before paying money.",
          "Confirm ownership or agent authority.",
          "Ask for written rental terms before sending a deposit.",
          "Be careful with urgent pressure to pay.",
          "Use verified contact details when possible.",
          "Report suspicious listings for admin review.",
        ].map((tip) => <p key={tip}>{tip}</p>)}
      </div>
    </section>
  );
}

function PolicyPage({ type }) {
  const isPrivacy = type === "privacy";
  return (
    <section className="section">
      <SectionHeading
        eyebrow="Policy"
        title={isPrivacy ? "Privacy Policy" : "Terms and Conditions"}
        text={isPrivacy ? "A placeholder privacy page for future legal review." : "A placeholder terms page for future legal review."}
      />
      <p className="policy-copy">
        This demo page should be reviewed by a qualified advisor before launch. It is included so the navigation and information architecture match the NamRent blueprint.
      </p>
    </section>
  );
}

function Chatbot({ setPage, setFilters }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi, I can help you find rentals, student rooms, short stays, advertising options, or safety tips." },
  ]);

  const quickActions = [
    ["Student rentals below N$4,000", () => { setFilters((current) => ({ ...current, category: "Student rentals", maxPrice: "4000", minPrice: "" })); setPage("student"); return "Showing student rentals below N$4,000."; }],
    ["Airbnb-style stays", () => { setFilters((current) => ({ ...current, category: "Short stays", maxPrice: "", minPrice: "" })); setPage("airbnb"); return "Showing Airbnb-style short stays and furnished guest rentals."; }],
    ["Advertise", () => { setPage("advertise"); return "I opened the advertising packages page."; }],
    ["Safety tips", () => { setPage("safety"); return "I opened rental safety tips. Always verify before paying deposits."; }],
  ];
  const answerQuestion = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("student") || lower.includes("campus") || lower.includes("residence")) {
      setPage("student");
      return "I opened Student Rentals. Listings include Villa Verdi, Mercury House, Capital Residence, and Winco Residence, with prices starting from about N$2,798 per month depending on provider and room type.";
    }
    if (lower.includes("villa") || lower.includes("verdi")) {
      setPage("student");
      return "Villa Verdi is listed under Student Rentals as a female student residence in Windhoek West, with shared and single room options.";
    }
    if (lower.includes("mercury")) {
      setPage("student");
      return "Mercury House is listed under Student Rentals as managed student accommodation in Windhoek West. Confirm current prices and availability with the provider.";
    }
    if (lower.includes("capital")) {
      setPage("student");
      return "Capital Residence is in Windhoek CBD with single, twin, triple, and quad rooms. Published prices range from N$2,798 to N$4,310 per month.";
    }
    if (lower.includes("winco")) {
      setPage("student");
      return "Winco Residence is in Windhoek CBD with twin and triple rooms. Published prices are around N$3,074 to N$3,242 per month.";
    }
    if (lower.includes("cheap") || lower.includes("affordable") || lower.includes("below")) {
      setFilters((current) => ({ ...current, maxPrice: "4000", minPrice: "" }));
      setPage("rentals");
      return "I filtered rentals below N$4,000. You can narrow further by location or property type.";
    }
    if (lower.includes("whatsapp") || lower.includes("contact") || lower.includes("landlord")) {
      return "Open any property card and use WhatsApp, Call, or Email on the details page. Always verify the property before paying a deposit.";
    }
    if (lower.includes("advert")) {
      setPage("advertise");
      return "I opened Advertising. NamRent supports sponsored carousel placements and business advertising packages.";
    }
    if (lower.includes("safe") || lower.includes("deposit") || lower.includes("scam")) {
      setPage("safety");
      return "I opened safety tips. View the property, confirm ownership or agent authority, and avoid paying deposits before verification.";
    }
    if (lower.includes("airbnb") || lower.includes("short")) {
      setPage("airbnb");
      return "I opened Airbnb-style short stays for furnished nightly or weekly accommodation.";
    }
    return "I can help with student residences, affordable rentals, locations, short stays, advertising, contacts, and safety. Try asking for student rentals in Windhoek or rentals below N$4,000.";
  };
  const submitQuestion = (event) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    const response = answerQuestion(trimmed);
    setMessages((current) => [...current, { from: "user", text: trimmed }, { from: "bot", text: response }]);
    setQuestion("");
  };

  return (
    <div className="chatbot">
      {open && (
        <section className="chat-window" aria-label="NamRent assistant">
          <header>
            <strong>NamRent Assistant</strong>
            <button onClick={() => setOpen(false)} aria-label="Close chat">x</button>
          </header>
          <div className="chat-messages">
            {messages.map((message, index) => <p className={message.from} key={`${message.text}-${index}`}>{message.text}</p>)}
          </div>
          <div className="quick-replies">
            {quickActions.map(([label, action]) => (
              <button key={label} onClick={() => setMessages((current) => [...current, { from: "bot", text: action() }])}>{label}</button>
            ))}
          </div>
          <form className="chat-input" onSubmit={submitQuestion}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about rentals, students, safety..."
            />
            <button>Send</button>
          </form>
        </section>
      )}
      <button className="chat-button" onClick={() => setOpen((current) => !current)} aria-label="Open NamRent assistant">
        Chat
      </button>
    </div>
  );
}

function StatsBand() {
  return (
    <section className="stats-band">
      <span><strong>17</strong> Windhoek areas</span>
      <span><strong>10+</strong> rental types</span>
      <span><strong>MVP</strong> ready for database growth</span>
    </section>
  );
}

function SafetyNotice({ compact, text }) {
  return (
    <aside className={compact ? "safety-notice compact" : "safety-notice"}>
      <strong>Rental Safety Notice</strong>
      <p>{text ?? "Always view a property and confirm ownership or agent details before making payments. Avoid sending deposits before verifying the rental place and advertiser."}</p>
    </aside>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Footer({ setPage }) {
  return (
    <footer className="site-footer">
      <div>
        <strong>NamRent</strong>
        <p>A locally focused rental platform for Windhoek, built for future Namibian expansion.</p>
        <p className="footer-credit">Topnotch Solutions Property</p>
      </div>
      <div className="footer-links">
        {[
          ["advertise", "Advertise with us"],
          ["safety", "Rental safety"],
          ["privacy", "Privacy policy"],
          ["terms", "Terms"],
          ["admin", "Realtor Agent"],
        ].map(([key, label]) => <button key={key} onClick={() => setPage(key)}>{label}</button>)}
      </div>
    </footer>
  );
}

createRoot(document.getElementById("root")).render(<App />);
