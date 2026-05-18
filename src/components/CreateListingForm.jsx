import { useState } from "react";
import { createListing } from "../services/listingService.js";

const initialForm = {
  title: "",
  location: "Windhoek",
  area: "",
  price: "",
  bedrooms: "",
  bathrooms: "",
  type: "Apartment",
  category: "Long-term rental",
  description: "",
  contactPhone: "",
  contactWhatsApp: "",
};

function CreateListingForm({ currentUser, onListingCreated }) {
  const [formData, setFormData] = useState(initialForm);
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
    if (!formData.price || Number(formData.price) <= 0) {
      return "Please enter a valid monthly price.";
    }
    if (!formData.bedrooms || Number(formData.bedrooms) < 0) {
      return "Please enter the number of bedrooms.";
    }
    if (!formData.bathrooms || Number(formData.bathrooms) < 0) {
      return "Please enter the number of bathrooms.";
    }
    if (!formData.description.trim()) {
      return "Please enter a short property description.";
    }
    if (!formData.contactPhone.trim() && !formData.contactWhatsApp.trim()) {
      return "Please add at least one contact number.";
    }

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

      const savedListing = await createListing(formData, currentUser);

      setMessage(
        "Listing submitted successfully. It is now pending review."
      );

      setFormData(initialForm);

      if (onListingCreated) {
        onListingCreated(savedListing);
      }
    } catch (saveError) {
      setError(saveError.message || "Failed to save listing.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="listing-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <p className="eyebrow">Advertiser Dashboard</p>
        <h2>Create a new rental listing</h2>
        <p>
          Add the rental details below. New listings will be reviewed before
          being shown publicly on NamRent.
        </p>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="form-grid">
        <label>
          Listing title
          <input
            type="text"
            value={formData.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Example: Modern 2-bedroom flat in Windhoek West"
          />
        </label>

        <label>
          Town / City
          <select
            value={formData.location}
            onChange={(event) => updateField("location", event.target.value)}
          >
            <option value="Windhoek">Windhoek</option>
            <option value="Swakopmund">Swakopmund</option>
            <option value="Walvis Bay">Walvis Bay</option>
            <option value="Oshakati">Oshakati</option>
            <option value="Rundu">Rundu</option>
          </select>
        </label>

        <label>
          Area / Suburb
          <input
            type="text"
            value={formData.area}
            onChange={(event) => updateField("area", event.target.value)}
            placeholder="Example: Khomasdal, Academia, Eros"
          />
        </label>

        <label>
          Monthly rent NAD
          <input
            type="number"
            min="0"
            value={formData.price}
            onChange={(event) => updateField("price", event.target.value)}
            placeholder="Example: 6500"
          />
        </label>

        <label>
          Bedrooms
          <input
            type="number"
            min="0"
            value={formData.bedrooms}
            onChange={(event) => updateField("bedrooms", event.target.value)}
            placeholder="Example: 2"
          />
        </label>

        <label>
          Bathrooms
          <input
            type="number"
            min="0"
            value={formData.bathrooms}
            onChange={(event) => updateField("bathrooms", event.target.value)}
            placeholder="Example: 1"
          />
        </label>

        <label>
          Property type
          <select
            value={formData.type}
            onChange={(event) => updateField("type", event.target.value)}
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
            value={formData.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            <option value="Long-term rental">Long-term rental</option>
            <option value="Student rental">Student rental</option>
            <option value="Short stay">Short stay</option>
            <option value="Shared accommodation">Shared accommodation</option>
          </select>
        </label>

        <label>
          Phone number
          <input
            type="text"
            value={formData.contactPhone}
            onChange={(event) => updateField("contactPhone", event.target.value)}
            placeholder="Example: +264 81 000 0000"
          />
        </label>

        <label>
          WhatsApp number
          <input
            type="text"
            value={formData.contactWhatsApp}
            onChange={(event) =>
              updateField("contactWhatsApp", event.target.value)
            }
            placeholder="Example: +264 81 000 0000"
          />
        </label>
      </div>

      <label className="full-width-field">
        Property description
        <textarea
          value={formData.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Describe the property, nearby places, rules, deposit, water/electricity, parking, and who it is suitable for."
          rows="5"
        />
      </label>

      <button className="primary-btn" type="submit" disabled={isSaving}>
        {isSaving ? "Saving listing..." : "Submit listing"}
      </button>
    </form>
  );
}

export default CreateListingForm;
