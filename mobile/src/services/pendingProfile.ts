// The create-account flow collects the profile before the account exists, so
// there is no token to upload with yet. Hold it here until the OTP is
// verified, then flush it onto the fresh session.
export type PendingProfile = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  /** data URL of the chosen avatar */
  profilePhoto?: string;
};

let pending: PendingProfile | null = null;

export function setPendingProfile(profile: PendingProfile) {
  pending = profile;
}

/** Returns what was stashed (and clears it) so it is applied exactly once. */
export function takePendingProfile(): PendingProfile | null {
  const snapshot = pending;
  pending = null;
  return snapshot;
}
