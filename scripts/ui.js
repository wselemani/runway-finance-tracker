import { state, formatCurrency } from "./state.js";
import { CATEGORIES } from "./validators.js";

const $ = function (id) { return document.getElementById(id); };

// Show the chosen currency and the saved exchange rates.
export function renderCurrency() {
    const sidebarCurrency = document.querySelector(".sidebar-currency strong");
    if (sidebarCurrency) sidebarCurrency.textContent = state.currency;

    $("currency-select").value = state.currency;
    $("currency-status").textContent = "Current currency: " + state.currency;
    $("rate-usd").value = state.rates.USD;
    $("rate-mwk").value = state.rates.MWK;
}

function renderTrend(trend) {
    const chart = $("trend-chart");
    chart.textContent = "";

    const biggest = Math.max(...trend.map(function (day) { return day.total; }), 1);

    trend.forEach(function (day) {
        const column = document.createElement("div");
        column.className = "trend-col";
        column.setAttribute("role", "img");
        column.setAttribute("aria-label", day.label + ": " + formatCurrency(day.total));

        const value = document.createElement("span");
        value.textContent = day.total > 0 ? formatCurrency(day.total) : "";

        const bar = document.createElement("div");
        bar.className = "trend-bar";
        bar.style.height = Math.round((day.total / biggest) * 100) + "px";

        const label = document.createElement("span");
        label.textContent = day.label;

        column.append(value, bar, label);
        chart.append(column);
    });
}

export function renderDashboard(stats) {
    $("total-spent").textContent = formatCurrency(stats.total);
    $("weekly-spent").textContent = formatCurrency(stats.weekly);
    $("monthly-spent").textContent = formatCurrency(stats.monthly);
    $("record-count").textContent = stats.count;
    $("top-category").textContent = stats.topCategory;
    $("runway-days").textContent = stats.runway;

    const hasBudget = stats.budget > 0;
    $("monthly-budget").textContent = hasBudget ? formatCurrency(stats.budget) : "Not set";
    $("budget-remaining").textContent = hasBudget ? formatCurrency(stats.remaining) : "Not set";

    // Polite message while under budget, assertive alert when over.
    const politeBox = $("budget-message-polite");
    const alertBox = $("budget-message-alert");
    politeBox.textContent = "";
    alertBox.textContent = "";

    if (hasBudget) {
        if (stats.remaining < 0) {
            alertBox.textContent = "Over budget by " + formatCurrency(-stats.remaining) + ".";
        } else {
            politeBox.textContent = "You have " + formatCurrency(stats.remaining) + " left this month.";
        }
    }

    renderTrend(stats.trend);
}

export function setRecordsMessage(text) {
    $("records-message").textContent = text;
}

// Put matches inside <mark> using DOM nodes (no innerHTML, so it is safe).
function addHighlightedText(cell, text, pattern) {
    cell.textContent = "";

    if (!pattern) {
        cell.textContent = text;
        return;
    }

    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
        if (match[0] === "") continue;

        cell.append(text.slice(lastIndex, match.index));

        const mark = document.createElement("mark");
        mark.textContent = match[0];
        cell.append(mark);

        lastIndex = match.index + match[0].length;
    }

    cell.append(text.slice(lastIndex));
}

function makeButton(text, label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    if (label) button.setAttribute("aria-label", label);
    button.addEventListener("click", onClick);
    return button;
}

function makeSelect(options, selected, label) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", label);
    options.forEach(function (name) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        option.selected = name === selected;
        select.append(option);
    });
    return select;
}

function buildReadRow(row, expense, highlightRe, handlers) {
    const values = [
        expense.date,
        expense.description,
        expense.category,
        formatCurrency(expense.amount)
    ];

    values.forEach(function (value) {
        addHighlightedText(row.insertCell(), value, highlightRe);
    });

    row.insertCell().textContent = expense.needWant;

    const actions = row.insertCell();

    const editButton = makeButton("Edit", "Edit " + expense.description, function () {
        handlers.onEdit(expense.id);
    });
    editButton.dataset.edit = expense.id;

    const deleteButton = makeButton("Delete", "Delete " + expense.description, function () {
        handlers.onDelete(expense.id);
    });

    actions.append(editButton, deleteButton);
}

function buildEditRow(row, expense, handlers) {
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = expense.date;
    dateInput.setAttribute("aria-label", "Edit date");
    row.insertCell().append(dateInput);

    const descInput = document.createElement("input");
    descInput.type = "text";
    descInput.value = expense.description;
    descInput.setAttribute("aria-label", "Edit description");
    row.insertCell().append(descInput);

    const categorySelect = makeSelect(CATEGORIES, expense.category, "Edit category");
    row.insertCell().append(categorySelect);

    const amountInput = document.createElement("input");
    amountInput.type = "text";
    amountInput.value = expense.amount;
    amountInput.setAttribute("aria-label", "Edit amount in RWF");
    row.insertCell().append(amountInput);

    const needSelect = makeSelect(["need", "want"], expense.needWant, "Edit need or want");
    row.insertCell().append(needSelect);

    const errorLine = document.createElement("small");
    errorLine.className = "error-message";
    errorLine.setAttribute("aria-live", "polite");

    const saveButton = makeButton("Save", "Save changes", function () {
        errorLine.textContent = handlers.onSave(expense.id, {
            description: descInput.value,
            amount: amountInput.value,
            category: categorySelect.value,
            date: dateInput.value,
            needWant: needSelect.value
        });
    });

    const cancelButton = makeButton("Cancel", "Cancel editing", function () {
        handlers.onCancel(expense.id);
    });

    row.insertCell().append(saveButton, cancelButton, errorLine);

    setTimeout(function () { descInput.focus(); }, 0);
}

// Draw the table for the list it is given. Searching and sorting happen before this.
export function renderRecords(list, highlightRe, handlers, focusEditId = null) {
    const section = $("records");
    const oldTable = section.querySelector("table");
    if (oldTable) oldTable.remove();

    if (list.length === 0) return;

    const table = document.createElement("table");
    table.setAttribute("aria-label", "Expense records");

    const headerRow = table.createTHead().insertRow();
    ["Date", "Description", "Category", "Amount", "Need/Want", "Actions"].forEach(function (heading) {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = heading;
        headerRow.append(th);
    });

    const body = table.createTBody();
    list.forEach(function (expense) {
        const row = body.insertRow();
        if (expense.id === state.editingId) {
            buildEditRow(row, expense, handlers);
        } else {
            buildReadRow(row, expense, highlightRe, handlers);
        }
    });

    section.append(table);

    if (focusEditId) {
        const button = Array.from(table.querySelectorAll("[data-edit]")).find(function (item) {
            return item.dataset.edit === focusEditId;
        });
        if (button) button.focus();
    }
}

