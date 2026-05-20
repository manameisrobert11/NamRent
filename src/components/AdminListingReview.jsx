import { useEffect, useMemo, useState } from "react";
import {
  createAdvertisementBoard,
  listenToAdvertisingRequests,
  updateAdvertisingRequestStatus,
} from "../services/advertisingService.js";
import {
  approveListing,
  listenToAdminListings,
  rejectListing,
  updateAdminListingDetails,
  updateListingClassification,
  uploadNamRentVerificationPhotos,
} from "../services/listingService.js";
import AdminCreateListingForm from "./AdminCreateListingForm.jsx";
import ListingPhotoGallery from "./ListingPhotoGallery.jsx";

function AdminListingReview({ currentUser }) {
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState("pending_review");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState({});
  const [verificationFiles, setVerificationFiles] = useState({});
  const [adminEdits, setAdminEdits] = useState({});
  const [advertisingRequests, setAdvertisingRequests] = useState([]);
  const [boardForm, setBoardForm] = useState({
    title: "",
    text: "",
    image: "",
    linkUrl: "",
  });
  const [boardMessage, setBoardMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState("");

  useEffect(() => {
    const unsubscribe = listenToAdminListings(setListings);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = listenToAdvertisingRequests(setAdvertisingRequests);
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

  const newAdvertisingRequests = useMemo(
    () => advertisingRequests.filter((request) => request.status === "new"),
    [advertisingRequests]
  );

  const approvedLongTermListings = useMemo(
    () => approvedListings.filter((listing) => listing.category === "Long-term rental"),
    [approvedListings]
  );

  const approvedStudentListings = useMemo(
    () => approvedListings.filter((listing) => listing.category === "Student rental"),
    [approvedListings]
  );

  const approvedShortStayListings = useMemo(
    () => approvedListings.filter((listing) => listing.category === "Short stay"),
    [approvedListings]
  );

  const approvedSharedListings = useMemo(
    () => approvedListings.filter((listing) => listing.category === "Shared accommodation"),
    [approvedListings]
  );

  const approvedFamilyListings = useMemo(
    () => approvedListings.filter((listing) => listing.category === "Family rental"),
    [approvedListings]
  );

  const visibleListings = useMemo(() => {
    if (activeTab === "rejected") return rejectedListings;
    return pendingListings;
  }, [activeTab, rejectedListings, pendingListings]);

  const approvedGroups = [
    ["Long-term rentals", approvedLongTermListings],
    ["Student rentals", approvedStudentListings],
    ["Short stays", approvedShortStayListings],
    ["Shared accommodation", approvedSharedListings],
    ["Family rentals", approvedFamilyListings],
  ].filter(([, groupListings]) => groupListings.length > 0);

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

  const updateAdminEdit = (listingId, field, value) => {
    setAdminEdits((previous) => ({
      ...previous,
      [listingId]: {
        ...previous[listingId],
        [field]: value,
      },
    }));
  };

  const getEditableType = (listing) =>
    adminEdits[listing.id]?.type ||
    (listing.type && listing.type !== "Uncategorized" ? listing.type : "Apartment");

  const getEditableCategory = (listing) =>
    adminEdits[listing.id]?.category ||
    (listing.category && listing.category !== "Uncategorized"
      ? listing.category
      : "Long-term rental");

  const getEditableValue = (listing, field, fallback = "") =>
    adminEdits[listing.id]?.[field] ?? listing[field] ?? fallback;

  const handleApprove = async (listing) => {
    try {
      setIsUpdating(listing.id);

      const files = verificationFiles[listing.id];

      if (files && files.length > 0) {
        await uploadNamRentVerificationPhotos(listing.id, files);
      }

      await approveListing(
        listing.id,
        currentUser,
        {
          type: getEditableType(listing),
          category: getEditableCategory(listing),
        }
      );
    } catch (error) {
      alert(error.message || "Failed to approve listing.");
    } finally {
      setIsUpdating("");
    }
  };

  const handleUpdateDetails = async (listing) => {
    try {
      setIsUpdating(listing.id);
      await updateAdminListingDetails(
        listing.id,
        currentUser,
        adminEdits[listing.id] || {}
      );
    } catch (error) {
      alert(error.message || "Failed to update listing details.");
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

  const handleUpdateClassification = async (listing) => {
    try {
      setIsUpdating(listing.id);
      await updateListingClassification(
        listing.id,
        currentUser,
        adminEdits[listing.id] || {
          type: getEditableType(listing),
          category: getEditableCategory(listing),
        }
      );
    } catch (error) {
      alert(error.message || "Failed to update listing category.");
    } finally {
      setIsUpdating("");
    }
  };

  const handleAdvertisingStatus = async (requestId, status) => {
    try {
      setIsUpdating(requestId);
      await updateAdvertisingRequestStatus(requestId, status, currentUser);
    } catch (error) {
      alert(error.message || "Failed to update advertising request.");
    } finally {
      setIsUpdating("");
    }
  };

  const updateBoardField = (field, value) => {
    setBoardForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCreateBoard = async (event) => {
    event.preventDefault();
    setBoardMessage("");

    if (!boardForm.title.trim() || !boardForm.text.trim() || !boardForm.image.trim()) {
      setBoardMessage("Please add a title, message, and image URL for the advert board.");
      return;
    }

    try {
      setIsUpdating("advert-board");
      await createAdvertisementBoard(boardForm, currentUser);
      setBoardForm({ title: "", text: "", image: "", linkUrl: "" });
      setBoardMessage("Advertisement board added to the homepage carousel.");
    } catch (error) {
      setBoardMessage(error.message || "Failed to add advertisement board.");
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
            photos, approve rentals, group live listings, and add admin listings.
          </p>
        </div>

        <div className="dashboard-stat-card">
          <span>{pendingListings.length}</span>
          <p>Pending</p>
        </div>
      </section>

      <section className="admin-advertising-panel">
        <div className="admin-group-heading">
          <div>
            <p className="eyebrow">Advertising</p>
            <h2>Advertising requests</h2>
          </div>
          <span>{newAdvertisingRequests.length} new</span>
        </div>

        <div className="advertising-admin-layout">
          <div className="advertising-request-list">
            {advertisingRequests.length === 0 ? (
              <div className="panel-card">
                <h2>No advertising requests</h2>
                <p>Requests submitted from the advertising page will appear here.</p>
              </div>
            ) : (
              advertisingRequests.map((request) => (
                <article className="advertising-request-card" key={request.id}>
                  <div>
                    <span className={`request-status ${request.status}`}>{request.status}</span>
                    <h3>{request.packageType}</h3>
                    <p><strong>{request.businessName}</strong> - {request.name}</p>
                    <p>{request.email} | {request.phone}</p>
                    <p>{request.targetAudience} | {request.budgetRange}</p>
                    <p>{request.message}</p>
                  </div>
                  <div className="request-actions">
                    {["contacted", "approved", "rejected", "completed"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={isUpdating === request.id}
                        onClick={() => handleAdvertisingStatus(request.id, status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>

          <form className="advert-board-form" onSubmit={handleCreateBoard}>
            <h2>Add homepage advert board</h2>
            <p>Create a new board for the existing sponsored carousel.</p>
            {boardMessage && <p className="small-note">{boardMessage}</p>}
            <label>
              Board title
              <input
                value={boardForm.title}
                onChange={(event) => updateBoardField("title", event.target.value)}
                placeholder="Example: TopNotch Property Solutions"
              />
            </label>
            <label>
              Short message
              <textarea
                rows="4"
                value={boardForm.text}
                onChange={(event) => updateBoardField("text", event.target.value)}
                placeholder="Short advert message for the carousel."
              />
            </label>
            <label>
              Image URL
              <input
                value={boardForm.image}
                onChange={(event) => updateBoardField("image", event.target.value)}
                placeholder="/ads/my-advert.png or https://..."
              />
            </label>
            <label>
              Link URL optional
              <input
                value={boardForm.linkUrl}
                onChange={(event) => updateBoardField("linkUrl", event.target.value)}
                placeholder="https://example.com"
              />
            </label>
            <button className="primary-btn" type="submit" disabled={isUpdating === "advert-board"}>
              {isUpdating === "advert-board" ? "Adding board..." : "Add advert board"}
            </button>
          </form>
        </div>
      </section>

      <section className="admin-create-panel">
        <div>
          <p className="eyebrow">Direct publishing</p>
          <h2>Add a NamRent listing</h2>
          <p>
            Admin-created listings are approved immediately and appear publicly in the selected category.
          </p>
        </div>
        <button
          className="primary-btn"
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
        >
          {showCreateForm ? "Hide form" : "Add listing"}
        </button>
      </section>

      {showCreateForm && (
        <section className="admin-create-form-wrap">
          <AdminCreateListingForm currentUser={currentUser} />
        </section>
      )}

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

      {activeTab === "approved" ? (
        <section className="admin-approved-groups">
          {approvedGroups.length === 0 ? (
            <div className="panel-card">
              <h2>No approved listings</h2>
              <p>Approved listings will be grouped by category here.</p>
            </div>
          ) : (
            approvedGroups.map(([groupTitle, groupListings]) => (
              <section className="admin-approved-group" key={groupTitle}>
                <div className="admin-group-heading">
                  <h2>{groupTitle}</h2>
                  <span>{groupListings.length} listing{groupListings.length === 1 ? "" : "s"}</span>
                </div>

                <div className="admin-review-list">
                  {groupListings.map((listing) => (
                    <AdminListingCard
                      activeTab={activeTab}
                      getEditableCategory={getEditableCategory}
                      getEditableType={getEditableType}
                      handleApprove={handleApprove}
                      handleReject={handleReject}
                      handleUpdateDetails={handleUpdateDetails}
                      handleUpdateClassification={handleUpdateClassification}
                      getEditableValue={getEditableValue}
                      isUpdating={isUpdating}
                      key={listing.id}
                      listing={listing}
                      selectedNotes={selectedNotes}
                      updateAdminEdit={updateAdminEdit}
                      updateNote={updateNote}
                      updateVerificationFiles={updateVerificationFiles}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </section>
      ) : (
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
              <AdminListingCard
                activeTab={activeTab}
                getEditableCategory={getEditableCategory}
                getEditableType={getEditableType}
                handleApprove={handleApprove}
                handleReject={handleReject}
                handleUpdateDetails={handleUpdateDetails}
                handleUpdateClassification={handleUpdateClassification}
                getEditableValue={getEditableValue}
                isUpdating={isUpdating}
                key={listing.id}
                listing={listing}
                selectedNotes={selectedNotes}
                updateAdminEdit={updateAdminEdit}
                updateNote={updateNote}
                updateVerificationFiles={updateVerificationFiles}
              />
            ))
          )}
        </section>
      )}
    </main>
  );
}

function AdminListingCard({
  activeTab,
  getEditableCategory,
  getEditableType,
  getEditableValue,
  handleApprove,
  handleReject,
  handleUpdateDetails,
  handleUpdateClassification,
  isUpdating,
  listing,
  selectedNotes,
  updateAdminEdit,
  updateNote,
  updateVerificationFiles,
}) {
  return (
    <article className="admin-listing-card">
      <div className="admin-listing-main">
        <div>
          <div className="admin-card-topline">
            <span className={`status-pill ${listing.status}`}>
              {listing.status.replaceAll("_", " ")}
            </span>

            {listing.editedAfterSubmission && (
              <span className="edit-alert-pill">Edited by advertiser</span>
            )}
          </div>

          <h2>{listing.title}</h2>
          <p className="listing-location">{listing.area}, {listing.location}</p>
          <p className="listing-price">N${Number(listing.price || 0).toLocaleString()} / month</p>
          <p>{listing.description}</p>

          <ListingPhotoGallery photos={listing.advertiserPhotos || []} title={listing.title} />
        </div>

        <div className="admin-listing-meta">
          <p><strong>Advertiser:</strong> {listing.ownerName || "Unknown advertiser"}</p>
          <p><strong>Email:</strong> {listing.ownerEmail || "Not provided"}</p>
          <p><strong>Phone:</strong> {listing.contactPhone || "Not provided"}</p>
          <p><strong>WhatsApp:</strong> {listing.contactWhatsApp || "Not provided"}</p>
          <p><strong>Type:</strong> {listing.type}</p>
          <p><strong>Category:</strong> {listing.category}</p>
          <p><strong>Rooms:</strong> {listing.bedrooms} bed, {listing.bathrooms} bath</p>
          <p><strong>Deposit:</strong> N${Number(listing.deposit || 0).toLocaleString()}</p>
          <p><strong>Available:</strong> {listing.availableFrom || "Not set"}</p>
          <p><strong>Water:</strong> {listing.waterIncluded || "not provided"}</p>
          <p><strong>Electricity:</strong> {listing.electricityIncluded || "not provided"}</p>
          <p><strong>Verification:</strong> {listing.verificationStatus || "not_verified"}</p>
        </div>
      </div>

      <label className="admin-note-field">
        Admin review note
        <textarea
          rows="3"
          value={selectedNotes[listing.id] || listing.adminNote || ""}
          onChange={(event) => updateNote(listing.id, event.target.value)}
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
            onChange={(event) => updateVerificationFiles(listing.id, event.target.files)}
          />
          <small>Upload photos taken by NamRent during verification.</small>
        </label>
      )}

      {listing.namrentVerificationPhotos?.length > 0 && (
        <div className="verification-photo-section">
          <h3>NamRent verification photos</h3>
          <ListingPhotoGallery
            photos={listing.namrentVerificationPhotos || []}
            title={`${listing.title} verification`}
          />
        </div>
      )}

      {activeTab === "pending_review" && (
        <div className="admin-edit-grid">
          <label>
            Listing title
            <input
              value={getEditableValue(listing, "title")}
              onChange={(event) => updateAdminEdit(listing.id, "title", event.target.value)}
            />
          </label>

          <label>
            Town / City
            <input
              value={getEditableValue(listing, "location")}
              onChange={(event) => updateAdminEdit(listing.id, "location", event.target.value)}
            />
          </label>

          <label>
            Area / Suburb
            <input
              value={getEditableValue(listing, "area")}
              onChange={(event) => updateAdminEdit(listing.id, "area", event.target.value)}
            />
          </label>

          <label>
            Monthly rent NAD
            <input
              min="0"
              type="number"
              value={getEditableValue(listing, "price", "")}
              onChange={(event) => updateAdminEdit(listing.id, "price", event.target.value)}
            />
          </label>

          <label>
            Deposit NAD
            <input
              min="0"
              type="number"
              value={getEditableValue(listing, "deposit", "")}
              onChange={(event) => updateAdminEdit(listing.id, "deposit", event.target.value)}
            />
          </label>

          <label>
            Available from
            <input
              type="date"
              value={getEditableValue(listing, "availableFrom", "")}
              onChange={(event) => updateAdminEdit(listing.id, "availableFrom", event.target.value)}
            />
          </label>

          <label>
            Bedrooms
            <input
              min="0"
              type="number"
              value={getEditableValue(listing, "bedrooms", "")}
              onChange={(event) => updateAdminEdit(listing.id, "bedrooms", event.target.value)}
            />
          </label>

          <label>
            Bathrooms
            <input
              min="0"
              type="number"
              value={getEditableValue(listing, "bathrooms", "")}
              onChange={(event) => updateAdminEdit(listing.id, "bathrooms", event.target.value)}
            />
          </label>

          <label>
            Water included?
            <select
              value={getEditableValue(listing, "waterIncluded", "no")}
              onChange={(event) => updateAdminEdit(listing.id, "waterIncluded", event.target.value)}
            >
              <option value="yes">Yes, water is included</option>
              <option value="no">No, water is excluded</option>
              <option value="partial">Partially included</option>
            </select>
          </label>

          <label>
            Electricity included?
            <select
              value={getEditableValue(listing, "electricityIncluded", "no")}
              onChange={(event) => updateAdminEdit(listing.id, "electricityIncluded", event.target.value)}
            >
              <option value="yes">Yes, electricity is included</option>
              <option value="no">No, electricity is excluded</option>
              <option value="prepaid">Prepaid electricity</option>
            </select>
          </label>

          <label>
            Phone number
            <input
              value={getEditableValue(listing, "contactPhone")}
              onChange={(event) => updateAdminEdit(listing.id, "contactPhone", event.target.value)}
            />
          </label>

          <label>
            WhatsApp number
            <input
              value={getEditableValue(listing, "contactWhatsApp")}
              onChange={(event) => updateAdminEdit(listing.id, "contactWhatsApp", event.target.value)}
            />
          </label>

          <label className="full-width-field">
            Description
            <textarea
              rows="4"
              value={getEditableValue(listing, "description")}
              onChange={(event) => updateAdminEdit(listing.id, "description", event.target.value)}
            />
          </label>
        </div>
      )}

      <div className="admin-category-grid">
        <label>
          Property type
          <select
            value={getEditableType(listing)}
            onChange={(event) => updateAdminEdit(listing.id, "type", event.target.value)}
          >
            <option value="Apartment">Apartment</option>
            <option value="Flat">Flat</option>
            <option value="Room">Room</option>
            <option value="House">House</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Student accommodation">Student accommodation</option>
          </select>
        </label>

        <label>
          Rental category
          <select
            value={getEditableCategory(listing)}
            onChange={(event) => updateAdminEdit(listing.id, "category", event.target.value)}
          >
            <option value="Long-term rental">Long-term rental</option>
            <option value="Student rental">Student rental</option>
            <option value="Short stay">Short stay</option>
            <option value="Shared accommodation">Shared accommodation</option>
            <option value="Family rental">Family rental</option>
          </select>
        </label>
      </div>

      <div className="admin-actions">
        {activeTab === "pending_review" && (
          <button
            className="secondary-btn"
            disabled={isUpdating === listing.id}
            onClick={() => handleUpdateDetails(listing)}
          >
            Save details
          </button>
        )}

        {activeTab === "approved" && (
          <button
            className="secondary-btn"
            disabled={isUpdating === listing.id}
            onClick={() => handleUpdateClassification(listing)}
          >
            Save category
          </button>
        )}

        {activeTab === "pending_review" && (
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
  );
}

export default AdminListingReview;
