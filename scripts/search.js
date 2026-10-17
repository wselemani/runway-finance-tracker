// Safe regex compiler: returns null for empty or invalid patterns instead of crashing.
export function compileRegex(input, flags = "i") {
    try {
        return input ? new RegExp(input, flags) : null;
    } catch {
        return null;
    }
}

// Keep expenses whose description, category, amount or date matches the pattern.
// Use a non-global regex here so test() has no lastIndex surprises.
export function filterExpenses(list, re) {
    if (!re) return [...list];
    return list.filter(function (expense) {
        return re.test(expense.description) ||
            re.test(expense.category) ||
            re.test(String(expense.amount)) ||
            re.test(expense.date);
    });
}

export function sortExpenses(list, option) {
    const byDate = function (a, b) {
        return a.date.localeCompare(b.date) ||
            (a.createdAt || "").localeCompare(b.createdAt || "");
    };

    const sorters = {
        newest: function (a, b) { return byDate(b, a); },
        oldest: byDate,
        description: function (a, b) {
            return a.description.localeCompare(b.description, undefined, { sensitivity: "base" });
        },
        "amount-high": function (a, b) { return Number(b.amount) - Number(a.amount); },
        "amount-low": function (a, b) { return Number(a.amount) - Number(b.amount); }
    };

    return [...list].sort(sorters[option] || sorters.newest);
}
