import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

const LISTINGS_COLLECTION = "listings";

export async function createListing(listingData, currentUser) {
  if (!currentUser?.uid) {
    throw new Error("You must be signed in with Google to create a listing.");
  }

  const cleanPrice = Number(listingData.price);
  const cleanBedrooms = Number(listingData.bedrooms);
  const cleanBathrooms = Number(listingData.bathrooms);

  const newListing = {
    title: listingData.title.trim(),
    location: listingData.location.trim(),
    area: listingData.area.trim(),
    price: cleanPrice,
    bedrooms: cleanBedrooms,
    bathrooms: cleanBathrooms,
    type: listingData.type,
    category: listingData.category,
    description: listingData.description.trim(),
    contactPhone: listingData.contactPhone.trim(),
    contactWhatsApp: listingData.contactWhatsApp.trim(),

    ownerId: currentUser.uid,
    ownerName: currentUser.name || currentUser.displayName || "NamRent Advertiser",
    ownerEmail: currentUser.email || "",

    status: "pending",
    featured: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), newListing);

  return {
    id: docRef.id,
    ...newListing,
  };
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

export async function deleteListing(listingId) {
  if (!listingId) {
    throw new Error("Missing listing ID.");
  }

  await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
}
