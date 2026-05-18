import { useEffect, useState } from "react";
import CreateListingForm from "./CreateListingForm.jsx";
import {
  deleteListing,
  getMyListings,
} from "../services/listingService.js";

function getListingStatusInfo(status) {
  if (status === "approved") {
    return {
      label: "Approved",
      image: "OK",
      message: "Your listing is live on NamRent.",
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      image: "NO",
      message: "Your listing was rejected. Please check the admin note.",
    };
  }

  return {
    label: "Pending Review",
    image: "...",
    message: "Your listing is waiting for NamRent review.",
  };
}

function AdvertiserDashboard({ currentUser }) {
  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const loadMyListings = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setDashboardError("");

      const listings = await getMyListings(currentUser);

      setMyListings(listings);
    } catch (error) {
      setDashboardError(error.message || "Failed to load your listings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyListings();
  }, [currentUser]);

  const handleListingCreated = () => {
    loadMyListings();
  };

  const handleDeleteListing = async (listingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmed) return;

    try {
      await deleteListing(listingId);
      setMyListings((previousListings) =>
        previousListings.filter((listing) => listing.id !== listingId)
      );
    } catch (error) {
      alert(error.message || "Failed to delete listing.");
    }
  };

  if (!currentUser) {
    return (
      <main className="page-section">
        <div className="auth-card">
          <p className="eyebrow">Sign in required</p>
          <h1>Please sign in to access the advertiser dashboard.</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="page-section advertiser-dashboard">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">NamRent Advertiser</p>
          <h1>Manage your rental listings</h1>
          <p>
            Welcome, {currentUser.name || currentUser.email}. Create listings,
            track their approval status, and manage your rental adverts.
          </p>
        </div>

        <div className="dashboard-stat-card">
          <span>{myListings.length}</span>
          <p>Total listings</p>
        </div>
      </section>

      <section className="dashboard-layout">
        <div className="dashboard-main">
          <CreateListingForm
            currentUser={currentUser}
            onListingCreated={handleListingCreated}
          />
        </div>

        <aside className="dashboard-side">
          <div className="panel-card">
            <h2>Your listings</h2>

            {dashboardError && <p className="form-error">{dashboardError}</p>}

            {isLoading ? (
              <p>Loading your listings...</p>
            ) : myListings.length === 0 ? (
              <p>You have not created any listings yet.</p>
            ) : (
              <div className="my-listings-list">
                {myListings.map((listing) => {
                  const statusInfo = getListingStatusInfo(listing.status);
                  const mainImage =
                    listing.advertiserPhotos?.[0] ||
                    listing.image ||
                    listing.coverImage ||
                    "";

                  return (
                    <article className="advertiser-listing-card" key={listing.id}>
                      <div className="advertiser-listing-image">
                        {mainImage ? (
                          <img src={mainImage} alt={listing.title} />
                        ) : (
                          <span>{statusInfo.image}</span>
                        )}
                      </div>

                      <div className="advertiser-listing-content">
                        <div className="advertiser-listing-top">
                          <h3>{listing.title}</h3>
                          <span className={`status-pill ${listing.status}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <p>
                          {listing.area}, {listing.location}
                        </p>

                        <strong>
                          N${Number(listing.price || 0).toLocaleString()} / month
                        </strong>

                        <div className="listing-mini-details">
                          <span>{listing.bedrooms} bed</span>
                          <span>{listing.bathrooms} bath</span>
                          <span>
                            Deposit: N${Number(listing.deposit || 0).toLocaleString()}
                          </span>
                          <span>Available: {listing.availableFrom || "Not set"}</span>
                        </div>

                        <p className="small-note">{statusInfo.message}</p>

                        {listing.editedAfterSubmission && (
                          <p className="edit-warning">
                            Edited after submission. Waiting for NamRent admin review again.
                          </p>
                        )}

                        {listing.adminNote && (
                          <p className="admin-feedback">
                            <strong>Admin note:</strong> {listing.adminNote}
                          </p>
                        )}

                        <div className="advertiser-listing-actions">
                          <button className="secondary-btn">Update listing</button>

                          <button
                            className="text-danger-btn"
                            onClick={() => handleDeleteListing(listing.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default AdvertiserDashboard;
