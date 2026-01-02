// src/theme/fonts.ts
import { useFonts } from "expo-font";

import {
     Poppins_100Thin,
     Poppins_100Thin_Italic,
     Poppins_200ExtraLight,
     Poppins_300Light,
     Poppins_400Regular,
     Poppins_400Regular_Italic,
     Poppins_500Medium,
     Poppins_600SemiBold,
     Poppins_700Bold,
     Poppins_800ExtraBold,
     Poppins_900Black,
} from "@expo-google-fonts/poppins";

import { ScopeOne_400Regular } from "@expo-google-fonts/scope-one";

export function useAppFonts() {
  const [loaded] = useFonts({
    Poppins_100Thin,
    Poppins_200ExtraLight,
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
    Poppins_100Thin_Italic,
    Poppins_400Regular_Italic,
    ScopeOne_400Regular,
  });

  return loaded;
}
