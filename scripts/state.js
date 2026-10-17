import * as storage from "./storage.js";

export const CURRENCY_SYMBOLS = { RWF: "RWF", USD: "$", MWK: "MK" };

// All app data lives here. Other modules read it and call the functions below to change it.
export const state = {
    expenses: storage.loadExpenses(),
    monthlyBudget: storage.loadBudget(),
    rates: storage.loadRates(),
    currency: storage.loadCurrency(),
    editingId: null
};

// Amounts are always stored in RWF and converted only for display.
export function formatCurrency(amount) {
    const converted = Number(amount) * state.rates[state.currency];
    return CURRENCY_SYMBOLS[state.currency] + " " +
        converted.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}

export function addExpense(data) {
    const now = new Date().toISOString();
    state.expenses.push({ id: "txn_" + Date.now(), ...data, createdAt: now, updatedAt: now });
    storage.saveExpenses(state.expenses);
}

export function updateExpense(id, changes) {
    const record = state.expenses.find(function (item) { return item.id === id; });
    if (!record) return;
    Object.assign(record, changes, { updatedAt: new Date().toISOString() });
    storage.saveExpenses(state.expenses);
}

export function deleteExpense(id) {
    state.expenses = state.expenses.filter(function (item) { return item.id !== id; });
    storage.saveExpenses(state.expenses);
}

export function replaceExpenses(list) {
    state.expenses = list;
    storage.saveExpenses(state.expenses);
}

export function setBudget(amount) {
    state.monthlyBudget = amount;
    storage.saveBudget(amount);
}

export function setRates(usd, mwk) {
    state.rates.USD = usd;
    state.rates.MWK = mwk;
    storage.saveRates(state.rates);
}

export function setCurrency(code) {
    state.currency = code;
    storage.saveCurrency(code);
}

function dateKey(d) {
    return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
}

// Work out every number the dashboard shows.
export function computeStats(now = new Date()) {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let total = 0;
    let weekly = 0;
    let monthly = 0;
    let lastSeven = 0;
    const categoryTotals = {};

    state.expenses.forEach(function (expense) {
        const amount = Number(expense.amount);
        const date = new Date(expense.date + "T00:00:00");

        total += amount;
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + amount;

        if (date >= startOfWeek && date <= now) weekly += amount;
        if (date >= sevenDaysAgo && date <= now) lastSeven += amount;
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
            monthly += amount;
        }
    });

    let topCategory = "None yet";
    let topAmount = 0;
    Object.keys(categoryTotals).forEach(function (name) {
        if (categoryTotals[name] > topAmount) {
            topAmount = categoryTotals[name];
            topCategory = name;
        }
    });

    const budget = state.monthlyBudget;
    const remaining = budget - monthly;
    const dailyPace = lastSeven / 7;

    let runway = "Set a budget";
    if (budget > 0) {
        if (remaining <= 0) {
            runway = "Budget reached";
        } else if (dailyPace === 0) {
            runway = "Not enough spending data";
        } else {
            runway = Math.floor(remaining / dailyPace) + " days";
        }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        trend.push({ key: dateKey(d), label: dayNames[d.getDay()], total: 0 });
    }
    state.expenses.forEach(function (expense) {
        const day = trend.find(function (item) { return item.key === expense.date; });
        if (day) day.total += Number(expense.amount);
    });

    return {
        total, weekly, monthly, topCategory, budget, remaining, runway, trend,
        count: state.expenses.length
    };
}
