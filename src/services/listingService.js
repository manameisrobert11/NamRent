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
    bedrooms: Number(listingData.bedrooms),
    bathrooms: Number(listingData.bathrooms),
    type: listingData.type,
    category: listingData.category,
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

export async function approveListing(listingId, currentUser) {
  await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), {
    status: "approved",
    featured: true,
    needsAdminReview: false,
    editedAfterSubmission: false,
    approvedBy: currentUser?.uid || "",
    approvedByName: currentUser?.name || currentUser?.email || "NamRent Admin",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
