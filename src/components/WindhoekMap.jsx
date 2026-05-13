import React, { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const windhoekAreas = [
  { name: "Katutura", position: [-22.5208, 17.0506] },
  { name: "Wanaheda", position: [-22.5018, 17.0584] },
  { name: "Hakahana", position: [-22.4912, 17.0403] },
  { name: "Khomasdal", position: [-22.5485, 17.0442] },
  { name: "Otjomuise", position: [-22.5402, 17.0031] },
  { name: "Hochland Park", position: [-22.5732, 17.0595] },
  { name: "Pioneers Park", position: [-22.5954, 17.0688] },
  { name: "Kleine Kuppe", position: [-22.6225, 17.0932] },
  { name: "Windhoek Central", position: [-22.5609, 17.0658] },
  { name: "Eros", position: [-22.5427, 17.0914] },
  { name: "Olympia", position: [-22.5956, 17.0943] },
  { name: "Cimbebasia", position: [-22.6247, 17.0591] },
  { name: "Rocky Crest", position: [-22.5515, 17.0155] },
  { name: "Dorado Park", position: [-22.5367, 17.0269] },
];

const markerIcon = L.divIcon({
  className: "namrent-map-marker",
  html: "<span></span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16],
});

const currency = new Intl.NumberFormat("en-NA", {
  style: "currency",
  currency: "NAD",
  maximumFractionDigits: 0,
});

function WindhoekMap({ listings, goToListing, setFilters, setPage }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const availableAreas = useMemo(() => new Set(listings.map((listing) => listing.location)), [listings]);
  const filteredListings = selectedLocation
    ? listings.filter((listing) => listing.location === selectedLocation)
    : listings.filter((listing) => windhoekAreas.some((area) => area.name === listing.location)).slice(0, 6);

  const chooseLocation = (location) => {
    setSelectedLocation(location);
    setFilters?.((current) => ({ ...current, location }));
  };

  const openLocationSearch = () => {
    if (selectedLocation) {
      setFilters?.((current) => ({ ...current, location: selectedLocation }));
    }
    setPage?.("rentals");
  };

  return (
    <section className="map-section">
      <div className="map-heading">
        <p className="eyebrow">Map search</p>
        <h2>Find Rentals by Location</h2>
        <p>Click a Windhoek area on the map to view available rentals.</p>
      </div>

      <div className="map-layout">
        <div className="map-box">
          <MapContainer center={[-22.5609, 17.0658]} zoom={12} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {windhoekAreas.map((area) => (
              <Marker
                eventHandlers={{ click: () => chooseLocation(area.name) }}
                icon={markerIcon}
                key={area.name}
                position={area.position}
              >
                <Popup>
                  <strong>{area.name}</strong>
                  <br />
                  {availableAreas.has(area.name) ? "View rentals in this area" : "No listings yet"}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside className="map-results">
          <div className="map-results-top">
            <span>{selectedLocation ? "Selected area" : "Windhoek overview"}</span>
            <h3>{selectedLocation || "Available Rentals"}</h3>
            <p>{filteredListings.length} rental{filteredListings.length === 1 ? "" : "s"} showing</p>
          </div>
          <div className="map-area-chips">
            {windhoekAreas.slice(0, 8).map((area) => (
              <button
                className={selectedLocation === area.name ? "active" : ""}
                key={area.name}
                onClick={() => chooseLocation(area.name)}
                type="button"
              >
                {area.name}
              </button>
            ))}
          </div>
          <div className="map-listings">
            {filteredListings.length > 0 ? (
              filteredListings.map((listing) => (
                <article className="map-listing-card" key={listing.id}>
                  <img src={listing.image} alt="" />
                  <div>
                    <h4>{listing.title}</h4>
                    <p>{listing.location} • {listing.propertyType}</p>
                    <strong>{currency.format(listing.price).replace("NAD", "N$")} {listing.pricePeriod ?? "per month"}</strong>
                  </div>
                  <button type="button" onClick={() => goToListing(listing.id)}>View</button>
                </article>
              ))
            ) : (
              <p className="map-empty">No listings available in this area yet. New landlord submissions will appear here after approval.</p>
            )}
          </div>
          <button className="secondary-button full" type="button" onClick={openLocationSearch}>
            {selectedLocation ? `Search ${selectedLocation}` : "Open All Rentals"}
          </button>
        </aside>
      </div>
    </section>
  );
}

export default WindhoekMap;
