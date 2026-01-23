import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_KEY = 'dayloop_review_requested';

export const ReviewService = {
  /**
   * Lanza el popup nativo de Apple/Google Review si no se ha pedido antes.
   */
  async triggerReviewFlow() {
    try {
      const hasAsked = await AsyncStorage.getItem(REVIEW_KEY);
      if (hasAsked) return;

      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        // El sistema decide si mostrarlo o no según sus propias reglas
        await StoreReview.requestReview();
        await AsyncStorage.setItem(REVIEW_KEY, 'true');
      }
    } catch (error) {
      console.warn('[ReviewService] Error:', error);
    }
  }
};
