// HaveIBeenPwned breach detection using k-anonymity
//
// How k-anonymity works:
// 1. SHA-1 hash the password using Web Crypto API
// 2. Convert hash to uppercase hex string
// 3. Send only the first 5 characters (prefix) to the HIBP API
// 4. API returns ~500 hash suffixes that match the prefix
// 5. Check if the remaining 35 chars of our hash appear in the response
// 6. If yes → the password has been found in a data breach
// 7. The API never learns the full hash → privacy preserved

/**
 * Check a single password against HaveIBeenPwned using k-anonymity.
 * @returns {{ breached: boolean, count: number }}
 */
export async function checkPasswordBreach(password) {
  // Step 1: SHA-1 hash the password
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);

  // Step 2: Convert to uppercase hex
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  // Step 3: Split into prefix (5 chars) and suffix (35 chars)
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  // Step 4: Query HIBP API with only the prefix (k-anonymity)
  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}`,
    { headers: { 'Add-Padding': 'true' } } // prevents traffic analysis
  );

  if (!response.ok) throw new Error('Breach check failed');

  // Step 5: Check if our suffix appears in the response
  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const [hashSuffix, countStr] = line.split(':');
    if (hashSuffix.trim() === suffix) {
      return { breached: true, count: parseInt(countStr.trim(), 10) };
    }
  }

  return { breached: false, count: 0 };
}

/**
 * Check all vault passwords for breaches and report progress.
 * @param {Array} decryptedEntries - entries with .decrypted.password
 * @param {Function} onProgress - callback(checked, total) for UI updates
 * @returns {Array<{ id, site, username, breached, count, error? }>}
 */
export async function checkAllPasswordsForBreaches(
  decryptedEntries,
  onProgress
) {
  const results = [];
  const total = decryptedEntries.filter((e) => e.decrypted?.password).length;
  let checked = 0;

  for (const entry of decryptedEntries) {
    const pw = entry.decrypted?.password;
    if (!pw) continue;

    try {
      const result = await checkPasswordBreach(pw);
      results.push({
        id: entry._id,
        site: entry.site,
        username: entry.username,
        ...result,
      });
    } catch {
      results.push({
        id: entry._id,
        site: entry.site,
        username: entry.username,
        breached: false,
        count: 0,
        error: true,
      });
    }

    checked++;
    onProgress?.(checked, total);

    // Small delay between requests to respect rate limits
    if (checked < total) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return results;
}
