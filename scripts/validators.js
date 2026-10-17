export const CATEGORIES = ["Food", "Books", "Transport", "Entertainment", "Fees", "Other"];

export function checkDescription(text) {
    if (!/^\S(?:.*\S)?$/.test(text)) {
        return "No spaces at the start or end, and it cannot be empty.";
    }
    if (/\b(\w+)\s+\1\b/i.test(text)) {
        return "You repeated a word. Please check.";
    }
    return "";
}

// Collapse double spaces inside a description before saving.
export function tidyDescription(text) {
    return text.replace(/\s{2,}/g, " ");
}

export function checkDate(text) {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(text)) {
        return "Use the format YYYY-MM-DD.";
    }
    const [year, month, day] = text.split("-").map(Number);
    const real = new Date(year, month - 1, day);
    if (real.getFullYear() !== year || real.getMonth() !== month - 1 || real.getDate() !== day) {
        return "That date does not exist.";
    }
    return "";
}

export function checkCategory(text) {
    if (!/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(text)) {
        return "Choose a category (letters, spaces and hyphens only).";
    }
    return "";
}

export function checkAmount(text) {
    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(text)) {
        return "Type a number like 12 or 12.50.";
    }
    if (Number(text) <= 0) {
        return "Amount must be more than zero.";
    }
    return "";
}

// One place that decides whether a whole record is valid (used by import and by loading).
export function isValidExpense(expense) {
    return Boolean(expense) &&
        typeof expense.id === "string" && expense.id.length > 0 &&
        typeof expense.description === "string" &&
        expense.description.trim().length >= 1 &&
        Number.isFinite(Number(expense.amount)) && Number(expense.amount) > 0 &&
        CATEGORIES.includes(expense.category) &&
        typeof expense.date === "string" && checkDate(expense.date) === "" &&
        ["need", "want"].includes(expense.needWant);
}
