import { getHasSeenOnboarding } from "@/core/settings/onboardingSettings";
import { useEffect, useState } from "react";

export function useOnboardingGate() {
  const [loading, setLoading] = useState(true);
  const [hasSeen, setHasSeen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const v = await getHasSeenOnboarding();
      if (mounted) {
        setHasSeen(v);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, hasSeen };
}
