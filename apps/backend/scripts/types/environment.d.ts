declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APPWRITE_ENDPOINT: string;
      APPWRITE_PROJECT: string;
      APPWRITE_API_KEY: string;
      APPWRITE_DATABASE_ID: string;
      ARTICLES_COLLECTION_ID: string;
      RSS_COLLECTION_ID: string;
      FIREBASE_SERVICE_ACCOUNT: string;
      GEMINI_API_KEY: string;
      [key: string]: string | undefined;
    }
  }
}

export {};
