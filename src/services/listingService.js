import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { uploadListingImages } from "./storageService.js";

const LISTINGS_COLLECTION = "listings";

export async function createListing(listingData, currentUser, imageFiles = []) {
  if (!currentUser?.uid) {
    throw new Error("You must be signed in with Google to create a listing.");
  }

  const tempFolder = `listing-photos/${currentUser.uid}/${Date.now()}`;
  const photoUrls = await uploadListingImages(imageFiles, tempFolder);

  const newListing = {
    title: listingData.title.trim(),
    location: listingData.location.trim(),
    area: listingData.area.trim(),
    price: Number(listingData.price),
    deposit: Number(listingData.deposit || 0),
    waterIncluded: listingData.waterIncluded,
    electricityIncluded: listingData.electricityIncluded,
    availableFrom: listingData.availableFrom,
    bedrooms: Number(listingData.bedrooms),
    bathrooms: Number(listingData.bathrooms),
    type: "Uncategorized",
    category: "Uncategorized",
    description: listingData.description.trim(),
    contactPhone: listingData.contactPhone.trim(),
    contactWhatsApp: listingData.contactWhatsApp.trim(),

    advertiserPhotos: photoUrls,
    namrentVerificationPhotos: [],

    ownerId: currentUser.uid,
    ownerName: currentUser.name || currentUser.displayName || "NamRent Advertiser",
    ownerEmail: currentUser.email || "",

    status: "pending_review",
    verificationStatus: "not_verified",

    adminNote: "",
    editedAfterSubmission: false,
    needsAdminReview: true,

    featured: false,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedAt: null,
    rejectedAt: null,
  };

  const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), newListing);

  return {
    id: docRef.id,
    ...newListing,
  };
}

export async function createAdminListing(listingData, currentUser, imageFiles = []) {
  if (!currentUser?.uid) {
    throw new Error("You must be signed in as an admin to create a listing.");
  }

  const folder = `admin-listing-photos/${currentUser.uid}/${Date.now()}`;
  const photoUrls = await uploadListingImages(imageFiles, folder);

  const newListing = {
    title: listingData.title.trim(),
    location: listingData.location.trim(),
    area: listingData.area.trim(),
    price: Number(listingData.price),
    deposit: Number(listingData.deposit || 0),
    waterIncluded: listingData.waterIncluded,
    electricityIncluded: listingData.electricityIncluded,
    availableFrom: listingData.availableFrom,
    bedrooms: Number(listingData.bedrooms),
    bathrooms: Number(listingData.bathrooms),
    type: listingData.type,
    category: listingData.category,
    description: listingData.description.trim(),
    contactPhone: listingData.contactPhone.trim(),
    contactWhatsApp: listingData.contactWhatsApp.trim(),

    advertiserPhotos: photoUrls,
    namrentVerificationPhotos: [],

    ownerId: currentUser.uid,
    ownerName: currentUser.name || currentUser.displayName || "NamRent Admin",
    ownerEmail: currentUser.email || "",

    status: "approved",
    verificationStatus: "admin_added",

    adminNote: listingData.adminNote?.trim() || "Created directly by NamRent admin.",
    editedAfterSubmission: false,
    needsAdminReview: false,

    featured: true,
    createdByAdmin: true,
    approvedBy: currentUser.uid,
    approvedByName: currentUser.name || currentUser.email || "NamRent Admin",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    rejectedAt: null,
  };

  const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), newListing);

  return {
    id: docRef.id,
    ...newListing,
  };
}

export async function updateAdvertiserListing(
  listingId,
  listingData,
  currentUser,
  newImageFiles = []
) {
  if (!currentUser?.uid) {
    throw new Error("You must be signed in with Google to update a listing.");
  }

  const folder = `listing-photos/${currentUser.uid}/${listingId}`;
  const newPhotoUrls = await uploadListingImages(newImageFiles, folder);

  const updatedData = {
    title: listingData.title.trim(),
    location: listingData.location.trim(),
    area: listingData.area.trim(),
    price: Number(listingData.price),
    deposit: Number(listingData.deposit || 0),
    waterIncluded: listingData.waterIncluded,
    electricityIncluded: listingData.electricityIncluded,
    availableFrom: listingData.availableFrom,
    bedrooms: Number(listingData.bedrooms),
    bathrooms: Number(listingData.bathrooms),
    description: listingData.description.trim(),
    contactPhone: listingData.contactPhone.trim(),
    contactWhatsApp: listingData.contactWhatsApp.trim(),

    editedAfterSubmission: true,
    needsAdminReview: true,
    status: "pending_review",

    updatedAt: serverTimestamp(),
  };

  if (newPhotoUrls.length > 0) {
    updatedData.advertiserPhotos = newPhotoUrls;
  }

  await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), updatedData);
}

export async function uploadNamRentVerificationPhotos(listingId, files) {
  const folder = `namrent-verification-photos/${listingId}`;
  const photoUrls = await uploadListingImages(files, folder);

  await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), {
    namrentVerificationPhotos: photoUrls,
    verificationStatus: "verified_by_namrent",
    updatedAt: serverTimestamp(),
  });

  return photoUrls;
}

export async function approveListing(listingId, currentUser, adminEdits = {}) {
  await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), {
    status: "approved",
    featured: true,
    needsAdminReview: false,
    editedAfterSubmission: false,

    type: adminEdits.type || "Apartment",
    category: adminEdits.category || "Long-term rental",

    approvedBy: currentUser?.uid || "",
    approvedByName: currentUser?.name || currentUser?.email || "NamRent Admin",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateListingClassification(listingId, currentUser, adminEdits = {}) {
  await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), {
    type: adminEdits.type || "Apartment",
    category: adminEdits.category || "Long-term rental",
    categorizedBy: currentUser?.uid || "",
    categorizedByName: currentUser?.name || currentUser?.email || "NamRent Admin",
    updatedAt: serverTimestamp(),
  });
}

export async function updateAdminListingDetails(listingId, currentUser, adminEdits = {}) {
  const updatedData = {
    updatedByAdmin: true,
    updatedByAdminId: currentUser?.uid || "",
    updatedByAdminName: currentUser?.name || currentUser?.email || "NamRent Admin",
    updatedAt: serverTimestamp(),
  };

  if (adminEdits.title !== undefined) updatedData.title = adminEdits.title.trim();
  if (adminEdits.location !== undefined) updatedData.location = adminEdits.location.trim();
  if (adminEdits.area !== undefined) updatedData.area = adminEdits.area.trim();
  if (adminEdits.price !== undefined) updatedData.price = Number(adminEdits.price);
  if (adminEdits.deposit !== undefined) updatedData.deposit = Number(adminEdits.deposit || 0);
  if (adminEdits.waterIncluded !== undefined) updatedData.waterIncluded = adminEdits.waterIncluded;
  if (adminEdits.electricityIncluded !== undefined) updatedData.electricityIncluded = adminEdits.electricityIncluded;
  if (adminEdits.availableFrom !== undefined) updatedData.availableFrom = adminEdits.availableFrom;
  if (adminEdits.bedrooms !== undefined) updatedData.bedrooms = Number(adminEdits.bedrooms);
  if (adminEdits.bathrooms !== undefined) updatedData.bathrooms = Number(adminEdits.bathrooms);
  if (adminEdits.description !== undefined) updatedData.description = adminEdits.description.trim();
  if (adminEdits.contactPhone !== undefined) updatedData.contactPhone = adminEdits.contactPhone.trim();
  if (adminEdits.contactWhatsApp !== undefined) updatedData.contactWhatsApp = adminEdits.contactWhatsApp.trim();

  await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), updatedData);
}

export async function rejectListing(listingId, adminNote, currentUser) {
  await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), {
    status: "rejected",
    featured: false,
    needsAdminReview: false,
    adminNote: adminNote || "",
    rejectedBy: currentUser?.uid || "",
    rejectedByName: currentUser?.name || currentUser?.email || "NamRent Admin",
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getMyListings(currentUser) {
  if (!currentUser?.uid) {
    throw new Error("You must be signed in with Google to view your listings.");
  }

  const listingsQuery = query(
    collection(db, LISTINGS_COLLECTION),
    where("ownerId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(listingsQuery);

  return snapshot.docs.map((listingDoc) => ({
    id: listingDoc.id,
    ...listingDoc.data(),
  }));
}

export function listenToAdminListings(callback) {
  const listingsQuery = query(
    collection(db, LISTINGS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(listingsQuery, (snapshot) => {
    const liveListings = snapshot.docs.map((listingDoc) => ({
      id: listingDoc.id,
      ...listingDoc.data(),
    }));

    callback(liveListings);
  });
}

export function listenToApprovedListings(callback) {
  const listingsQuery = query(
    collection(db, LISTINGS_COLLECTION),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(listingsQuery, (snapshot) => {
    const approvedListings = snapshot.docs.map((listingDoc) => ({
      id: listingDoc.id,
      ...listingDoc.data(),
    }));

    callback(approvedListings);
  });
}

export async function getApprovedListings() {
  const listingsQuery = query(
    collection(db, LISTINGS_COLLECTION),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(listingsQuery);

  return snapshot.docs.map((listingDoc) => ({
    id: listingDoc.id,
    ...listingDoc.data(),
  }));
}

export async function deleteListing(listingId) {
  await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
}
