import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import COLORS from "../constants/colors";
import axios from "axios";

// Hardcoded raw Vercel deployment URL to bypass possible DNS caching issues on 'igdb-api-omega' domain
const SERVER_URL = "https://igdb-api-omega.vercel.app";

// --- Types ---
interface Props {
  visible: boolean;
  onClose: () => void;
}

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
}

interface IgdbGame {
  id: number;
  steam_appid: number;
  name: string;
  cover_image_id: string | null;
  release_date: string;
}

interface SteamWishlistResponse {
  appIds?: number[];
}

export default function SteamLinkModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const [steamInput, setSteamInput] = useState("");
  const [loading, setLoading] = useState(false);

  const resolveSteamId = async (input: string): Promise<string | null> => {
    const trimmed = input.trim();
    // 1. If it's pure numbers and length >= 17, it's a 64-bit ID
    if (/^\d{17}$/.test(trimmed)) return trimmed;

    // 2. Check if URL contains /profiles/ID
    const profilesMatch = trimmed.match(/profiles\/(\d{17})/);
    if (profilesMatch && profilesMatch[1]) return profilesMatch[1];

    // 3. Check if URL contains /id/vanityname
    let vanity = trimmed;
    const idMatch = trimmed.match(/id\/([^\/?#]+)/);
    if (idMatch && idMatch[1]) {
      vanity = idMatch[1];
    } else {
      // If no /id/ or /profiles/, clean up trailing slash
      vanity = vanity.replace(/\/$/, "");
      // If they somehow pasted a strange URL, grab the end part
      if (vanity.includes("/")) {
        const parts = vanity.split("/");
        vanity = parts[parts.length - 1];
      }
    }

    try {
      const resp = await axios.get(`${SERVER_URL}/steam/resolve?vanityurl=${encodeURIComponent(vanity)}`);
      const data = resp.data;
      if (data.steamid) return data.steamid;
    } catch {
      // Ignored
    }
    return null;
  };

  const cleanInput = () => {
    setSteamInput("");
    setLoading(false);
  };

  const handleSync = useCallback(async () => {
    if (!steamInput.trim()) {
      ToastAndroid.show(t("steam.errors.empty") || "Please enter a Steam ID", ToastAndroid.SHORT);
      return;
    }

    const uid = auth().currentUser?.uid;
    if (!uid) return;

    setLoading(true);

    try {
      console.log("==> Steam Sync Started");

      // 1. Resolve ID
      console.log("==> Step 1: Resolving Steam ID:", steamInput.trim());
      const steamId = await resolveSteamId(steamInput.trim());
      console.log("==> Step 1 Result:", steamId);
      if (!steamId) {
        ToastAndroid.show(t("steam.errors.resolveFailed") || "Could not find user", ToastAndroid.LONG);
        setLoading(false);
        return;
      }

      // 2. Fetch Owned Games
      console.log("==> Step 2: Fetching Owned Games for ID:", steamId);
      const urlWithNoCache = `${SERVER_URL}/steam/owned-games?steamid=${steamId}&_t=${Date.now()}`;

      let ownedData;
      try {
        const ownedResp = await axios.get(urlWithNoCache);
        console.log("==> Step 2 STATUS:", ownedResp.status);
        ownedData = ownedResp.data;
      } catch (err: any) {
        if (err.response && err.response.status === 403) {
          ToastAndroid.show(t("steam.errors.privateProfile") || "Profile private", ToastAndroid.LONG);
          setLoading(false);
          return;
        }
        console.error("==> Full Error:", JSON.stringify({
          message: err.message,
          code: err.code,
          status: err?.response?.status,
          data: err?.response?.data,
        }));
        throw new Error("Failed to fetch games: " + err.message);
      }

      console.log("==> Step 2 Result Length:", ownedData.games?.length);
      const rawGames: SteamGame[] = ownedData.games || [];

      // Steam sync now imports played games only.
      const gamesToProcess = rawGames.filter(g => g.playtime_forever > 0);
      console.log("==> Step 2 Processable:", gamesToProcess.length);

      // 3. Map to IGDB in Batches via Backend
      const appIdsToMap = gamesToProcess.map(g => g.appid);
      console.log("==> Step 3: Fetching IGDB mappings for AppIDs amount:", appIdsToMap.length);

      let mappedGames: IgdbGame[] = [];
      if (appIdsToMap.length > 0) {
        try {
          const mapResp = await axios.post(`${SERVER_URL}/steam/map-to-igdb`, { appIds: appIdsToMap }, {
            headers: { "Content-Type": "application/json" }
          });
          console.log("==> Step 3 STATUS:", mapResp.status);
          mappedGames = mapResp.data;
        } catch (err: any) {
          throw new Error("Failed IGDB map: " + err.message);
        }
      }

      console.log("==> Step 3 Result Length:", mappedGames?.length);
      console.log("==> Sample IGDB game:", JSON.stringify(mappedGames?.[0]));
      console.log("==> Sample Steam game:", JSON.stringify(gamesToProcess?.[0]));
      // 4. Fetch wishlist AppIDs
      console.log("==> Step 4: Fetching Steam wishlist for ID:", steamId);
      let wishlistAppIds: number[] = [];
      try {
        const wishlistResp = await axios.get<SteamWishlistResponse>(
          `${SERVER_URL}/steam/wishlist?steamid=${steamId}&_t=${Date.now()}`,
        );
        wishlistAppIds = Array.isArray(wishlistResp.data?.appIds)
          ? wishlistResp.data.appIds
          : [];
      } catch (err: any) {
        console.error("==> Wishlist fetch error:", err?.message || err);
      }

      const playedAppIdSet = new Set(gamesToProcess.map((g) => Number(g.appid)));
      const uniqueWishlistAppIds = Array.from(
        new Set(
          wishlistAppIds.filter(
            (appid) => Number.isFinite(appid) && !playedAppIdSet.has(Number(appid)),
          ),
        ),
      );

      // 5. Map wishlist appIds to IGDB
      let wishlistMappedGames: IgdbGame[] = [];
      if (uniqueWishlistAppIds.length > 0) {
        console.log("==> Step 5: Fetching IGDB mappings for wishlist amount:", uniqueWishlistAppIds.length);
        try {
          const wishlistMapResp = await axios.post(
            `${SERVER_URL}/steam/map-to-igdb`,
            { appIds: uniqueWishlistAppIds },
            { headers: { "Content-Type": "application/json" } },
          );
          wishlistMappedGames = Array.isArray(wishlistMapResp.data)
            ? wishlistMapResp.data
            : [];
        } catch (err: any) {
          console.error("==> Wishlist IGDB map error:", err?.message || err);
        }
      }

      // 6. Group by lists and Batch write to Firestore
      console.log("==> Step 6: Writing to Firestore...");
      const db = firestore();
      const listsRef = db.collection("users").doc(uid).collection("lists");

      // Ensure default lists exist in parallel
      const listIds = ["playing", "played", "wantToPlay"];
      const listNames = [
        t("games.details.listStatus.playing") || "Playing",
        t("games.details.listStatus.played") || "Played",
        t("games.details.listStatus.wantToPlay") || "Want to Play"
      ];

      const batchListCreate = db.batch();
      listIds.forEach((id, i) => {
        batchListCreate.set(
          listsRef.doc(id),
          {
            name: listNames[i],
            type: "default",
            createdAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
      await batchListCreate.commit();

      const batchLimit = 400; // safe firestore batch limit limit < 500
      let writeBatch = db.batch();
      let opCount = 0;
      let totalImported = 0;

      for (const igdbG of mappedGames) {
        // Find matching steam game for playtime
        const steamG = gamesToProcess.find(g => String(g.appid) === String(igdbG.steam_appid));
        if (!steamG) continue;

        let targetList = "played";
        if ((steamG.playtime_2weeks || 0) > 0) {
          targetList = "playing";
        }

        const gameDocRef = listsRef.doc(targetList).collection("games").doc(String(igdbG.id));

        writeBatch.set(gameDocRef, {
          id: igdbG.id,
          name: igdbG.name,
          cover_image_id: igdbG.cover_image_id,
          release_date: igdbG.release_date,
          addedAt: firestore.FieldValue.serverTimestamp(),
          steamPlaytimeForever: steamG.playtime_forever,
        }, { merge: true });

        opCount++;
        totalImported++;

        if (opCount >= batchLimit) {
          await writeBatch.commit();
          writeBatch = db.batch();
          opCount = 0;
        }
      }

      for (const igdbG of wishlistMappedGames) {
        const gameDocRef = listsRef
          .doc("wantToPlay")
          .collection("games")
          .doc(String(igdbG.id));

        writeBatch.set(
          gameDocRef,
          {
            id: igdbG.id,
            name: igdbG.name,
            cover_image_id: igdbG.cover_image_id,
            release_date: igdbG.release_date,
            addedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        opCount++;
        totalImported++;

        if (opCount >= batchLimit) {
          await writeBatch.commit();
          writeBatch = db.batch();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await writeBatch.commit();
      }

      if (totalImported === 0) {
        ToastAndroid.show(t("settings.profile.steam.errors.privateProfile") || "No games found", ToastAndroid.LONG);
        setLoading(false);
        return;
      }

      ToastAndroid.show(
        (t("settings.profile.steam.success") || "Imported {{count}} games!").replace("{{count}}", totalImported.toString()),
        ToastAndroid.LONG
      );

      cleanInput();
      onClose();
    } catch (e) {
      console.error(e);
      ToastAndroid.show(t("settings.profile.steam.errors.fetchFailed") || "Sync failed", ToastAndroid.LONG);
      setLoading(false);
    }
  }, [steamInput, t, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <Ionicons name="logo-steam" size={50} color="#fff" style={styles.logo} />
            <Text style={styles.title}>{t("settings.profile.steam.modal.title") || "Sync Your Steam Library"}</Text>
            <Text style={styles.description}>
              {t("settings.profile.steam.modal.instructions") || "Ensure your profile is public."}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t("settings.profile.steam.modal.placeholder") || "e.g., https://steamcommunity.com/profiles/76561198818022625"}
              placeholderTextColor="#888"
              value={steamInput}
              onChangeText={setSteamInput}
            />

            <Text style={styles.description}>
              {t("settings.profile.steam.modal.privacy") || "Please ensure your Steam Profile and Game Details are set to 'Public' in your privacy settings."}
            </Text>

            <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.syncBtnText}>{t("settings.profile.steam.modal.syncBtn") || "Sync Games"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: COLORS.primary,
    padding: 24,
    borderRadius: 16,
    elevation: 5,
  },
  closeBtn: {
    alignSelf: "flex-end",
  },
  logo: {
    alignSelf: "center",
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.button,
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  syncBtn: {
    backgroundColor: COLORS.secondary,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  syncBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
