export function checkDescription(text) {
    if (!/^\S(?:.*\S)?$/.test(text)) {
        return "No spaces at the start or end, and it cannot be empty.";
    }
    if (/\b(\w+)\s+\1\b/i.test(text)) {
        return "You repeated a word. Please check.";
    }
    return "";
}

export function checkDate(text) {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(text)) {
        return "Use the format YYYY-MM-DD.";
    }
    return "";

}

export function checkCategory(text) {
    if (!/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(text)) {
        return "Choose a category (letters, spaces and hyphens-only).";

    }
    return "";

}

export function checkAmount(text){
    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(text)) {
        return "Type a number like 12 or 12.50.";
    }
    if (Number(text) <= 0) {
        return "Amount must be more than zero.";
    }
    return "";

}