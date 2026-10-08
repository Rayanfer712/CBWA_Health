import React from "https://esm.sh/react@19";
import { createRoot } from "https://esm.sh/react-dom/client";

const { useEffect, useMemo, useState } = React;
const h = React.createElement;
const Fragment = React.Fragment;

const API = "/api";
const HOSPITAL_PRICES = { None: 0, Basic: 90, Bronze: 120, Silver: 160, Gold: 220 };
const EXTRA_PRICES = { None: 0, Basic: 25, Standard: 45, Premium: 70 };
const COVER_TYPES = ["Single", "Couple", "Family"];
const HOSPITAL_LEVELS = ["None", "Basic", "Bronze", "Silver", "Gold"];
const EXTRA_LEVELS = ["None", "Basic", "Standard", "Premium"];
const HISTORIES = ["Yes", "No", "Not sure"];

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function dateText(value) {
  return value ? new Date(value).toLocaleDateString("en-AU") : "-";
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const details = data?.errors ? Object.values(data.errors).join(" ") : "";
    throw new Error([data?.error, details].filter(Boolean).join(" ") || "Request failed.");
  }
  return data;
}

function emptyForm() {
  return {
    customerName: "",
    coverType: "Single",
    applicant1Age: "",
    applicant2Age: "",
    applicant3Age: "",
    applicant4Age: "",
    applicant1History: "",
    applicant2History: "",
    applicant3History: "",
    applicant4History: "",
    hospitalCoverLevel: "None",
    extraCoverLevel: "None",
    paymentFrequency: "Monthly",
    annualDiscountPct: 0,
    notes: ""
  };
}

function formFromQuote(quote) {
  return {
    customerName: quote.customerName || "",
    coverType: quote.coverType || "Single",
    applicant1Age: quote.applicant1Age || "",
    applicant2Age: quote.applicant2Age || "",
    applicant3Age: quote.applicant3Age || "",
    applicant4Age: quote.applicant4Age || "",
    applicant1History: quote.applicant1History || "",
    applicant2History: quote.applicant2History || "",
    applicant3History: quote.applicant3History || "",
    applicant4History: quote.applicant4History || "",
    hospitalCoverLevel: quote.hospitalCoverLevel || "None",
    extraCoverLevel: quote.extraCoverLevel || "None",
    paymentFrequency: quote.paymentFrequency || "Monthly",
    annualDiscountPct: quote.annualDiscountPct ?? 0,
    notes: quote.notes || ""
  };
}

function formatDob(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function getAge(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value || "")) return null;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1;
  return age;
}

function validAdultDob(value) {
  const age = getAge(value);
  return age !== null && age >= 18 && age <= 100;
}

function calculatePreview(form) {
  const adultCount = form.coverType === "Single" ? 1 : 2;
  const ages = [form.applicant1Age, form.applicant2Age].slice(0, adultCount);
  const historyValues = [form.applicant1History, form.applicant2History].slice(0, adultCount);

  const hospitalRows = ages.map((dob, index) => {
    const age = getAge(dob);
    const history = historyValues[index] || "";
    const loading = !age || form.hospitalCoverLevel === "None" || history !== "No" || age <= 30
      ? 0
      : Math.max(0, (age - 30) * 0.02);
    const unitPrice = HOSPITAL_PRICES[form.hospitalCoverLevel] || 0;
    return {
      applicant: index + 1,
      history,
      loading,
      price: unitPrice * (1 + loading)
    };
  });

  const hospitalTotal = hospitalRows.reduce((sum, row) => sum + row.price, 0);
  const extrasTotal = (EXTRA_PRICES[form.extraCoverLevel] || 0) * adultCount;
  const familyFee = form.coverType === "Family" ? 30 : 0;
  const monthlyPremium = hospitalTotal + extrasTotal + familyFee;
  const yearlyBeforeDiscount = monthlyPremium * 12;
  const discount = Number(form.annualDiscountPct || 0) / 100;
  const yearlyAfterDiscount = form.paymentFrequency === "Yearly"
    ? yearlyBeforeDiscount * (1 - discount)
    : yearlyBeforeDiscount;

  return {
    hospitalTotal,
    extrasTotal,
    familyFee,
    monthlyPremium,
    yearlyBeforeDiscount,
    yearlyAfterDiscount,
    unknownHistoryApplicants: hospitalRows
      .filter((row) => row.history === "Not sure" && form.hospitalCoverLevel !== "None")
      .map((row) => row.applicant)
  };
}

function Button({ children, onClick, type = "button", danger = false, disabled = false }) {
  return h("button", {
    className: danger ? "btn btn-danger" : "btn",
    type,
    onClick,
    disabled
  }, children);
}

function Message({ children, error = false }) {
  return children ? h("div", { className: error ? "message error" : "message" }, children) : null;
}

function Field({ label, error, hint, children }) {
  return h("label", { className: "field" },
    h("span", null, label),
    children,
    hint && h("small", null, hint),
    error && h("small", { className: "field-error" }, error)
  );
}

function ApplicantFields({ number, form, setForm, errors, required = true }) {
  const ageField = `applicant${number}Age`;
  const historyField = `applicant${number}History`;

  return h("div", { className: "applicant-box" },
    h("h3", null, `Applicant ${number}`),
    h(Field, { label: "Date of birth", error: errors[ageField], hint: "DD/MM/YYYY" },
      h("input", {
        value: form[ageField] || "",
        inputMode: "numeric",
        placeholder: "DD/MM/YYYY",
        required,
        onChange: (e) => setForm((old) => ({ ...old, [ageField]: formatDob(e.target.value) }))
      })
    ),
    h(Field, { label: "Hospital cover history", error: errors[historyField] },
      h("select", {
        value: form[historyField] || "",
        required,
        onChange: (e) => setForm((old) => ({ ...old, [historyField]: e.target.value }))
      },
        h("option", { value: "" }, "Select..."),
        HISTORIES.map((item) => h("option", { key: item, value: item }, item))
      )
    )
  );
}

function QuoteForm({ quote, onSave, onCancel, saving }) {
  const [form, setForm] = useState(quote ? formFromQuote(quote) : emptyForm());
  const [errors, setErrors] = useState({});
  const preview = useMemo(() => calculatePreview(form), [form]);
  const needsSecond = form.coverType !== "Single";
  const needsFamily = form.coverType === "Family";
  const yearly = form.paymentFrequency === "Yearly";

  function update(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.customerName.trim()) next.customerName = "Customer name is required.";
    if (!validAdultDob(form.applicant1Age)) next.applicant1Age = "Enter an adult date of birth in DD/MM/YYYY format.";
    if (!form.applicant1History) next.applicant1History = "Select a history option.";

    if (needsSecond) {
      if (!validAdultDob(form.applicant2Age)) next.applicant2Age = "Enter an adult date of birth in DD/MM/YYYY format.";
      if (!form.applicant2History) next.applicant2History = "Select a history option.";
    }

    if (needsFamily && form.applicant3Age && !validAdultDob(form.applicant3Age)) next.applicant3Age = "Enter a valid adult date of birth.";
    if (needsFamily && form.applicant4Age && !validAdultDob(form.applicant4Age)) next.applicant4Age = "Enter a valid adult date of birth.";

    const discount = Number(form.annualDiscountPct);
    if (Number.isNaN(discount) || discount < 0 || discount > 10) next.annualDiscountPct = "Discount must be between 0 and 10.";
    return next;
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSave({
      ...form,
      customerName: form.customerName.trim(),
      notes: form.notes.trim()
    });
  }

  return h("form", { className: "form-page", onSubmit: submit },
    h("div", { className: "form-layout" },
      h("div", null,
        h("section", { className: "card" },
          h("h2", null, "Customer details"),
          h(Field, { label: "Customer name", error: errors.customerName },
            h("input", {
              autoFocus: !quote,
              value: form.customerName,
              placeholder: "Enter customer name",
              onChange: (e) => update("customerName", e.target.value)
            })
          ),
          h(Field, { label: "Cover type" },
            h("div", { className: "radio-row" },
              COVER_TYPES.map((type) => h("label", { className: "radio-option", key: type },
                h("input", {
                  type: "radio",
                  name: "coverType",
                  checked: form.coverType === type,
                  onChange: () => update("coverType", type)
                }),
                type
              ))
            )
          )
        ),

        h("section", { className: "card" },
          h("h2", null, "Applicants"),
          h("div", { className: "applicant-grid" },
            h(ApplicantFields, { number: 1, form, setForm, errors }),
            needsSecond && h(ApplicantFields, { number: 2, form, setForm, errors }),
            needsFamily && h(Fragment, null,
              h(ApplicantFields, { number: 3, form, setForm, errors, required: false }),
              h(ApplicantFields, { number: 4, form, setForm, errors, required: false })
            )
          )
        ),

        h("section", { className: "card" },
          h("h2", null, "Cover and payment"),
          h("div", { className: "two-col" },
            h(Field, { label: "Hospital cover" },
              h("select", { value: form.hospitalCoverLevel, onChange: (e) => update("hospitalCoverLevel", e.target.value) },
                HOSPITAL_LEVELS.map((level) => h("option", { key: level }, level))
              )
            ),
            h(Field, { label: "Extras cover" },
              h("select", { value: form.extraCoverLevel, onChange: (e) => update("extraCoverLevel", e.target.value) },
                EXTRA_LEVELS.map((level) => h("option", { key: level }, level))
              )
            ),
            h(Field, { label: "Payment frequency" },
              h("select", { value: form.paymentFrequency, onChange: (e) => update("paymentFrequency", e.target.value) },
                h("option", null, "Monthly"),
                h("option", null, "Yearly")
              )
            ),
            h(Field, { label: "Annual discount (%)", error: errors.annualDiscountPct, hint: "0 to 10" },
              h("input", {
                type: "number",
                min: "0",
                max: "10",
                step: "0.1",
                value: form.annualDiscountPct,
                disabled: !yearly,
                onChange: (e) => update("annualDiscountPct", e.target.value)
              })
            )
          )
        ),

        h("section", { className: "card" },
          h("h2", null, "Notes"),
          h(Field, { label: "Internal notes" },
            h("textarea", {
              rows: 4,
              value: form.notes,
              placeholder: "Optional notes",
              onChange: (e) => update("notes", e.target.value)
            })
          )
        ),

        h("div", { className: "form-buttons" },
          h(Button, { onClick: onCancel }, "Cancel"),
          h(Button, { type: "submit", disabled: saving }, saving ? "Saving..." : quote ? "Update quote" : "Save quote")
        )
      ),

      h("aside", { className: "card price-box" },
        h("h2", null, "Premium estimate"),
        h("div", { className: "main-price" }, money(yearly ? preview.yearlyAfterDiscount : preview.monthlyPremium)),
        h("p", { className: "muted" }, yearly ? "per year" : "per month"),
        h("div", { className: "price-line" }, h("span", null, "Hospital"), h("strong", null, money(preview.hospitalTotal))),
        h("div", { className: "price-line" }, h("span", null, "Extras"), h("strong", null, money(preview.extrasTotal))),
        h("div", { className: "price-line" }, h("span", null, "Family fee"), h("strong", null, money(preview.familyFee))),
        yearly && Number(form.annualDiscountPct) > 0 && h("p", { className: "saving" }, `Discount: ${money(preview.yearlyBeforeDiscount - preview.yearlyAfterDiscount)} saved`),
        preview.unknownHistoryApplicants.length > 0 && h("p", { className: "notice" }, `Applicant ${preview.unknownHistoryApplicants.join(", ")} has unknown hospital cover history, so LHC loading is not applied.`)
      )
    )
  );
}

function QuoteList({ quotes, loading, error, onCreate, onView, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredQuotes = quotes.filter((quote) => {
    const text = `${quote.customerName} ${quote.coverType} ${quote.hospitalCoverLevel} ${quote.extraCoverLevel}`.toLowerCase();
    return text.includes(search.trim().toLowerCase()) && (filter === "All" || quote.coverType === filter);
  });

  return h("main", { className: "container" },
    h("div", { className: "page-title-row" },
      h("div", null,
        h("h1", null, "HealthCover Quotes"),
        h("p", { className: "muted" }, "Create and manage health insurance quotes.")
      ),
      h(Button, { onClick: onCreate }, "+ New Quote")
    ),

    h("section", { className: "card" },
      h("div", { className: "list-top" },
        h("input", {
          className: "search",
          placeholder: "Search quotes...",
          value: search,
          onChange: (e) => setSearch(e.target.value)
        }),
        h("select", { value: filter, onChange: (e) => setFilter(e.target.value) },
          h("option", null, "All"),
          COVER_TYPES.map((type) => h("option", { key: type }, type))
        )
      ),

      loading && h(Message, null, "Loading quotes..."),
      error && h(Message, { error: true }, error),
      !loading && !error && filteredQuotes.length === 0 && h("div", { className: "empty" },
        h("h3", null, "No quotes found"),
        h("p", { className: "muted" }, "Create a quote or change the search/filter.")
      ),
      !loading && !error && filteredQuotes.length > 0 && h("div", { className: "table-wrap" },
        h("table", null,
          h("thead", null,
            h("tr", null,
              ["Customer", "Cover", "Hospital", "Extras", "Payment", "Updated", ""].map((heading, index) => h("th", { key: index }, heading))
            )
          ),
          h("tbody", null,
            filteredQuotes.map((quote) => h("tr", { key: quote.id },
              h("td", null, quote.customerName),
              h("td", null, quote.coverType),
              h("td", null, quote.hospitalCoverLevel),
              h("td", null, quote.extraCoverLevel),
              h("td", null, quote.paymentFrequency),
              h("td", null, dateText(quote.updatedAt)),
              h("td", { className: "actions" },
                h("button", { onClick: () => onView(quote.id) }, "View"),
                h("button", { onClick: () => onEdit(quote.id) }, "Edit"),
                h("button", { className: "danger-link", onClick: () => onDelete(quote.id) }, "Delete")
              )
            ))
          )
        )
      )
    )
  );
}

function QuoteDetail({ quote, onBack, onEdit, onDelete }) {
  const premium = calculatePreview(formFromQuote(quote));
  const applicantCount = quote.coverType === "Single" ? 1 : quote.coverType === "Family" ? 4 : 2;

  const applicantCards = [];
  for (let index = 1; index <= applicantCount; index += 1) {
    const dob = quote[`applicant${index}Age`];
    if (!dob && index > 2) continue;
    applicantCards.push(h("div", { className: "saved-applicant", key: index },
      h("strong", null, `Applicant ${index}`),
      h("span", null, `DOB: ${dob || "-"}`),
      h("span", null, `History: ${quote[`applicant${index}History`] || "-"}`)
    ));
  }

  return h("main", { className: "container" },
    h("div", { className: "page-title-row" },
      h("div", null,
        h("button", { className: "link-button", onClick: onBack }, "← Back to quotes"),
        h("h1", null, quote.customerName),
        h("p", { className: "muted" }, `Quote #${quote.id}`)
      ),
      h("div", { className: "form-buttons" },
        h(Button, { onClick: () => onEdit(quote.id) }, "Edit"),
        h(Button, { danger: true, onClick: () => onDelete(quote.id) }, "Delete")
      )
    ),

    h("div", { className: "detail-grid" },
      h("section", { className: "card" },
        h("h2", null, "Quote details"),
        h("div", { className: "detail-list" },
          h("div", null, h("span", null, "Cover type"), h("strong", null, quote.coverType)),
          h("div", null, h("span", null, "Hospital cover"), h("strong", null, quote.hospitalCoverLevel)),
          h("div", null, h("span", null, "Extras cover"), h("strong", null, quote.extraCoverLevel)),
          h("div", null, h("span", null, "Payment"), h("strong", null, quote.paymentFrequency)),
          h("div", null, h("span", null, "Annual discount"), h("strong", null, `${Number(quote.annualDiscountPct || 0)}%`)),
          h("div", null, h("span", null, "Created"), h("strong", null, dateText(quote.createdAt))),
          h("div", null, h("span", null, "Updated"), h("strong", null, dateText(quote.updatedAt)))
        )
      ),

      h("section", { className: "card price-box" },
        h("h2", null, "Premium"),
        h("div", { className: "main-price" }, money(quote.paymentFrequency === "Yearly" ? premium.yearlyAfterDiscount : premium.monthlyPremium)),
        h("p", { className: "muted" }, quote.paymentFrequency === "Yearly" ? "per year" : "per month"),
        h("div", { className: "price-line" }, h("span", null, "Hospital"), h("strong", null, money(premium.hospitalTotal))),
        h("div", { className: "price-line" }, h("span", null, "Extras"), h("strong", null, money(premium.extrasTotal))),
        h("div", { className: "price-line" }, h("span", null, "Family fee"), h("strong", null, money(premium.familyFee)))
      ),

      h("section", { className: "card wide-card" },
        h("h2", null, "Applicants"),
        h("div", { className: "applicant-list" }, applicantCards)
      ),

      h("section", { className: "card wide-card" },
        h("h2", null, "Notes"),
        h("p", null, quote.notes || "No notes.")
      )
    )
  );
}

function App() {
  const [page, setPage] = useState("list");
  const [quotes, setQuotes] = useState([]);
  const [editingQuote, setEditingQuote] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadQuotes() {
    setLoading(true);
    try {
      setQuotes(await request("/quotes"));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  async function saveQuote(payload) {
    setSaving(true);
    try {
      const path = editingQuote ? `/quotes/${editingQuote.id}` : "/quotes";
      const method = editingQuote ? "PUT" : "POST";
      await request(path, { method, body: JSON.stringify(payload) });
      setEditingQuote(null);
      setPage("list");
      await loadQuotes();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function editQuote(id) {
    try {
      setEditingQuote(await request(`/quotes/${id}`));
      setMessage("");
      setPage("edit");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function viewQuote(id) {
    try {
      setSelectedQuote(await request(`/quotes/${id}`));
      setMessage("");
      setPage("detail");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteQuote(id) {
    if (!window.confirm("Delete this quote?")) return;
    try {
      await request(`/quotes/${id}`, { method: "DELETE" });
      setPage("list");
      await loadQuotes();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function goList() {
    setPage("list");
    setEditingQuote(null);
    setSelectedQuote(null);
    setMessage("");
  }

  return h(Fragment, null,
    h("header", { className: "header" },
      h("div", { className: "header-inner" },
        h("button", { className: "brand-button", onClick: goList }, "HealthCover"),
        h("span", { className: "header-subtitle" }, "Quote System")
      )
    ),

    message && page !== "list" && h("div", { className: "container" }, h(Message, { error: true }, message)),

    page === "list" && h(QuoteList, {
      quotes,
      loading,
      error: message,
      onCreate: () => { setMessage(""); setEditingQuote(null); setPage("create"); },
      onView: viewQuote,
      onEdit: editQuote,
      onDelete: deleteQuote
    }),

    page === "create" && h("main", { className: "container" },
      h("div", { className: "page-title-row" },
        h("div", null,
          h("button", { className: "link-button", onClick: goList }, "← Back to quotes"),
          h("h1", null, "New Quote"),
          h("p", { className: "muted" }, "Enter the customer details below.")
        )
      ),
      h(QuoteForm, { onSave: saveQuote, onCancel: goList, saving })
    ),

    page === "edit" && h("main", { className: "container" },
      h("div", { className: "page-title-row" },
        h("div", null,
          h("button", { className: "link-button", onClick: goList }, "← Back to quotes"),
          h("h1", null, "Edit Quote"),
          h("p", { className: "muted" }, "Update the saved quote and save your changes.")
        )
      ),
      editingQuote && h(QuoteForm, { quote: editingQuote, onSave: saveQuote, onCancel: goList, saving })
    ),

    page === "detail" && selectedQuote && h(QuoteDetail, {
      quote: selectedQuote,
      onBack: goList,
      onEdit: editQuote,
      onDelete: deleteQuote
    })
  );
}

createRoot(document.getElementById("root")).render(h(App));
