import { isValidExpense } from "./validators.js";

const KEYS = {
    records: "runway:records",
    budget: "runway:monthly-budget",
    rates: "runway:rates",
    currency: "runway:currency"
};

const DEFAULT_RATES = { RWF: 1, USD: 0.0007, MWK: 1.1 };

// Read JSON safely: corrupted or missing data gives the fallback instead of a crash.
function loadJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

export function loadExpenses() {
    const saved = loadJSON(KEYS.records, []);
    return Array.isArray(saved) ? saved.filter(isValidExpense) : [];
}

export function saveExpenses(expenses) {
    localStorage.setItem(KEYS.records, JSON.stringify(expenses));
}

export function loadBudget() {
    const budget = Number(localStorage.getItem(KEYS.budget));
    return Number.isFinite(budget) && budget > 0 ? budget : 0;
}

export function saveBudget(amount) {
    localStorage.setItem(KEYS.budget, String(amount));
}

export function loadRates() {
    const saved = loadJSON(KEYS.rates, {});
    const rates = { ...DEFAULT_RATES };
    if (Number(saved.USD) > 0) rates.USD = Number(saved.USD);
    if (Number(saved.MWK) > 0) rates.MWK = Number(saved.MWK);
    return rates;
}

export function saveRates(rates) {
    localStorage.setItem(KEYS.rates, JSON.stringify({ USD: rates.USD, MWK: rates.MWK }));
}

export function loadCurrency() {
    const saved = localStorage.getItem(KEYS.currency);
    return ["RWF", "USD", "MWK"].includes(saved) ? saved : "RWF";
}

export function saveCurrency(code) {
    localStorage.setItem(KEYS.currency, code);
}

// Download the records as a JSON file.
export function downloadExpenses(expenses) {
    const file = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "runway-expenses.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}

// Check imported JSON text and return clean records, or throw an Error with a clear message.
export function parseImport(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("The file is not valid JSON.");
    }

    if (!Array.isArray(data)) {
        throw new Error("The file must contain a list of expenses.");
    }

    const badIndex = data.findIndex(function (item) { return !isValidExpense(item); });
    if (badIndex !== -1) {
        throw new Error("Record " + (badIndex + 1) + " is invalid: " + JSON.stringify(data[badIndex]));
    }

    const ids = data.map(function (item) { return item.id; });
    if (new Set(ids).size !== ids.length) {
        throw new Error("Two records share the same id.");
    }

    const now = new Date().toISOString();
    return data.map(function (item) {
        return {
            ...item,
            amount: Number(item.amount),
            createdAt: item.createdAt || now,
            updatedAt: item.updatedAt || now
        };
    });
}
