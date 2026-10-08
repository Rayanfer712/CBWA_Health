export const COVER_TYPES = new Set(["Single", "Couple", "Family"]);
export const HOSPITAL_COVER_LEVELS = new Set(["None", "Basic", "Bronze", "Silver", "Gold"]);
export const EXTRA_COVER_LEVELS = new Set(["None", "Basic", "Standard", "Premium"]);
export const PAYMENT_FREQUENCIES = new Set(["Monthly", "Yearly"]);
export const HOSPITAL_HISTORIES = new Set(["Yes", "No", "Not sure"]);

export function validateQuotePayload(payload) {
  const errors = {};
  const customerName = typeof payload.customerName === "string" ? payload.customerName.trim() : "";
  const coverType = payload.coverType;
  const hospitalCoverLevel = payload.hospitalCoverLevel;
  const extraCoverLevel = payload.extraCoverLevel;
  const paymentFrequency = payload.paymentFrequency;
  const annualDiscountPct = payload.annualDiscountPct === undefined ? 0 : Number(payload.annualDiscountPct);
  const applicantAges = [
    payload.applicant1Age,
    payload.applicant2Age,
    payload.applicant3Age,
    payload.applicant4Age
  ].map((value) => typeof value === "string" ? value.trim() : "");

  if (!customerName) errors.customerName = "Customer name is required.";
  if (!COVER_TYPES.has(coverType)) errors.coverType = "Select a valid cover type.";
  if (!HOSPITAL_COVER_LEVELS.has(hospitalCoverLevel)) errors.hospitalCoverLevel = "Select a hospital cover level.";
  if (!EXTRA_COVER_LEVELS.has(extraCoverLevel)) errors.extraCoverLevel = "Select an extras cover level.";
  if (!PAYMENT_FREQUENCIES.has(paymentFrequency)) errors.paymentFrequency = "Select a payment frequency.";

  const adultCount = coverType === "Single" ? 1 : coverType === "Couple" || coverType === "Family" ? 2 : 0;
  if (coverType && (coverType === "Couple" || coverType === "Family")) {
    if (!applicantAges[1]) errors.applicant2Age = "Applicant 2 age is required for this cover type.";
  }
  if (coverType === "Family") {
    if (applicantAges[2]) {
      validateAge(applicantAges[2], "applicant3Age", errors);
    }
    if (applicantAges[3]) {
      validateAge(applicantAges[3], "applicant4Age", errors);
    }
  }

  for (let index = 0; index < Math.min(adultCount, applicantAges.length); index += 1) {
    validateAge(applicantAges[index], `applicant${index + 1}Age`, errors);
  }

  const historyValues = [
    ["applicant1History", payload.applicant1History],
    ["applicant2History", payload.applicant2History],
    ["applicant3History", payload.applicant3History],
    ["applicant4History", payload.applicant4History]
  ];

  for (const [fieldName, history] of historyValues) {
    if (history !== undefined && history !== "" && !HOSPITAL_HISTORIES.has(history)) {
      errors[fieldName] = `Select a valid hospital cover history for ${fieldName === "applicant1History" ? "Applicant 1" : `Applicant ${fieldName.match(/applicant(\d+)/)[1]}`}.`;
    }
  }

  if (Number.isNaN(annualDiscountPct) || annualDiscountPct < 0 || annualDiscountPct > 10) {
    errors.annualDiscountPct = "Annual discount must be between 0% and 10%.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      customerName,
      coverType,
      applicant1Age: applicantAges[0],
      applicant2Age: applicantAges[1],
      applicant3Age: applicantAges[2],
      applicant4Age: applicantAges[3],
      applicant1History: payload.applicant1History,
      applicant2History: payload.applicant2History,
      applicant3History: payload.applicant3History,
      applicant4History: payload.applicant4History,
      hospitalCoverLevel,
      extraCoverLevel,
      paymentFrequency,
      annualDiscountPct,
      notes: typeof payload.notes === "string" ? payload.notes.trim() : ""
    }
  };
}

function validateAge(value, fieldName, errors) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    errors[fieldName] = "Enter a valid date of birth in DD/MM/YYYY format.";
    return;
  }

  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    errors[fieldName] = "Enter a valid date of birth.";
    return;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDifference = today.getMonth() - date.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < date.getDate())) age -= 1;

  if (age < 18 || age > 100) errors[fieldName] = "Age must be between 18 and 100 years.";
}
