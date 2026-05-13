import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { listings, locations, futureLocations, propertyTypes, priceRanges } from "./namrentData.js";

const currency = new Intl.NumberFormat("en-NA", {
  style: "currency",
  currency: "NAD",
  maximumFractionDigits: 0,
});

function App() {
  const [page, setPage] = useState("home");
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

  const selectedListing = listings.find((listing) => listing.id === selectedListingId) ?? listings[0];

  const filteredListings = useMemo(() => {
    let results = listings.filter((listing) => {
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
  }, [filters]);

  const goToListing = (id) => {
    setSelectedListingId(id);
    setPage("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Header page={page} setPage={setPage} />
      <main>
        {page === "home" && (
          <Home
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
        {page === "locations" && <LocationsPage setFilters={setFilters} setPage={setPage} />}
        {page === "advertise" && <AdvertisePage />}
        {page === "contact" && <ContactPage />}
        {page === "login" && <LoginPage />}
        {page === "dashboard" && <UserDashboard goToListing={goToListing} />}
        {page === "admin" && <AdminDashboard />}
        {page === "safety" && <SafetyPage />}
        {page === "terms" && <PolicyPage type="terms" />}
        {page === "privacy" && <PolicyPage type="privacy" />}
      </main>
      <Chatbot setPage={setPage} setFilters={setFilters} />
      <Footer setPage={setPage} />
    </>
  );
}

function Header({ page, setPage }) {
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
        <button className="account-button" onClick={() => setPage("login")}>Sign in</button>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ["home", "Home"],
          ["rentals", "Search"],
          ["student", "Student"],
          ["airbnb", "Stays"],
          ["advertise", "Ads"],
        ].map(([key, label]) => (
          <button className={page === key ? "active" : ""} key={key} onClick={() => setPage(key)}>
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Home({ filters, setFilters, setPage, goToListing }) {
  const featured = listings.filter((listing) => listing.isFeatured);
  const studentListings = listings.filter((listing) => listing.category === "Student rentals").slice(0, 3);
  const shortStayListings = listings.filter((listing) => listing.category === "Short stays").slice(0, 3);

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
            <button className="secondary-button" onClick={() => setPage("advertise")}>Advertise With Us</button>
          </div>
        </div>
      </section>

      <RentalFlashcards
        eyebrow="Featured"
        title="Featured Rental Properties"
        text="Promoted and high-interest rentals from around Windhoek."
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

function LocationsPage({ setFilters, setPage }) {
  return (
    <section className="section">
      <SectionHeading eyebrow="Expansion" title="Locations" text="NamRent starts with Windhoek and is structured for broader Namibian coverage." />
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
  );
}

function HowItWorks() {
  return (
    <section className="section pale">
      <SectionHeading eyebrow="How it works" title="Simple for renters and advertisers" text="The MVP focuses on search, details, contact, submission, and admin approval." />
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

function PropertyForm() {
  const fields = [
    ["Property title", "text"],
    ["Location/suburb", "text"],
    ["Monthly rental price", "number"],
    ["Deposit amount", "number"],
    ["Bedrooms", "text"],
    ["Bathrooms", "number"],
    ["Availability date", "date"],
    ["Contact name", "text"],
    ["Phone number", "tel"],
    ["WhatsApp number", "tel"],
    ["Email address", "email"],
  ];

  return (
    <form className="wide-form" onSubmit={(event) => { event.preventDefault(); alert("Demo submission received. A real build would send this to admin approval."); }}>
      <label>
        <span>Property type</span>
        <select>
          {propertyTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      {fields.map(([label, type]) => (
        <label key={label}>
          <span>{label}</span>
          <input type={type} required />
        </label>
      ))}
      <label>
        <span>Furnished status</span>
        <select>
          <option>Furnished</option>
          <option>Semi-furnished</option>
          <option>Unfurnished</option>
        </select>
      </label>
      <label className="full-field">
        <span>Description</span>
        <textarea rows="5" placeholder="Describe the rental, rules, utilities, security, parking, and nearby landmarks." />
      </label>
      <label className="full-field">
        <span>Optional amenities</span>
        <input placeholder="Parking, Wi-Fi, security, nearby campus, pet-friendly..." />
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

function LoginPage() {
  return (
    <section className="section form-page">
      <SectionHeading eyebrow="Accounts" title="Login or Register" text="Account screens are prepared for renters, landlords, agents, and admins." />
      <div className="auth-grid">
        <form className="auth-card">
          <h2>Login</h2>
          <label><span>Email</span><input type="email" /></label>
          <label><span>Password</span><input type="password" /></label>
          <button className="primary-button full">Login</button>
        </form>
        <form className="auth-card">
          <h2>Create Account</h2>
          <label><span>Name</span><input /></label>
          <label><span>Email</span><input type="email" /></label>
          <label><span>Role</span><select><option>Renter</option><option>Landlord</option><option>Agent</option></select></label>
          <button className="secondary-button full">Register</button>
        </form>
      </div>
    </section>
  );
}

function UserDashboard({ goToListing }) {
  return (
    <section className="section">
      <SectionHeading eyebrow="Dashboard" title="Renter Dashboard" text="Saved listings, alerts, and enquiries will live here in the full build." />
      <ListingGrid listingsToShow={listings.slice(0, 2)} goToListing={goToListing} />
    </section>
  );
}

function AdminDashboard() {
  const stats = [
    ["Total listings", listings.length],
    ["Awaiting approval", 3],
    ["Active rentals", listings.length],
    ["Student listings", listings.filter((listing) => listing.category === "Student rentals").length],
    ["Short stays", listings.filter((listing) => listing.category === "Short stays").length],
    ["Advertisements", 2],
  ];

  return (
    <section className="section admin-page">
      <SectionHeading eyebrow="Admin" title="Platform Overview" text="A front-end admin panel concept for approvals, adverts, reports, and analytics." />
      <div className="stat-grid">
        {stats.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
      </div>
      <div className="admin-table">
        <div className="table-row head"><span>Listing</span><span>Status</span><span>Action</span></div>
        {listings.slice(0, 4).map((listing) => (
          <div className="table-row" key={listing.id}>
            <span>{listing.title}</span>
            <span>{listing.status}</span>
            <span>Review</span>
          </div>
        ))}
      </div>
      <form className="import-panel" onSubmit={(event) => { event.preventDefault(); alert("Demo import staged. A full build would parse this text into pending listings."); }}>
        <h2>Facebook Group Import</h2>
        <p>Paste rental posts copied from a group, CSV export, or approved data source. Imported listings should remain pending until admin verification.</p>
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
          ["admin", "Admin demo"],
        ].map(([key, label]) => <button key={key} onClick={() => setPage(key)}>{label}</button>)}
      </div>
    </footer>
  );
}

createRoot(document.getElementById("root")).render(<App />);
