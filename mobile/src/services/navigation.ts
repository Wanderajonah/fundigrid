import { router, type Href } from 'expo-router';

/**
 * router.back() throws "goBack() wasn't handled by any navigator" when the
 * screen is the first (or only) entry in the stack — which happens on the
 * auth screens, since the app replaces into them instead of pushing.
 */
export function goBackSafe(fallback: Href = '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
