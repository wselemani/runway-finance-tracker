import {
    state, addExpense, updateExpense, deleteExpense, replaceExpenses,
    setBudget, setRates, setCurrency, computeStats
} from "./state.js";
import { checkDescription, checkAmount, checkDate, checkCategory, tidyDescription } from "./validators.js";
import { compileRegex, filterExpenses, sortExpenses } from "./search.js";
import { downloadExpenses, parseImport } from "./storage.js";
import { renderDashboard, renderCurrency, renderRecords, setRecordsMessage } from "./ui.js";

const $ = function (id) { return document.getElementById(id); };

const searchInput = $("expense-search");
const sortSelect = $("sort-expenses");
const caseToggle = $("case-toggle");

/* ---------- Showing data ---------- */

function showRecords(options = {}) {
    const term = searchInput.value.trim();
    const flags = caseToggle.checked ? "i" : "";
    const searchRe = compileRegex(term, flags);

    if (term && searchRe === null) {
        setRecordsMessage("Invalid regular expression. Please check your search.");
        renderRecords([], null, handlers);
        return;
    }

    const highlightRe = compileRegex(term, flags + "g");
    const list = sortExpenses(filterExpenses(state.expenses, searchRe), sortSelect.value);

    if (list.length === 0) {
        setRecordsMessage(term ? "No matching expenses found." : "Your transactions will appear here.");
    } else {
        setRecordsMessage("");
    }

    renderRecords(list, highlightRe, handlers, options.focusEditId);
}

function refresh(options = {}) {
    renderDashboard(computeStats());
    showRecords(options);
}

/* ---------- Edit and delete ---------- */

const handlers = {
    onEdit: function (id) {
        state.editingId = id;
        showRecords();
    },

    onCancel: function (id) {
        state.editingId = null;
        showRecords({ focusEditId: id });
    },

    // Returns an error message, or "" when the change was saved.
    onSave: function (id, values) {
        const error = checkDescription(values.description) ||
            checkAmount(values.amount) ||
            checkDate(values.date) ||
            checkCategory(values.category);

        if (error) return error;

        updateExpense(id, {
            description: tidyDescription(values.description),
            amount: Number(values.amount),
            category: values.category,
            date: values.date,
            needWant: values.needWant
        });

        state.editingId = null;
        refresh({ focusEditId: id });
        return "";
    },

    onDelete: function (id) {
        if (!confirm("Are you sure you want to delete this expense?")) return;

        deleteExpense(id);
        refresh();
        $("records-title").focus();
    }
};

/* ---------- Add expense form with live validation ---------- */

const expenseForm = $("expense-entry-form");

const fields = [
    { input: "expense-description", error: "description-error", check: checkDescription },
    { input: "expense-amount", error: "amount-error", check: checkAmount },
    { input: "expense-category", error: "category-error", check: checkCategory },
    { input: "expense-date", error: "date-error", check: checkDate }
];

fields.forEach(function (field) {
    const element = $(field.input);
    const validate = function () {
        $(field.error).textContent = field.check(element.value);
    };

    element.addEventListener("blur", validate);
    element.addEventListener("change", validate);
    // While typing, only re-check a field that is already showing an error.
    element.addEventListener("input", function () {
        if ($(field.error).textContent) validate();
    });
});

// Default the date to today (reset() brings it back).
const today = new Date();
const todayKey = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");
$("expense-date").defaultValue = todayKey;
$("expense-date").value = todayKey;

expenseForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const description = $("expense-description").value;
    const amount = $("expense-amount").value;
    const category = $("expense-category").value;
    const date = $("expense-date").value;
    const needWant = document.querySelector('input[name="needWant"]:checked');

    const errors = {
        "description-error": checkDescription(description),
        "amount-error": checkAmount(amount),
        "category-error": checkCategory(category),
        "date-error": checkDate(date),
        "needwant-error": needWant ? "" : "Please choose Need or Want."
    };

    Object.keys(errors).forEach(function (id) {
        $(id).textContent = errors[id];
    });

    if (Object.values(errors).some(Boolean)) {
        const firstBad = fields.find(function (field) { return errors[field.error]; });
        const target = firstBad ? $(firstBad.input) : document.querySelector('input[name="needWant"]');
        target.focus();
        $("form-status").textContent = "Please fix the errors and try again.";
        return;
    }

    addExpense({
        description: tidyDescription(description),
        amount: Number(amount),
        category: category,
        date: date,
        needWant: needWant.value
    });

    refresh();
    expenseForm.reset();
    $("form-status").textContent = "Expense saved.";
    $("expense-description").focus();
});

/* ---------- Search and sort ---------- */

searchInput.addEventListener("input", function () { showRecords(); });
sortSelect.addEventListener("change", function () { showRecords(); });
caseToggle.addEventListener("change", function () { showRecords(); });

/* ---------- Budget ---------- */

$("budget-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const amount = Number($("budget-amount").value);
    const status = $("budget-status");

    if (!Number.isFinite(amount) || amount <= 0) {
        status.textContent = "Please enter a budget greater than zero.";
        return;
    }

    setBudget(amount);
    refresh();
    status.textContent = "Monthly budget saved.";
});

/* ---------- Settings: currency, rates, export, import ---------- */

$("currency-select").addEventListener("change", function () {
    setCurrency($("currency-select").value);
    renderCurrency();
    refresh();
});

$("save-rates").addEventListener("click", function () {
    const usd = Number($("rate-usd").value);
    const mwk = Number($("rate-mwk").value);
    const status = $("rates-status");

    if (!(usd > 0) || !(mwk > 0)) {
        status.textContent = "Rates must be numbers greater than zero.";
        return;
    }

    setRates(usd, mwk);
    refresh();
    status.textContent = "Rates saved.";
});

$("export-expenses").addEventListener("click", function () {
    downloadExpenses(state.expenses);
});

$("import-expenses").addEventListener("click", function () {
    const file = $("import-file").files[0];
    const status = $("import-status");

    if (!file) {
        status.textContent = "Please select a JSON file first.";
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const imported = parseImport(reader.result);

            if (!confirm("Importing replaces your current " + state.expenses.length +
                " expenses with " + imported.length + " from the file. Continue?")) {
                status.textContent = "Import cancelled.";
                return;
            }

            replaceExpenses(imported);
            state.editingId = null;
            refresh();
            status.textContent = "Imported " + imported.length + " expenses successfully.";
        } catch (error) {
            status.textContent = "Import failed: " + error.message;
        }
    };

    reader.onerror = function () {
        status.textContent = "Import failed: the file could not be read.";
    };

    reader.readAsText(file);
});

/* ---------- Start ---------- */

renderCurrency();
refresh();
