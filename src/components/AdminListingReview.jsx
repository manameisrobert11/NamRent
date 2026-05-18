import { useEffect, useMemo, useState } from "react";
import {
  approveListing,
  listenToAdminListings,
  rejectListing,
  uploadNamRentVerificationPhotos,
} from "../services/listingService.js";

function AdminListingReview({ currentUser }) {
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState("pending_review");
  const [selectedNotes, setSelectedNotes] = useState({});
  const [verificationFiles, setVerificationFiles] = useState({});
  const [isUpdating, setIsUpdating] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAdminListings(setListings);
    return () => unsubscribe();
  }, []);

  const pendingListings = useMemo(
    () => listings.filter((listing) => listing.status === "pending_review"),
    [listings]
  );

  const approvedListings = useMemo(
    () => listings.filter((listing) => listing.status === "approved"),
    [listings]
  );

  const rejectedListings = useMemo(
    () => listings.filter((listing) => listing.status === "rejected"),
    [listings]
  );

  const visibleListings = useMemo(() => {
    if (activeTab === "approved") return approvedListings;
    if (activeTab === "rejected") return rejectedListings;
    return pendingListings;
  }, [activeTab, approvedListings, rejectedListings, pendingListings]);

  const updateNote = (listingId, value) => {
    setSelectedNotes((previous) => ({
      ...previous,
      [listingId]: value,
    }));
  };

  const updateVerificationFiles = (listingId, files) => {
    setVerificationFiles((previous) => ({
      ...previous,
      [listingId]: files,
    }));
  };

  const handleApprove = async (listing) => {
    try {
      setIsUpdating(listing.id);

      const files = verificationFiles[listing.id];

      if (files && files.length > 0) {
        await uploadNamRentVerificationPhotos(listing.id, files);
      }

      await approveListing(listing.id, currentUser);
    } catch (error) {
      alert(error.message || "Failed to approve listing.");
    } finally {
      setIsUpdating("");
    }
  };

  const handleReject = async (listing) => {
    try {
      setIsUpdating(listing.id);

      await rejectListing(
        listing.id,
        selectedNotes[listing.id] || listing.adminNote || "",
        currentUser
      );
    } catch (error) {
      alert(error.message || "Failed to reject listing.");
    } finally {
      setIsUpdating("");
    }
  };

  return (
    <main className="page-section admin-review-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">NamRent Admin</p>
          <h1>Listing management</h1>
          <p>
            Review new advertiser submissions, upload NamRent verification
            photos, approve rentals, and monitor rejected listings.
          </p>
        </div>

        <div className="dashboard-stat-card">
          <span>{pendingListings.length}</span>
          <p>Pending</p>
        </div>
      </section>

      <section className="admin-tabs">
        <button
          className={activeTab === "pending_review" ? "active" : ""}
          onClick={() => setActiveTab("pending_review")}
        >
          Pending ({pendingListings.length})
        </button>

        <button
          className={activeTab === "approved" ? "active" : ""}
          onClick={() => setActiveTab("approved")}
        >
          Approved ({approvedListings.length})
        </button>

        <button
          className={activeTab === "rejected" ? "active" : ""}
          onClick={() => setActiveTab("rejected")}
        >
          Rejected ({rejectedListings.length})
        </button>
      </section>

      <section className="admin-review-list">
        {visibleListings.length === 0 ? (
          <div className="panel-card">
            <h2>No listings here</h2>
            <p>
              Listings will appear here automatically when their status matches
              this section.
            </p>
          </div>
        ) : (
          visibleListings.map((listing) => (
            <article className="admin-listing-card" key={listing.id}>
              <div className="admin-listing-main">
                <div>
                  <div className="admin-card-topline">
                    <span className={`status-pill ${listing.status}`}>
                      {listing.status.replaceAll("_", " ")}
                    </span>

                    {listing.editedAfterSubmission && (
                      <span className="edit-alert-pill">
                        Edited by advertiser
                      </span>
                    )}
                  </div>

                  <h2>{listing.title}</h2>

                  <p className="listing-location">
                    {listing.area}, {listing.location}
                  </p>

                  <p className="listing-price">
                    N${Number(listing.price || 0).toLocaleString()} / month
                  </p>

                  <p>{listing.description}</p>

                  {listing.advertiserPhotos?.length > 0 && (
                    <div className="listing-photo-grid">
                      {listing.advertiserPhotos.map((photoUrl) => (
                        <img
                          key={photoUrl}
                          src={photoUrl}
                          alt="Advertiser uploaded property"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-listing-meta">
                  <p>
                    <strong>Advertiser:</strong>{" "}
                    {listing.ownerName || "Unknown advertiser"}
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    {listing.ownerEmail || "Not provided"}
                  </p>
                  <p>
                    <strong>Phone:</strong>{" "}
                    {listing.contactPhone || "Not provided"}
                  </p>
                  <p>
                    <strong>WhatsApp:</strong>{" "}
                    {listing.contactWhatsApp || "Not provided"}
                  </p>
                  <p>
                    <strong>Type:</strong> {listing.type}
                  </p>
                  <p>
                    <strong>Category:</strong> {listing.category}
                  </p>
                  <p>
                    <strong>Rooms:</strong> {listing.bedrooms} bed,{" "}
                    {listing.bathrooms} bath
                  </p>
                  <p>
                    <strong>Verification:</strong>{" "}
                    {listing.verificationStatus || "not_verified"}
                  </p>
                </div>
              </div>

              <label className="admin-note-field">
                Admin review note
                <textarea
                  rows="3"
                  value={selectedNotes[listing.id] || listing.adminNote || ""}
                  onChange={(event) =>
                    updateNote(listing.id, event.target.value)
                  }
                  placeholder="Example: Site visit completed. Property details match the submitted listing."
                />
              </label>

              {activeTab !== "rejected" && (
                <label className="admin-note-field">
                  NamRent verification photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                      updateVerificationFiles(listing.id, event.target.files)
                    }
                  />
                  <small>
                    Upload photos taken by NamRent during verification.
                  </small>
                </label>
              )}

              {listing.namrentVerificationPhotos?.length > 0 && (
                <div className="verification-photo-section">
                  <h3>NamRent verification photos</h3>
                  <div className="listing-photo-grid">
                    {listing.namrentVerificationPhotos.map((photoUrl) => (
                      <img
                        key={photoUrl}
                        src={photoUrl}
                        alt="NamRent verification"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="admin-actions">
                {activeTab !== "approved" && (
                  <button
                    className="primary-btn"
                    disabled={isUpdating === listing.id}
                    onClick={() => handleApprove(listing)}
                  >
                    Approve listing
                  </button>
                )}

                {activeTab !== "rejected" && (
                  <button
                    className="danger-btn"
                    disabled={isUpdating === listing.id}
                    onClick={() => handleReject(listing)}
                  >
                    Reject listing
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default AdminListingReview;
