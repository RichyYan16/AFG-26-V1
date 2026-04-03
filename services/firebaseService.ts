import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SessionRecord } from "@/model";

const USERS_COLLECTION = "users";
const SESSIONS_COLLECTION = "sessions";

export async function createUserProfile(userId: string, email: string): Promise<void> {
  try {
    console.log("Creating user profile for:", { userId, email });
    
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    console.log("User doc ref created:", userDocRef.path);
    
    const userProfile = {
      email,
      createdAt: new Date().toISOString(),
      totalSessions: 0,
      lastActive: new Date().toISOString()
    };
    
    console.log("Setting user profile data:", userProfile);
    await setDoc(userDocRef, userProfile);
    
    console.log("User profile created successfully");
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

export async function saveUserSession(userId: string, session: SessionRecord): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const sessionDocRef = doc(userDocRef, SESSIONS_COLLECTION, session.id);
    
    await setDoc(sessionDocRef, {
      ...session,
      createdAt: new Date(session.createdAt).toISOString(),
    });
  } catch (error) {
    console.error("Error saving session:", error);
    throw error;
  }
}

export async function getUserSessions(userId: string, maxSessions: number = 300): Promise<SessionRecord[]> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const sessionsCollectionRef = collection(userDocRef, SESSIONS_COLLECTION);
    const q = query(
      sessionsCollectionRef,
      orderBy("createdAt", "desc"),
      limit(maxSessions)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions: SessionRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        id: doc.id,
        userId: data.userId || userId,
        createdAt: data.createdAt,
        subject: data.subject,
        assignmentType: data.assignmentType,
        stuckType: data.stuckType,
        emotion: data.emotion,
        timeStuckMinutes: data.timeStuckMinutes,
        interventionUsed: data.interventionUsed,
        outcome: data.outcome,
      });
    });
    
    return sessions;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

export async function deleteUserSession(userId: string, sessionId: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const sessionDocRef = doc(userDocRef, SESSIONS_COLLECTION, sessionId);
    await deleteDoc(sessionDocRef);
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
}

export async function clearUserSessions(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const sessionsCollectionRef = collection(userDocRef, SESSIONS_COLLECTION);
    const querySnapshot = await getDocs(sessionsCollectionRef);
    
    const deletePromises = querySnapshot.docs.map((doc) => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error clearing sessions:", error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, profileData: any): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, profileData, { merge: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<any> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const docSnapshot = await getDoc(userDocRef);
    
    if (docSnapshot.exists()) {
      return docSnapshot.data();
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}
