import { useState } from "react";
import { createAdminListing } from "../services/listingService.js";

const initialForm = {
  title: "",
  location: "Windhoek",
  area: "",
  price: "",
  deposit: "",
  waterIncluded: "no",
  electricityIncluded: "no",
  availableFrom: "",
  bedrooms: "",
  bathrooms: "",
  type: "Apartment",
  category: "Long-term rental",
  description: "",
  contactPhone: "",
  contactWhatsApp: "",
  adminNote: "",
};

function AdminCreateListingForm({ currentUser }) {
  const [formData, setFormData] = useState(initialForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) return "Please enter a listing title.";
    if (!formData.area.trim()) return "Please enter the suburb or area.";
    if (!formData.price || Number(formData.price) <= 0) return "Please enter a valid monthly price.";
    if (formData.deposit === "" || Number(formData.deposit) < 0) return "Please enter the deposit amount.";
    if (!formData.availableFrom) return "Please select availability.";
    if (!formData.bedrooms || Number(formData.bedrooms) < 0) return "Please enter bedrooms.";
    if (!formData.bathrooms || Number(formData.bathrooms) < 0) return "Please enter bathrooms.";
    if (!formData.description.trim()) return "Please enter a property description.";
    if (!formData.contactPhone.trim() && !formData.contactWhatsApp.trim()) return "Please add a contact number.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      await createAdminListing(formData, currentUser, imageFiles);
      setMessage("Admin listing created and published.");
      setFormData(initialForm);
      setImageFiles([]);
    } catch (saveError) {
      setError(saveError.message || "Failed to create admin listing.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="listing-form admin-create-form" onSubmit={handleSubmit} autoComplete="off">
      <div className="form-header">
        <p className="eyebrow">Admin listing</p>
        <h2>Add a listing directly</h2>
        <p>
          Listings created here are published immediately as approved NamRent listings.
        </p>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="form-grid">
        <label>
          Listing title
          <input value={formData.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Example: 2-bedroom flat in Eros" />
        </label>

        <label>
          Town / City
          <select value={formData.location} onChange={(event) => updateField("location", event.target.value)}>
            <option value="Windhoek">Windhoek</option>
            <option value="Swakopmund">Swakopmund</option>
            <option value="Walvis Bay">Walvis Bay</option>
            <option value="Oshakati">Oshakati</option>
            <option value="Rundu">Rundu</option>
          </select>
        </label>

        <label>
          Area / Suburb
          <input value={formData.area} onChange={(event) => updateField("area", event.target.value)} placeholder="Example: Windhoek West" />
        </label>

        <label>
          Monthly rent NAD
          <input type="number" min="0" value={formData.price} onChange={(event) => updateField("price", event.target.value)} placeholder="Example: 6500" />
        </label>

        <label>
          Deposit amount NAD
          <input type="number" min="0" value={formData.deposit} onChange={(event) => updateField("deposit", event.target.value)} placeholder="Example: 6500" />
        </label>

        <label>
          Available from
          <input type="date" value={formData.availableFrom} onChange={(event) => updateField("availableFrom", event.target.value)} />
        </label>

        <label>
          Property type
          <select value={formData.type} onChange={(event) => updateField("type", event.target.value)}>
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
          <select value={formData.category} onChange={(event) => updateField("category", event.target.value)}>
            <option value="Long-term rental">Long-term rental</option>
            <option value="Student rental">Student rental</option>
            <option value="Short stay">Short stay</option>
            <option value="Shared accommodation">Shared accommodation</option>
            <option value="Family rental">Family rental</option>
          </select>
        </label>

        <label>
          Water included?
          <select value={formData.waterIncluded} onChange={(event) => updateField("waterIncluded", event.target.value)}>
            <option value="yes">Yes, water is included</option>
            <option value="no">No, water is excluded</option>
            <option value="partial">Partially included</option>
          </select>
        </label>

        <label>
          Electricity included?
          <select value={formData.electricityIncluded} onChange={(event) => updateField("electricityIncluded", event.target.value)}>
            <option value="yes">Yes, electricity is included</option>
            <option value="no">No, electricity is excluded</option>
            <option value="prepaid">Prepaid electricity</option>
          </select>
        </label>

        <label>
          Bedrooms
          <input type="number" min="0" value={formData.bedrooms} onChange={(event) => updateField("bedrooms", event.target.value)} placeholder="Example: 2" />
        </label>

        <label>
          Bathrooms
          <input type="number" min="0" value={formData.bathrooms} onChange={(event) => updateField("bathrooms", event.target.value)} placeholder="Example: 1" />
        </label>

        <label>
          Phone number
          <input value={formData.contactPhone} onChange={(event) => updateField("contactPhone", event.target.value)} placeholder="Example: +264 81 000 0000" />
        </label>

        <label>
          WhatsApp number
          <input value={formData.contactWhatsApp} onChange={(event) => updateField("contactWhatsApp", event.target.value)} placeholder="Example: +264 81 000 0000" />
        </label>
      </div>

      <label className="full-width-field">
        Property description
        <textarea value={formData.description} onChange={(event) => updateField("description", event.target.value)} rows="5" />
      </label>

      <label className="full-width-field">
        Admin note
        <textarea value={formData.adminNote} onChange={(event) => updateField("adminNote", event.target.value)} rows="3" placeholder="Optional internal note" />
      </label>

      <label className="full-width-field">
        Listing photos
        <input type="file" accept="image/*" multiple onChange={(event) => setImageFiles(event.target.files)} />
      </label>

      <button className="primary-btn" type="submit" disabled={isSaving}>
        {isSaving ? "Publishing listing..." : "Publish listing"}
      </button>
    </form>
  );
}

export default AdminCreateListingForm;
