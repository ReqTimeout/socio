/**
 * Disposable / temporary email domain blocklist.
 * Ported from legacy PHP `lib/disposable-emails.php`.
 * Keep this list small but effective — common throwaway providers.
 */
const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.net",
  "getnada.com",
  "nada.email",
  "trashmail.com",
  "trashmail.net",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mailnesia.com",
  "mintemail.com",
  "spam4.me",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spambog.com",
  "tempinbox.com",
  "emailondeck.com",
  "mailcatch.com",
  "mohmal.com",
  "tempmailo.com",
  "burnermail.io",
  "throwawaymail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}
