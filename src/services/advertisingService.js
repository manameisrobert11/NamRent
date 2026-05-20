import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

const ADVERTISING_REQUESTS_COLLECTION = "advertisingRequests";
const ADVERTISEMENT_BOARDS_COLLECTION = "advertisementBoards";

export async function createAdvertisingRequest(requestData) {
  const cleanRequest = {
    name: requestData.name.trim(),
    businessName: requestData.businessName.trim(),
    email: requestData.email.trim(),
    phone: requestData.phone.trim(),
    packageType: requestData.packageType,
    targetAudience: requestData.targetAudience,
    budgetRange: requestData.budgetRange,
    message: requestData.message.trim(),
    status: "new",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, ADVERTISING_REQUESTS_COLLECTION),
    cleanRequest
  );

  return {
    id: docRef.id,
    ...cleanRequest,
  };
}

export function listenToAdvertisingRequests(callback) {
  const requestsQuery = query(
    collection(db, ADVERTISING_REQUESTS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(requestsQuery, (snapshot) => {
    const requests = snapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    }));

    callback(requests);
  });
}

export async function updateAdvertisingRequestStatus(requestId, status, currentUser) {
  await updateDoc(doc(db, ADVERTISING_REQUESTS_COLLECTION, requestId), {
    status,
    updatedBy: currentUser?.uid || "",
    updatedByName: currentUser?.name || currentUser?.email || "NamRent Admin",
    updatedAt: serverTimestamp(),
  });
}

export async function createAdvertisementBoard(boardData, currentUser) {
  const cleanBoard = {
    title: boardData.title.trim(),
    text: boardData.text.trim(),
    image: boardData.image.trim(),
    linkUrl: boardData.linkUrl?.trim() || "",
    placement: "homepage_carousel",
    status: "active",
    createdBy: currentUser?.uid || "",
    createdByName: currentUser?.name || currentUser?.email || "NamRent Admin",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, ADVERTISEMENT_BOARDS_COLLECTION),
    cleanBoard
  );

  return {
    id: docRef.id,
    ...cleanBoard,
  };
}

export function listenToAdvertisementBoards(callback) {
  const boardsQuery = query(
    collection(db, ADVERTISEMENT_BOARDS_COLLECTION),
    where("status", "==", "active")
  );

  return onSnapshot(boardsQuery, (snapshot) => {
    const boards = snapshot.docs.map((boardDoc) => ({
      id: boardDoc.id,
      ...boardDoc.data(),
    }));

    callback(boards);
  });
}
