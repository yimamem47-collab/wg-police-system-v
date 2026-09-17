import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager, 
  doc, 
  getDocFromServer,
  enableNetwork,
  disableNetwork,
  terminate,
  clearIndexedDbPersistence
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// መቶ አለቃ፤ የላክህልኝ ቁልፎች እዚህ ተተክተዋል - አሁን አፑ ፋይል ፍለጋ አይባዝንም
const firebaseConfig = {
  projectId: "gen-lang-client-0892131460",
  appId: "1:349616382718:web:f5673145e668e398463baf",
  apiKey: "AIzaSyAAJQ48Zfckfp105S92pyHGG2vDIJ9KMYk",
  authDomain: "gen-lang-client-0892131460.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-7011afac-a655-4735-88be-0e4554305b7b",
  storageBucket: "gen-lang-client-0892131460.firebasestorage.app",
  messagingSenderId: "349616382718"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Persistence logic
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Auth persistence error:", err);
});

// Firestore Settings
const firestoreSettings = {
  localCache: persistentLocalCache({ 
    tabManager: persistentSingleTabManager({}) 
  }),
  experimentalAutoDetectLongPolling: true,
  longPollingOptions: {
    timeoutSeconds: 20 
  },
  useFetchStreams: false,
  ignoreUndefinedProperties: true,
  host: "firestore.googleapis.com",
  ssl: true,
};

// Database ID ከ config በቀጥታ ይወሰዳል
const dbId = firebaseConfig.firestoreDatabaseId;

// Initialize Firestore
export let db = initializeFirestore(app, firestoreSettings, dbId);

export async function clearFirestoreCache() {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
    db = initializeFirestore(app, firestoreSettings, dbId);
    setTimeout(() => testConnection(2), 500);
    return true;
  } catch (error) {
    return false;
  }
}

export async function forceReconnect() {
  try {
    await disableNetwork(db);
    await new Promise(resolve => setTimeout(resolve, 500));
    await enableNetwork(db);
    await testConnection(2);
    return true;
  } catch (error) {
    return false;
  }
}

export const googleProvider = new GoogleAuthProvider();

let isFirestoreConnected = false;
const connectionListeners: ((connected: boolean) => void)[] = [];

export const getFirestoreStatus = () => isFirestoreConnected;
export const onFirestoreStatusChange = (callback: (connected: boolean) => void) => {
  connectionListeners.push(callback);
  callback(isFirestoreConnected);
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

const setFirestoreStatus = (status: boolean) => {
  if (isFirestoreConnected !== status) {
    isFirestoreConnected = status;
    connectionListeners.forEach(cb => cb(status));
  }
};

export async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    if (!navigator.onLine) {
      setFirestoreStatus(false);
      return;
    }

    try {
      await enableNetwork(db).catch(() => {});
      const testDoc = doc(db, '_internal', 'connection_test');
      
      const fetchPromise = getDocFromServer(testDoc);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      await Promise.race([fetchPromise, timeoutPromise]);
      setFirestoreStatus(true);
      return; 
    } catch (error: any) {
      const errorCode = error?.code || '';
      if (errorCode && errorCode !== 'unavailable' && errorCode !== 'failed-precondition') {
        setFirestoreStatus(true);
        return;
      }
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  setFirestoreStatus(false);
}

setTimeout(() => testConnection(), 500);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error?.code || '';
  console.warn('Firestore Operation Issue:', errorCode, errorMessage);
  if (errorCode === 'unavailable' || errorMessage.includes('offline') || errorMessage.includes('network')) {
    return;
  }
}
