import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

export const MAX_MESSAGES_PER_DAY = 20;

export interface AILimitData {
  date: string; // YYYY-MM-DD
  count: number;
}

const getTodayString = () => new Date().toISOString().split("T")[0];

export const checkAILimit = async (): Promise<boolean> => {
  const currentUser = auth().currentUser;
  if (!currentUser) return false;

  const today = getTodayString();
  const docRef = firestore().collection("users").doc(currentUser.uid);

  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) return true; // first time

    const data = docSnap.data();
    const aiUsage = data?.aiUsage as AILimitData | undefined;

    if (!aiUsage || aiUsage.date !== today) {
      return true; // no usage today
    }

    return aiUsage.count < MAX_MESSAGES_PER_DAY;
  } catch (error) {
    console.error("Error checking AI limit:", error);
    return false; // Safely fail check if network is completely off and no cache
  }
};

export const incrementAILimit = async (): Promise<void> => {
  const currentUser = auth().currentUser;
  if (!currentUser) return;

  const today = getTodayString();
  const docRef = firestore().collection("users").doc(currentUser.uid);

  try {
    const docSnap = await docRef.get();
    let count = 1;

    if (docSnap.exists) {
      const data = docSnap.data();
      const aiUsage = data?.aiUsage as AILimitData | undefined;

      if (aiUsage && aiUsage.date === today) {
        count = aiUsage.count + 1;
      }
    }

    await docRef.set({ aiUsage: { date: today, count } }, { merge: true });
  } catch (error) {
    console.error("Error incrementing AI limit:", error);
  }
};

export const getRemainingAILimit = async (): Promise<number> => {
  const currentUser = auth().currentUser;
  if (!currentUser) return 0;

  const today = getTodayString();
  const docRef = firestore().collection("users").doc(currentUser.uid);

  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) return MAX_MESSAGES_PER_DAY;

    const data = docSnap.data();
    const aiUsage = data?.aiUsage as AILimitData | undefined;

    if (!aiUsage || aiUsage.date !== today) {
      return MAX_MESSAGES_PER_DAY;
    }

    return Math.max(0, MAX_MESSAGES_PER_DAY - aiUsage.count);
  } catch (error) {
    console.error("Error getting AI limit:", error);
    return 0;
  }
};
