import test from "node:test";
import assert from "node:assert/strict";
import { validateQuotePayload } from "../src/quote-validation.js";

test("rejects missing customer name and required cover data", () => {
  const result = validateQuotePayload({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.customerName);
  assert.ok(result.errors.coverType);
});

test("requires applicant 2 for Couple and Family", () => {
  const couple = validateQuotePayload({ customerName: "A", coverType: "Couple", applicant1Age: "15/01/1990", applicant2Age: "", hospitalCoverLevel: "None", extraCoverLevel: "None", paymentFrequency: "Monthly", annualDiscountPct: 0 });
  assert.equal(couple.valid, false);
  assert.ok(couple.errors.applicant2Age);
});

test("accepts a Single quote when unused applicant history fields are empty", () => {
  const result = validateQuotePayload({
    customerName: "311",
    coverType: "Single",
    applicant1Age: "01/01/1990",
    applicant1History: "No",
    applicant2History: "",
    applicant3History: "",
    applicant4History: "",
    hospitalCoverLevel: "Silver",
    extraCoverLevel: "Basic",
    paymentFrequency: "Monthly",
    annualDiscountPct: 0
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("rejects invalid annual discount", () => {
  const result = validateQuotePayload({ customerName: "A", coverType: "Single", applicant1Age: "15/01/1990", hospitalCoverLevel: "None", extraCoverLevel: "None", paymentFrequency: "Monthly", annualDiscountPct: 11 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.annualDiscountPct);
});
