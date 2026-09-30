// Everything the client typed on the request screen has to survive the trip
// through matching before a booking exists. Holding it here means the booking
// screen can pre-fill instead of asking for the same details twice.
type RequestDraft = {
  photos: string[];
  service: string;
  description: string;
  location: string;
  date: string;
};

let draft: RequestDraft = { photos: [], service: '', description: '', location: '', date: '' };

export function setRequestDraft(next: Partial<RequestDraft>): void {
  draft = { ...draft, ...next };
}

export function getRequestDraft(): RequestDraft {
  return draft;
}

export function clearRequestDraft(): void {
  draft = { photos: [], service: '', description: '', location: '', date: '' };
}
