export interface PublicForm {
  id: string;
  name: string;
  description: string;
  category:
    | "Tax"
    | "Immigration"
    | "Employment"
    | "Real Estate"
    | "Social Security"
    | "Health";
  sourceUrl: string;
  domain: string;
  isGov: boolean;
  tags: string[];
  downloadCount: number;
  fieldCount: number;
}

export const PUBLIC_FORM_LIBRARY: PublicForm[] = [
  {
    id: "irs-w9",
    name: "IRS W-9",
    description: "Request for Taxpayer Identification Number and Certification",
    category: "Tax",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/fw9.pdf",
    domain: "irs.gov",
    isGov: true,
    tags: [
      "w9",
      "w-9",
      "tax",
      "taxpayer",
      "tin",
      "irs",
      "contractor",
      "freelance",
    ],
    downloadCount: 3400,
    fieldCount: 8,
  },
  {
    id: "irs-w4",
    name: "IRS W-4",
    description:
      "Employee's Withholding Certificate — tells your employer how much tax to withhold",
    category: "Tax",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/fw4.pdf",
    domain: "irs.gov",
    isGov: true,
    tags: ["w4", "w-4", "tax", "withholding", "employee", "irs", "payroll"],
    downloadCount: 3100,
    fieldCount: 10,
  },
  {
    id: "irs-1040",
    name: "IRS Form 1040",
    description:
      "U.S. Individual Income Tax Return — primary federal tax filing form",
    category: "Tax",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
    domain: "irs.gov",
    isGov: true,
    tags: ["1040", "tax return", "income tax", "federal tax", "irs", "annual"],
    downloadCount: 2900,
    fieldCount: 24,
  },
  {
    id: "uscis-i9",
    name: "USCIS I-9",
    description:
      "Employment Eligibility Verification — required for all U.S. employees",
    category: "Employment",
    sourceUrl:
      "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf",
    domain: "uscis.gov",
    isGov: true,
    tags: [
      "i9",
      "i-9",
      "employment",
      "eligibility",
      "verification",
      "uscis",
      "work authorization",
    ],
    downloadCount: 2700,
    fieldCount: 12,
  },
  {
    id: "uscis-n400",
    name: "USCIS N-400",
    description: "Application for Naturalization — apply for U.S. citizenship",
    category: "Immigration",
    sourceUrl:
      "https://www.uscis.gov/sites/default/files/document/forms/n-400.pdf",
    domain: "uscis.gov",
    isGov: true,
    tags: [
      "n400",
      "n-400",
      "naturalization",
      "citizenship",
      "uscis",
      "immigration",
    ],
    downloadCount: 2400,
    fieldCount: 36,
  },
  {
    id: "ssa-ss5",
    name: "SSA SS-5",
    description:
      "Application for a Social Security Card — new, replacement, or corrected card",
    category: "Social Security",
    sourceUrl: "https://www.ssa.gov/forms/ss-5.pdf",
    domain: "ssa.gov",
    isGov: true,
    tags: [
      "ss5",
      "ss-5",
      "social security",
      "ssn",
      "ssa",
      "social security card",
    ],
    downloadCount: 2200,
    fieldCount: 14,
  },
  {
    id: "hud-rental",
    name: "HUD Rental Application",
    description:
      "Housing and Urban Development standard rental application form",
    category: "Real Estate",
    sourceUrl: "https://www.hud.gov/sites/documents/52574.pdf",
    domain: "hud.gov",
    isGov: true,
    tags: ["rental", "hud", "housing", "apartment", "tenant", "application"],
    downloadCount: 1900,
    fieldCount: 18,
  },
  {
    id: "ca-rental",
    name: "CA Rental Agreement",
    description:
      "California standard residential lease agreement (Judicial Council form)",
    category: "Real Estate",
    sourceUrl:
      "https://www.courts.ca.gov/documents/unlawful-detainer-lease.pdf",
    domain: "courts.ca.gov",
    isGov: true,
    tags: [
      "california",
      "rental agreement",
      "lease",
      "ca",
      "tenant",
      "landlord",
      "residential",
    ],
    downloadCount: 1700,
    fieldCount: 22,
  },
  {
    id: "fafsa",
    name: "FAFSA",
    description:
      "Free Application for Federal Student Aid — financial aid for college",
    category: "Employment",
    sourceUrl:
      "https://studentaid.gov/sites/default/files/2024-25-fafsa-paper-form.pdf",
    domain: "studentaid.gov",
    isGov: true,
    tags: [
      "fafsa",
      "student aid",
      "financial aid",
      "college",
      "education",
      "federal",
    ],
    downloadCount: 1600,
    fieldCount: 28,
  },
  {
    id: "va-21-526ez",
    name: "VA Form 21-526EZ",
    description:
      "Application for Disability Compensation and Related Compensation Benefits",
    category: "Health",
    sourceUrl: "https://www.va.gov/vaforms/va/pdf/VA21-526EZ.pdf",
    domain: "va.gov",
    isGov: true,
    tags: [
      "va",
      "veteran",
      "disability",
      "compensation",
      "21-526ez",
      "benefits",
    ],
    downloadCount: 1400,
    fieldCount: 20,
  },
  {
    id: "medicare-enrollment",
    name: "Medicare Enrollment",
    description: "CMS-40B — Application for Enrollment in Medicare Part B",
    category: "Health",
    sourceUrl:
      "https://www.cms.gov/medicare/cms-forms/cms-forms/downloads/cms40b.pdf",
    domain: "cms.gov",
    isGov: true,
    tags: [
      "medicare",
      "cms",
      "health insurance",
      "enrollment",
      "part b",
      "cms-40b",
    ],
    downloadCount: 1200,
    fieldCount: 10,
  },
  {
    id: "osha-300",
    name: "OSHA 300 Injury Log",
    description:
      "Log of Work-Related Injuries and Illnesses — required OSHA recordkeeping form",
    category: "Employment",
    sourceUrl:
      "https://www.osha.gov/sites/default/files/OSHA-RK-Forms-Package.pdf",
    domain: "osha.gov",
    isGov: true,
    tags: [
      "osha",
      "300",
      "injury",
      "illness",
      "workplace",
      "recordkeeping",
      "safety",
    ],
    downloadCount: 1000,
    fieldCount: 16,
  },
];

export function searchForms(query: string): PublicForm[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return PUBLIC_FORM_LIBRARY.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.tags.some((t) => t.includes(q)) ||
      f.category.toLowerCase().includes(q),
  );
}

export function getTrendingForms(count = 5): PublicForm[] {
  return [...PUBLIC_FORM_LIBRARY]
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, count);
}
