import { useState } from "react";

function ListingPhotoGallery({ photos = [], title = "Rental property" }) {
  const validPhotos = photos.filter(Boolean);
  const [activePhoto, setActivePhoto] = useState(validPhotos[0] || "");

  if (validPhotos.length === 0) {
    return (
      <div className="listing-gallery-placeholder">
        <span>Home</span>
        <p>No photos uploaded yet</p>
      </div>
    );
  }

  const selectedPhoto = activePhoto || validPhotos[0];

  return (
    <div className="listing-gallery">
      <div className="listing-gallery-main">
        <img src={selectedPhoto} alt={title} />
      </div>

      {validPhotos.length > 1 && (
        <div className="listing-gallery-thumbs">
          {validPhotos.map((photoUrl, index) => (
            <button
              key={photoUrl}
              type="button"
              className={photoUrl === selectedPhoto ? "active" : ""}
              onClick={() => setActivePhoto(photoUrl)}
            >
              <img src={photoUrl} alt={`${title} photo ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ListingPhotoGallery;
