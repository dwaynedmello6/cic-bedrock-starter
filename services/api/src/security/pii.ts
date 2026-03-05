// services/api/src/security/pii.ts

export type PiiType = "EMAIL" | "PHONE" | "ADDRESS";

type MatchResult = { types: PiiType[]; matches: number };

type RedactResult = {
  redactedText: string;
  piiTypes: PiiType[];
  redactionCount: number;
};

const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

// Covers common NA formats:
// 604-123-4567, (604) 123-4567, 604 123 4567, +1 604 123 4567
const PHONE_RE =
  /\b(?:\+?1[\s.-]?)?(?:\(\s*\d{3}\s*\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

// Very simple heuristic: number + street-ish word.
// This is intentionally conservative and not “perfect”.
const ADDRESS_RE =
  /\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){0,5}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Pkwy|Parkway)\b/gi;

export function detectPii(text: string): MatchResult {
  const types: PiiType[] = [];
  let matches = 0;

  const emailMatches = text.match(EMAIL_RE) ?? [];
  if (emailMatches.length) {
    types.push("EMAIL");
    matches += emailMatches.length;
  }

  const phoneMatches = text.match(PHONE_RE) ?? [];
  if (phoneMatches.length) {
    types.push("PHONE");
    matches += phoneMatches.length;
  }

  const addrMatches = text.match(ADDRESS_RE) ?? [];
  if (addrMatches.length) {
    types.push("ADDRESS");
    matches += addrMatches.length;
  }

  return { types, matches };
}

export function redactPii(text: string): RedactResult {
  let redactionCount = 0;

  const replaceAndCount = (input: string, re: RegExp, token: string) => {
    return input.replace(re, () => {
      redactionCount += 1;
      return token;
    });
  };

  let out = text;
  out = replaceAndCount(out, EMAIL_RE, "[REDACTED_EMAIL]");
  out = replaceAndCount(out, PHONE_RE, "[REDACTED_PHONE]");
  out = replaceAndCount(out, ADDRESS_RE, "[REDACTED_ADDRESS]");

  const { types } = detectPii(text); // detect on original text to report types
  return { redactedText: out, piiTypes: types, redactionCount };
}