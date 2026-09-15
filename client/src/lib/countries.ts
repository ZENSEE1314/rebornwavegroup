// Country name + international dial code, ordered with SE-Asia first (club is in Batam).
export interface Country { name: string; dial: string; }

export const COUNTRIES: Country[] = [
  { name: "Indonesia", dial: "+62" },
  { name: "Singapore", dial: "+65" },
  { name: "Malaysia", dial: "+60" },
  { name: "Thailand", dial: "+66" },
  { name: "Philippines", dial: "+63" },
  { name: "Vietnam", dial: "+84" },
  { name: "China", dial: "+86" },
  { name: "Hong Kong", dial: "+852" },
  { name: "Taiwan", dial: "+886" },
  { name: "Japan", dial: "+81" },
  { name: "South Korea", dial: "+82" },
  { name: "India", dial: "+91" },
  { name: "Australia", dial: "+61" },
  { name: "United Kingdom", dial: "+44" },
  { name: "United States", dial: "+1" },
  { name: "Canada", dial: "+1" },
  { name: "Germany", dial: "+49" },
  { name: "France", dial: "+33" },
  { name: "Netherlands", dial: "+31" },
  { name: "United Arab Emirates", dial: "+971" },
  { name: "Saudi Arabia", dial: "+966" },
  { name: "New Zealand", dial: "+64" },
  { name: "Other", dial: "" },
];

// Unique dial codes for a phone country-code dropdown.
export const DIAL_CODES: string[] = Array.from(new Set(COUNTRIES.map((c) => c.dial).filter(Boolean)))
  .sort((a, b) => a.localeCompare(b));
