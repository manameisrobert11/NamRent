import { useState } from "react";
import { createListing } from "../services/listingService.js";

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
  description: "",
  contactPhone: "",
  contactWhatsApp: "",
};

function CreateListingForm({ currentUser, onListingCreated }) {
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
    if (!formData.price || Number(formData.price) <= 0) {
      return "Please enter a valid monthly price.";
    }
    if (formData.deposit === "" || Number(formData.deposit) < 0) {
      return "Please enter the deposit amount. Use 0 if there is no deposit.";
    }
    if (!formData.availableFrom) {
      return "Please select when the rental is available from.";
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

      const savedListing = await createListing(formData, currentUser, imageFiles);

      setMessage(
        "Listing submitted successfully. It is now pending NamRent admin review."
      );

      setFormData(initialForm);
      setImageFiles([]);

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
    <form className="listing-form" onSubmit={handleSubmit} autoComplete="off">
      <div className="form-header">
        <p className="eyebrow">Advertiser Dashboard</p>
        <h2>Create a new rental listing</h2>
        <p>
          Add the property facts below. NamRent will review and categorize the
          listing before it appears publicly.
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
            placeholder="Example: 2-bedroom flat in Windhoek West"
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
          Deposit amount NAD
          <input
            type="number"
            min="0"
            value={formData.deposit}
            onChange={(event) => updateField("deposit", event.target.value)}
            placeholder="Example: 6500"
          />
        </label>

        <label>
          Available from
          <input
            type="date"
            value={formData.availableFrom}
            onChange={(event) => updateField("availableFrom", event.target.value)}
          />
        </label>

        <label>
          Water included?
          <select
            value={formData.waterIncluded}
            onChange={(event) => updateField("waterIncluded", event.target.value)}
          >
            <option value="yes">Yes, water is included</option>
            <option value="no">No, water is excluded</option>
            <option value="partial">Partially included</option>
          </select>
        </label>

        <label>
          Electricity included?
          <select
            value={formData.electricityIncluded}
            onChange={(event) =>
              updateField("electricityIncluded", event.target.value)
            }
          >
            <option value="yes">Yes, electricity is included</option>
            <option value="no">No, electricity is excluded</option>
            <option value="prepaid">Prepaid electricity</option>
          </select>
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
          placeholder="Describe the property, nearby places, rules, parking, and who it is suitable for."
          rows="5"
        />
      </label>

      <label className="full-width-field">
        Property photos
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => setImageFiles(event.target.files)}
        />
        <small>
          Upload clear photos of the rooms, outside area, bathroom, kitchen, and
          entrance if possible.
        </small>
      </label>

      <button className="primary-btn" type="submit" disabled={isSaving}>
        {isSaving ? "Saving listing..." : "Submit listing"}
      </button>
    </form>
  );
}

export default CreateListingForm;
