import uuid from "react-native-uuid";

/**
 * UUID v4 string compatible con iOS/Android (Hermes)
 */
export const newId = (): string => {
  return String(uuid.v4());
};
