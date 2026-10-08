export const HOSPITAL_COVER_PRICES = Object.freeze({
  None: 0,
  Basic: 90,
  Bronze: 120,
  Silver: 160,
  Gold: 220
});

export const EXTRA_COVER_PRICES = Object.freeze({
  None: 0,
  Basic: 25,
  Standard: 45,
  Premium: 70
});

export function getAdultCount(coverType) {
  if (coverType === "Single") return 1;
  if (coverType === "Couple" || coverType === "Family") return 2;
  return 0;
}

export function getAge(dateValue) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) return null;
  const [day, month, year] = dateValue.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDifference = today.getMonth() - date.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < date.getDate())) age -= 1;
  return age;
}

export function getLhcLoading(age, history, hospitalCoverLevel) {
  if (hospitalCoverLevel === "None" || history !== "No" || age <= 30) return 0;
  return Math.max(0, (age - 30) * 0.02);
}

export function calculateQuotePremium(input) {
  const adultCount = getAdultCount(input.coverType);
  const applicants = [
    { age: input.applicant1Age, history: input.applicant1History },
    { age: input.applicant2Age, history: input.applicant2History },
    { age: input.applicant3Age, history: input.applicant3History },
    { age: input.applicant4Age, history: input.applicant4History }
  ].slice(0, adultCount);

  const hospitalRows = applicants.map((applicant) => {
    const age = getAge(applicant.age);
    const loading = getLhcLoading(age, applicant.history, input.hospitalCoverLevel);
    const unitPrice = HOSPITAL_COVER_PRICES[input.hospitalCoverLevel] ?? 0;
    return {
      applicant: applicants.indexOf(applicant) + 1,
      age,
      history: applicant.history,
      loading,
      price: unitPrice * (1 + loading)
    };
  });

  const hospitalTotal = hospitalRows.reduce((sum, row) => sum + row.price, 0);
  const extrasTotal = (EXTRA_COVER_PRICES[input.extraCoverLevel] ?? 0) * adultCount;
  const familyFee = input.coverType === "Family" ? 30 : 0;
  const monthlyPremium = hospitalTotal + extrasTotal + familyFee;
  const annualDiscount = input.annualDiscountPct / 100;
  const yearlyBeforeDiscount = monthlyPremium * 12;
  const yearlyAfterDiscount = input.paymentFrequency === "Yearly"
    ? yearlyBeforeDiscount * (1 - annualDiscount)
    : yearlyBeforeDiscount;

  return {
    adultCount,
    hospitalTotal,
    extrasTotal,
    familyFee,
    monthlyPremium,
    yearlyBeforeDiscount,
    yearlyAfterDiscount,
    hospitalRows,
    unknownHistoryApplicants: hospitalRows
      .filter((row) => row.history === "Not sure" && input.hospitalCoverLevel !== "None")
      .map((row) => row.applicant)
  };
}
