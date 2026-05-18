import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase.js";

export async function uploadListingImages(files, folderPath) {
  if (!files || files.length === 0) return [];

  const selectedFiles = Array.from(files);

  const uploadPromises = selectedFiles.map(async (file) => {
    const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const imageRef = ref(storage, `${folderPath}/${safeFileName}`);

    await uploadBytes(imageRef, file);

    return getDownloadURL(imageRef);
  });

  return Promise.all(uploadPromises);
}
