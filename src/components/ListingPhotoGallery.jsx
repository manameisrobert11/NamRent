import { useState } from "react";

function ListingPhotoGallery({ photos = [], title = "Rental property", variant = "" }) {
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
  const activeIndex = Math.max(validPhotos.indexOf(selectedPhoto), 0);
  const visibleThumbs = variant === "property" ? validPhotos.slice(0, 5) : validPhotos;
  const showPrevious = () => {
    const previousIndex = activeIndex === 0 ? validPhotos.length - 1 : activeIndex - 1;
    setActivePhoto(validPhotos[previousIndex]);
  };
  const showNext = () => {
    const nextIndex = activeIndex === validPhotos.length - 1 ? 0 : activeIndex + 1;
    setActivePhoto(validPhotos[nextIndex]);
  };

  const galleryClassName = [
    "listing-gallery",
    variant === "property" ? "property-gallery" : "",
    validPhotos.length === 1 ? "single-photo" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={galleryClassName}>
      <div className="listing-gallery-main">
        <img src={selectedPhoto} alt={title} />
        {validPhotos.length > 1 && (
          <>
            <button
              className="gallery-arrow previous"
              type="button"
              aria-label="Previous photo"
              onClick={showPrevious}
            >
              &lsaquo;
            </button>
            <button
              className="gallery-arrow next"
              type="button"
              aria-label="Next photo"
              onClick={showNext}
            >
              &rsaquo;
            </button>
            <span className="gallery-count">
              {activeIndex + 1} / {validPhotos.length}
            </span>
          </>
        )}
      </div>

      {validPhotos.length > 1 && (
        <div className="listing-gallery-thumbs">
          {visibleThumbs.map((photoUrl, index) => (
            <button
              key={photoUrl}
              type="button"
              className={photoUrl === selectedPhoto ? "active" : ""}
              onClick={() => setActivePhoto(photoUrl)}
            >
              <img src={photoUrl} alt={`${title} photo ${index + 1}`} />
              {variant === "property" && index === visibleThumbs.length - 1 && validPhotos.length > visibleThumbs.length && (
                <span className="gallery-more">+{validPhotos.length - visibleThumbs.length}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ListingPhotoGallery;
