/**
 * Semantic mapping utility for DocFill AI.
 *
 * Maps raw PDF form field label strings to Master Profile keys using a
 * comprehensive alias dictionary. The matching logic runs in three passes:
 *   1. Exact alias match         → matchType: "semantic"
 *   2. Contains / partial match  → matchType: "semantic"
 *   3. Keyword fallback          → matchType: "keyword"
 */

// ---------------------------------------------------------------------------
// Alias dictionary
// ---------------------------------------------------------------------------

const ALIAS_MAP: Record<string, string[]> = {
  name: [
    "full name",
    "fullname",
    "legal name",
    "legal full name",
    "print name",
    "please print name",
    "name (print)",
    "name (last, first)",
    "full legal name",
    "applicant name",
    "applicant's name",
    "name of applicant",
    "beneficiary name",
    "beneficiary's name",
    "name of beneficiary",
    "representative name",
    "authorized representative",
    "claimant name",
    "claimant's name",
    "insured name",
    "insured's name",
    "name of insured",
    "policyholder name",
    "policyholder's name",
    "taxpayer name",
    "taxpayer's name",
    "account holder",
    "account holder name",
    "account holder's name",
    "cardholder name",
    "cardholder's name",
    "member name",
    "member's name",
    "patient name",
    "patient's name",
    "resident name",
    "resident's name",
    "subscriber name",
    "subscriber's name",
    "employee name",
    "employee's name",
    "student name",
    "student's name",
    "owner name",
    "owner's name",
    "contact name",
    "your name",
    "first and last name",
    "last name, first name",
    "name of individual",
    "individual name",
    "guardian name",
    "guardian's name",
    "responsible party",
    "signature name",
    "print full name",
    "printed name",
    "name as it appears",
    "name on account",
    "name on card",
    "name (please print)",
    "applicant (last, first, middle)",
    "full name (print)",
  ],

  email: [
    "email",
    "email address",
    "e-mail",
    "e-mail address",
    "electronic mail",
    "email id",
    "e-mail id",
    "contact email",
    "business email",
    "personal email",
    "email (required)",
    "email address (required)",
    "primary email",
    "secondary email",
    "work email",
    "home email",
    "email address (work)",
    "email address (home)",
    "email / username",
    "email address or username",
    "your email",
    "your email address",
    "preferred email",
    "preferred email address",
    "notification email",
    "recovery email",
    "alternate email",
    "alternate email address",
  ],

  phone: [
    "phone",
    "phone number",
    "telephone",
    "telephone number",
    "tel",
    "tel.",
    "mobile",
    "mobile number",
    "mobile phone",
    "mobile phone number",
    "cell",
    "cell phone",
    "cell number",
    "cell phone number",
    "contact number",
    "contact phone",
    "home phone",
    "home telephone",
    "home phone number",
    "work phone",
    "work telephone",
    "work phone number",
    "office phone",
    "business phone",
    "primary phone",
    "primary phone number",
    "secondary phone",
    "secondary phone number",
    "daytime phone",
    "daytime telephone",
    "daytime phone number",
    "evening phone",
    "evening telephone",
    "evening phone number",
    "phone (home)",
    "phone (work)",
    "phone (cell)",
    "best contact number",
    "best phone number",
    "alt phone",
    "alternate phone",
    "alternate phone number",
    "fax",
    "fax number",
    "your phone number",
    "your telephone",
    "phone no.",
    "ph.",
    "ph. no.",
  ],

  street: [
    "street",
    "street address",
    "mailing address",
    "home address",
    "residential address",
    "address",
    "address line 1",
    "address line 2",
    "physical address",
    "current address",
    "permanent address",
    "primary address",
    "apt/street",
    "house number",
    "house number and street",
    "po box",
    "p.o. box",
    "address (street)",
    "street name",
    "street and number",
    "building address",
    "apt / suite",
    "apartment address",
    "delivery address",
    "billing address",
    "registered address",
    "legal address",
    "address1",
    "addr1",
    "addr.",
    "street 1",
    "address line one",
    "street address line 1",
  ],

  city: [
    "city",
    "town",
    "municipality",
    "locality",
    "city/town",
    "city or town",
    "city, state",
    "city, state, zip",
    "city name",
    "billing city",
    "mailing city",
    "home city",
  ],

  state: [
    "state",
    "province",
    "region",
    "state/province",
    "state or province",
    "state of residence",
    "state/territory",
    "territory",
    "state abbreviation",
    "state code",
    "us state",
    "billing state",
    "mailing state",
  ],

  zip: [
    "zip",
    "zip code",
    "postal code",
    "postcode",
    "zip/postal code",
    "zip code (5 digit)",
    "zip + 4",
    "zip+4",
    "postal",
    "post code",
    "zip / postal",
    "zip or postal code",
    "billing zip",
    "mailing zip",
    "zip code or postal code",
  ],

  dob: [
    "dob",
    "d.o.b.",
    "d.o.b",
    "date of birth",
    "birth date",
    "birthday",
    "date of birth (mm/dd/yyyy)",
    "date of birth (dd/mm/yyyy)",
    "birth date (mm/dd/yyyy)",
    "date born",
    "month/day/year of birth",
    "birth year",
    "date of birth (yyyy-mm-dd)",
    "birth day",
    "birthdate",
    "birth / dob",
    "born on",
    "date of birth (required)",
    "patient date of birth",
    "applicant date of birth",
    "your date of birth",
  ],

  idNumber: [
    "id number",
    "id no",
    "id no.",
    "id#",
    "identification number",
    "passport number",
    "passport no",
    "passport no.",
    "social security number",
    "social security no",
    "ssn",
    "s.s.n.",
    "ss#",
    "social security",
    "driver license number",
    "driver's license",
    "driver's license number",
    "driver license no",
    "dl number",
    "dl#",
    "national id",
    "national id number",
    "national identification number",
    "tax id",
    "tax id number",
    "tin",
    "ein",
    "employer identification number",
    "government id",
    "government id number",
    "card number",
    "member id",
    "member id number",
    "membership number",
    "badge number",
    "badge id",
    "policy number",
    "account number",
    "license number",
    "id/passport number",
    "id or passport number",
    "national insurance number",
    "nin",
  ],

  employer: [
    "employer",
    "employer name",
    "company",
    "company name",
    "organization",
    "organisation",
    "business",
    "business name",
    "workplace",
    "place of employment",
    "current employer",
    "name of employer",
    "firm",
    "firm name",
    "employer / company",
    "current company",
    "employer (if applicable)",
    "work for",
    "works for",
    "employed by",
    "employment company",
  ],

  jobTitle: [
    "job title",
    "job title (print)",
    "position",
    "occupation",
    "role",
    "title",
    "current position",
    "job position",
    "position title",
    "work title",
    "professional title",
    "designation",
    "current role",
    "job role",
    "employment title",
    "position / title",
    "title / position",
    "job description",
    "job classification",
    "job code",
    "trade",
    "trade / occupation",
    "field of work",
    "area of work",
    "your occupation",
    "occupation (if applicable)",
  ],
};

// ---------------------------------------------------------------------------
// Friendly labels for display
// ---------------------------------------------------------------------------

export const MASTER_PROFILE_LABELS: Record<string, string> = {
  name: "Full Name",
  email: "Email Address",
  phone: "Phone Number",
  street: "Street Address",
  city: "City",
  state: "State",
  zip: "Zip Code",
  dob: "Date of Birth",
  idNumber: "ID / Passport Number",
  employer: "Employer",
  jobTitle: "Job Title",
};

// ---------------------------------------------------------------------------
// Keyword fallback table (legacy, last-resort)
// ---------------------------------------------------------------------------

const KEYWORD_MAP: { keywords: string[]; key: string }[] = [
  { keywords: ["name"], key: "name" },
  { keywords: ["email"], key: "email" },
  { keywords: ["phone", "tel", "mobile", "cell"], key: "phone" },
  { keywords: ["street", "address", "addr"], key: "street" },
  { keywords: ["city", "town"], key: "city" },
  { keywords: ["state", "province"], key: "state" },
  { keywords: ["zip", "postal"], key: "zip" },
  { keywords: ["birth", "dob"], key: "dob" },
  {
    keywords: ["id", "passport", "ssn", "license", "identification"],
    key: "idNumber",
  },
  {
    keywords: [
      "employer",
      "company",
      "organization",
      "organisation",
      "business",
    ],
    key: "employer",
  },
  { keywords: ["title", "occupation", "position", "role"], key: "jobTitle" },
];

// ---------------------------------------------------------------------------
// Normalize helper
// ---------------------------------------------------------------------------

function normalize(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeKeyword(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface SemanticMapResult {
  key: string | null;
  matchType: "semantic" | "keyword";
}

/**
 * Maps a raw PDF form field label to a Master Profile key.
 *
 * Pass 1 — exact alias match  (matchType: "semantic")
 * Pass 2 — contains / partial match  (matchType: "semantic")
 * Pass 3 — keyword fallback  (matchType: "keyword")
 * Fallback — { key: null, matchType: "keyword" }
 */
export function semanticMap(rawLabel: string): SemanticMapResult {
  const norm = normalize(rawLabel);

  // Pass 1: exact alias match
  for (const [key, aliases] of Object.entries(ALIAS_MAP)) {
    for (const alias of aliases) {
      if (norm === alias) {
        return { key, matchType: "semantic" };
      }
    }
  }

  // Pass 2: contains / partial alias match
  for (const [key, aliases] of Object.entries(ALIAS_MAP)) {
    for (const alias of aliases) {
      if (norm.includes(alias) || alias.includes(norm)) {
        return { key, matchType: "semantic" };
      }
    }
  }

  // Pass 3: keyword fallback (strip non-alphanumeric)
  const normKw = normalizeKeyword(rawLabel);
  for (const { keywords, key } of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (normKw.includes(kw)) {
        return { key, matchType: "keyword" };
      }
    }
  }

  return { key: null, matchType: "keyword" };
}
