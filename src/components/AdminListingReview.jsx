import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase.js";

function AdminListingReview({ currentUser }) {
  const [listings, setListings] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState({});
  const [isUpdating, setIsUpdating] = useState("");

  useEffect(() => {
    const listingsQuery = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const liveListings = snapshot.docs.map((listingDoc) => ({
          id: listingDoc.id,
          ...listingDoc.data(),
        }));

        setListings(liveListings);
      },
      (error) => {
        console.error("Failed to listen to listings:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateListingStatus = async (listingId, status, verificationStatus) => {
    try {
      setIsUpdating(listingId);

      const listingRef = doc(db, "listings", listingId);

      await updateDoc(listingRef, {
        status,
        verificationStatus,
        adminNote: selectedNotes[listingId] || "",
        reviewedBy: currentUser?.uid || "",
        reviewedByName: currentUser?.name || currentUser?.email || "NamRent Admin",
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      alert(error.message || "Failed to update listing.");
    } finally {
      setIsUpdating("");
    }
  };

  const updateNote = (listingId, value) => {
    setSelectedNotes((previous) => ({
      ...previous,
      [listingId]: value,
    }));
  };

  const pendingListings = listings.filter(
    (listing) =>
      listing.status === "pending_review" ||
      listing.status === "site_visit_required" ||
      listing.status === "verified"
  );

  return (
    <main className="page-section admin-review-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">NamRent Admin</p>
          <h1>Listing verification requests</h1>
          <p>
            New advertiser listings appear here in real time. Review the
            listing, verify the property, then approve or reject it.
          </p>
        </div>

        <div className="dashboard-stat-card">
          <span>{pendingListings.length}</span>
          <p>Needs review</p>
        </div>
      </section>

      <section className="admin-review-list">
        {pendingListings.length === 0 ? (
          <div className="panel-card">
            <h2>No pending listings</h2>
            <p>New advertiser submissions will appear here automatically.</p>
          </div>
        ) : (
          pendingListings.map((listing) => (
            <article className="admin-listing-card" key={listing.id}>
              <div className="admin-listing-main">
                <div>
                  <span className={`status-pill ${listing.status}`}>
                    {listing.status.replaceAll("_", " ")}
                  </span>

                  <h2>{listing.title}</h2>

                  <p className="listing-location">
                    {listing.area}, {listing.location}
                  </p>

                  <p className="listing-price">
                    N${Number(listing.price || 0).toLocaleString()} / month
                  </p>

                  <p>{listing.description}</p>
                </div>

                <div className="admin-listing-meta">
                  <p>
                    <strong>Advertiser:</strong>{" "}
                    {listing.ownerName || "Unknown advertiser"}
                  </p>
                  <p>
                    <strong>Email:</strong> {listing.ownerEmail || "Not provided"}
                  </p>
                  <p>
                    <strong>Phone:</strong> {listing.contactPhone || "Not provided"}
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
                </div>
              </div>

              <label className="admin-note-field">
                Admin review note
                <textarea
                  rows="3"
                  value={selectedNotes[listing.id] || listing.adminNote || ""}
                  onChange={(event) => updateNote(listing.id, event.target.value)}
                  placeholder="Example: Called advertiser. Site visit scheduled for Friday. Address still needs confirmation."
                />
              </label>

              <div className="admin-actions">
                <button
                  className="secondary-btn"
                  disabled={isUpdating === listing.id}
                  onClick={() =>
                    updateListingStatus(
                      listing.id,
                      "site_visit_required",
                      "visit_required"
                    )
                  }
                >
                  Mark for site visit
                </button>

                <button
                  className="secondary-btn"
                  disabled={isUpdating === listing.id}
                  onClick={() =>
                    updateListingStatus(listing.id, "verified", "verified")
                  }
                >
                  Mark as verified
                </button>

                <button
                  className="primary-btn"
                  disabled={isUpdating === listing.id}
                  onClick={() =>
                    updateListingStatus(listing.id, "approved", "verified")
                  }
                >
                  Approve listing
                </button>

                <button
                  className="danger-btn"
                  disabled={isUpdating === listing.id}
                  onClick={() =>
                    updateListingStatus(listing.id, "rejected", "failed_review")
                  }
                >
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default AdminListingReview;
