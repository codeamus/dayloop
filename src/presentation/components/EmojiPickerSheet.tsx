// src/presentation/components/EmojiPickerSheet.tsx
import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import emojiDatasource from "emoji-datasource";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

// ✅ Actívalo cuando exista el JSON (generado desde CLDR)
import emojiEs from "@/assets/emoji/es.json";

type EmojiRow = {
  unified: string;
  short_name?: string;
  name?: string;
  category?: string;
  keywords?: string[];
  has_img_apple?: boolean;
  has_img_google?: boolean;
};

type Props = {
  visible: boolean;
  value?: string;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

type EmojiEsEntry = { tts?: string; keywords?: string[] };

const RECENTS_KEY = "dayloop:emoji_recents_v1";
const RECENTS_MAX = 24;

// ✅ Sinónimos ES → EN (fallback útil incluso con CLDR)
const ES_SYNONYMS: Record<string, string[]> = {
  // genéricos
  agua: ["droplet", "water"],
  correr: ["run", "runner", "running"],
  libro: ["book", "books"],
  estudiar: ["study", "student", "books"],
  trabajo: ["work", "briefcase"],
  gimnasio: ["gym", "weight_lifting", "dumbbell"],
  dormir: ["sleep", "sleeping", "zzz", "bed"],
  comida: ["food", "meal"],
  viaje: ["travel", "plane", "airplane"],
  bandera: ["flag"],
  pais: ["flag"],

  // animales comunes (mejora inmediata)
  perro: ["dog", "puppy", "poodle", "pet"],
  gato: ["cat", "kitten", "pet"],
  pajaro: ["bird"],
  pez: ["fish"],
  caballo: ["horse"],
  conejo: ["rabbit"],
  tortuga: ["turtle"],

  // países/banderas
  chile: ["flag-cl", "chile"],
  argentina: ["flag-ar", "argentina"],
  mexico: ["flag-mx", "mexico"],
  espana: ["flag-es", "spain", "españa"],
  usa: ["flag-us", "united_states", "us"],
  eeuu: ["flag-us", "united_states", "us"],
  brasil: ["flag-br", "brazil", "brasil"],
};

const CATEGORIES: { key: string; label: string }[] = [
  { key: "Smileys & Emotion", label: "🙂" },
  { key: "People & Body", label: "🧍" },
  { key: "Animals & Nature", label: "🐶" },
  { key: "Food & Drink", label: "🍔" },
  { key: "Activities", label: "🏃" },
  { key: "Travel & Places", label: "✈️" },
  { key: "Objects", label: "📦" },
  { key: "Symbols", label: "✨" },
  { key: "Flags", label: "🏳️" },
];

function unifiedToChar(unified: string): string {
  const codes = unified.split("-").map((hex) => parseInt(hex, 16));
  return String.fromCodePoint(...codes);
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function safeIncludes(hay?: string, needle?: string) {
  if (!hay || !needle) return false;
  return normalize(hay).includes(normalize(needle));
}

function buildEmojiHaystack(
  e: EmojiRow,
  emojiEsMap?: Record<string, EmojiEsEntry>
) {
  const en1 = e.short_name ?? "";
  const en2 = e.name ?? "";
  const enKws = Array.isArray(e.keywords) ? e.keywords.join(" ") : "";

  const es = emojiEsMap?.[e.unified];
  const es1 = es?.tts ?? "";
  const esKws = Array.isArray(es?.keywords) ? es.keywords.join(" ") : "";

  return `${en1} ${en2} ${enKws} ${es1} ${esKws}`;
}

function expandQuery(qRaw: string) {
  const q = normalize(qRaw.trim());
  if (!q) return { q: "", expandedArr: [] as string[] };

  const tokens = q.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>();
  expanded.add(q);

  for (const t of tokens) {
    expanded.add(t);

    const syns = ES_SYNONYMS[t];
    if (syns) {
      for (const s of syns) expanded.add(normalize(s));
    }
  }

  return { q, expandedArr: Array.from(expanded) };
}

/**
 * Nivel iOS:
 * - buscamos matches (EN+ES) con query expandida
 * - contamos por categoría
 * - elegimos la dominante
 */
function inferCategoryFromQuery(
  emojis: EmojiRow[],
  qRaw: string,
  emojiEsMap?: Record<string, EmojiEsEntry>
): string | null {
  const { q, expandedArr } = expandQuery(qRaw);
  if (!q) return null;

  const scores: Record<string, number> = {};

  for (const e of emojis) {
    const cat = e.category;
    if (!cat) continue;

    const haystack = buildEmojiHaystack(e, emojiEsMap);

    const matched = expandedArr.some((term) => safeIncludes(haystack, term));
    if (!matched) continue;

    scores[cat] = (scores[cat] ?? 0) + 1;
  }

  let best: string | null = null;
  let max = 0;

  for (const [cat, count] of Object.entries(scores)) {
    if (count > max) {
      max = count;
      best = cat;
    }
  }

  return best;
}

export function EmojiPickerSheet({ visible, value, onClose, onSelect }: Props) {
  // ✅ Mapa ES (CLDR) una vez
  const emojiEsMap = useMemo(() => emojiEs as Record<string, EmojiEsEntry>, []);

  const sheetRef = useRef<BottomSheetModal>(null);

  // fijo (no sube a fullscreen)
  const snapPoints = useMemo(() => ["70%"], []);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Smileys & Emotion");
  const [recents, setRecents] = useState<string[]>([]);
  const [internalOpen, setInternalOpen] = useState(false);

  // ✅ Si el usuario toca una categoría manualmente, no la pisamos con auto-infer.
  const manualCategoryRef = useRef(false);

  const allEmojis: EmojiRow[] = useMemo(() => {
    return (emojiDatasource as any as EmojiRow[]).filter(
      (e) => e?.unified && (e.has_img_apple || e.has_img_google)
    );
  }, []);

  // Recents
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setRecents(parsed.filter((x) => typeof x === "string"));
        }
      } catch {
        setRecents([]);
      }
    })();
  }, []);

  // Open/close
  useEffect(() => {
    if (visible) {
      setInternalOpen(true);
      requestAnimationFrame(() => sheetRef.current?.present());
      return;
    }
    sheetRef.current?.dismiss();
  }, [visible]);

  // Reset manual override when query clears
  useEffect(() => {
    if (!query.trim()) manualCategoryRef.current = false;
  }, [query]);

  // ✅ Auto-categoría estilo iOS (con debounce suave)
  useEffect(() => {
    if (!query.trim()) return;
    if (manualCategoryRef.current) return;

    const t = setTimeout(() => {
      const inferred = inferCategoryFromQuery(allEmojis, query, emojiEsMap);
      if (inferred && inferred !== category) {
        setCategory(inferred);
      }
    }, 90);

    return () => clearTimeout(t);
  }, [query, allEmojis, emojiEsMap, category]);

  const filtered: EmojiRow[] = useMemo(() => {
    const { q, expandedArr } = expandQuery(query);

    return allEmojis
      .filter((e) => (category ? e.category === category : true))
      .filter((e) => {
        if (!q) return true;

        const haystack = buildEmojiHaystack(e, emojiEsMap);
        return expandedArr.some((term) => safeIncludes(haystack, term));
      });
  }, [allEmojis, category, query, emojiEsMap]);

  async function pushRecent(emoji: string) {
    try {
      const next = [emoji, ...recents.filter((x) => x !== emoji)].slice(
        0,
        RECENTS_MAX
      );
      setRecents(next);
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {}
  }

  async function handlePick(emoji: string) {
    await pushRecent(emoji);
    onSelect(emoji);
    sheetRef.current?.dismiss();
  }

  function handleDismiss() {
    setInternalOpen(false);
    setQuery("");
    onClose();
  }

  function handleCategoryPress(cat: string) {
    manualCategoryRef.current = true;
    setCategory(cat);
  }

  if (!internalOpen) return null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      stackBehavior="push"
      onDismiss={handleDismiss}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      enablePanDownToClose
      enableHandlePanningGesture={false}
      enableContentPanningGesture
    >
      <BottomSheetFlatList
        data={filtered}
        keyExtractor={(item) => item.unified}
        numColumns={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={false}
        initialNumToRender={64}
        maxToRenderPerBatch={64}
        windowSize={12}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Header */}
            <View style={styles.topRow}>
              <Text style={styles.title}>Elegir ícono</Text>
              <Pressable
                onPress={() => sheetRef.current?.dismiss()}
                hitSlop={10}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <BottomSheetTextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar emoji… (ej: perro, gato, bandera chile)"
                placeholderTextColor="rgba(241,233,215,0.35)"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {!!query && (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={10}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearText}>×</Text>
                </Pressable>
              )}
            </View>

            {/* Recents */}
            {recents.length > 0 && (
              <View style={styles.recentsBlock}>
                <Text style={styles.sectionLabel}>Recientes</Text>
                <FlatList
                  data={recents}
                  horizontal
                  keyExtractor={(item, idx) => `${item}-${idx}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 6 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handlePick(item)}
                      style={[
                        styles.emojiCell,
                        value === item && styles.emojiCellActive,
                      ]}
                      hitSlop={6}
                    >
                      <Text style={styles.emojiText}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}

            {/* Categories */}
            <View style={styles.categoriesRow}>
              <FlatList
                data={CATEGORIES}
                horizontal
                keyExtractor={(c) => c.key}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.key === category;
                  return (
                    <Pressable
                      onPress={() => handleCategoryPress(item.key)}
                      style={[styles.catChip, active && styles.catChipActive]}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          active && styles.catChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const emoji = unifiedToChar(item.unified);
          const active = value === emoji;
          return (
            <Pressable
              onPress={() => handlePick(emoji)}
              style={[styles.gridCell, active && styles.gridCellActive]}
              hitSlop={6}
            >
              <Text style={styles.gridEmoji}>{emoji}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptySubtitle}>
              Prueba otra búsqueda o cambia categoría.
            </Text>
          </View>
        }
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "rgba(28,40,48,0.98)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: { backgroundColor: "rgba(241,233,215,0.25)" },

  headerWrap: { paddingHorizontal: 14, paddingTop: 8 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "900" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,233,215,0.08)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.14)",
  },
  closeText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: -2,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  searchIcon: {
    color: "rgba(241,233,215,0.55)",
    fontSize: 16,
    fontWeight: "900",
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.15)",
  },
  clearText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: -1,
  },

  recentsBlock: { marginBottom: 8 },
  sectionLabel: { color: colors.mutedText, fontSize: 12, fontWeight: "900" },

  emojiCell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.22)",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  emojiCellActive: {
    backgroundColor: "rgba(230,188,1,0.14)",
    borderColor: "rgba(230,188,1,0.45)",
  },
  emojiText: { fontSize: 18 },

  categoriesRow: { marginBottom: 10 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.22)",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: "rgba(241,233,215,0.10)",
    borderColor: "rgba(241,233,215,0.18)",
  },
  catChipText: { color: colors.text, fontWeight: "800", fontSize: 13 },
  catChipTextActive: { fontWeight: "900" },

  gridContent: { paddingBottom: 14, paddingHorizontal: 14 },

  gridCell: {
    width: "12.5%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellActive: {
    backgroundColor: "rgba(230,188,1,0.10)",
    borderRadius: 14,
  },
  gridEmoji: { fontSize: 20 },

  emptyBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  emptySubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
});
