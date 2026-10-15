import { checkDescription, checkAmount, checkDate, checkCategory } from "./validators.js";

console.log("Runway is ready!");

// Find the form and dashboard elements.
const expenseForm = document.getElementById("expense-entry-form");
const totalSpentElement = document.getElementById("total-spent");
const weeklySpentElement = document.getElementById("weekly-spent");

const monthlySpentElement = document.getElementById("monthly-spent");
const monthlyBudgetElement = document.getElementById("monthly-budget");
const budgetRemainingElement = document.getElementById("budget-remaining");
const runwayDaysElement = document.getElementById("runway-days");
const budgetForm = document.getElementById("budget-form");
const budgetInput = document.getElementById("budget-amount");

let monthlyBudget = Number(
    localStorage.getItem("runway:monthly-budget")
) || 0;

// Load saved expenses.
let expenses = JSON.parse(localStorage.getItem("runway:records")) || [];


/* Currency settings */
const currencySelect = document.getElementById("currency-select");
const currencyStatus = document.getElementById("currency-status");

const currencySymbols = {
    RWF: "RWF",
    USD: "$",
    MWK: "MK"
};

// Temporary example rates; we can adjust them later.
const exchangeRates = Object.assign(
    { RWF: 1, USD: 0.0007, MWK: 1.1 },
    JSON.parse(localStorage.getItem("runway:rates")) || {}
);

let selectedCurrency = localStorage.getItem("runway:currency") || "RWF";

function formatCurrency(amount) {
    const convertedAmount = Number(amount) * exchangeRates[selectedCurrency];

    return currencySymbols[selectedCurrency] + " " +
        convertedAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}


function updateCurrencySelection() {
    const sidebarCurrency = document.querySelector(
        ".sidebar-currency strong"
    );

    if (sidebarCurrency) {
        sidebarCurrency.textContent = selectedCurrency;
    }

    if (currencySelect) {
        currencySelect.value = selectedCurrency;
    }

    if (currencyStatus) {
        currencyStatus.textContent =
            `Current currency: ${selectedCurrency}`;
    }
}

if (currencySelect) {
    currencySelect.addEventListener("change", function () {
        selectedCurrency = currencySelect.value;

        localStorage.setItem("runway:currency", selectedCurrency);

        updateCurrencySelection();
        updateDashboard();
        displayExpenses();
    });
}

updateCurrencySelection();

const rateUsdInput = document.getElementById("rate-usd");
const rateMwkInput = document.getElementById("rate-mwk");
const ratesStatus = document.getElementById("rates-status");

rateUsdInput.value = exchangeRates.USD;
rateMwkInput.value = exchangeRates.MWK;

document.getElementById("save-rates").addEventListener("click", function () {
    const usd = Number(rateUsdInput.value);
    const mwk = Number(rateMwkInput.value);

    if (!(usd > 0) || !(mwk > 0)) {
        ratesStatus.textContent = "Rates must be numbers greater than zero.";
        return;
    }

    exchangeRates.USD = usd;
    exchangeRates.MWK = mwk;

    localStorage.setItem(
        "runway:rates",
        JSON.stringify({ USD: usd, MWK: mwk })
    );

    updateDashboard();
    displayExpenses();
    ratesStatus.textContent = "Rates saved.";
});

const searchInput = document.getElementById("expense-search");
const sortSelect = document.getElementById("sort-expenses");
const caseToggle = document.getElementById("case-toggle");

// Save expenses in the browser.
function saveExpenses() {
    localStorage.setItem("runway:records", JSON.stringify(expenses));
}


const exportButton = document.getElementById("export-expenses");

// Export saved expenses as a JSON file.
exportButton.addEventListener("click", function () {

    const data = JSON.stringify(expenses, null, 2);
    const file = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = url;
    link.download = "runway-expenses.json";
    link.click();

    URL.revokeObjectURL(url);
});


const importButton = document.getElementById("import-expenses");
const importFileInput = document.getElementById("import-file");
const importStatus = document.getElementById("import-status");

// Import expense records from a JSON file.
importButton.addEventListener("click", function () {
    const file = importFileInput.files[0];

    if (!file) {
        importStatus.textContent = "Please select a JSON file first.";
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        try {

            const importedExpenses = JSON.parse(reader.result);

            if (!Array.isArray(importedExpenses)) {
                throw new Error("The file must contain a list of expenses.");
            }

           
const validExpenses = importedExpenses.every(function (expense) {
    const validCategories = [
        "Food",
        "Books",
        "Transport",
        "Entertainment",
        "Fees",
        "Other"
    ];

    const validDate = typeof expense.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(expense.date) &&
        !Number.isNaN(Date.parse(expense.date));

    return expense &&
        typeof expense.id === "string" &&
        typeof expense.description === "string" &&
        expense.description.trim().length >= 1 &&
        Number.isFinite(Number(expense.amount)) &&
        Number(expense.amount) > 0 &&
        validCategories.includes(expense.category) &&
        validDate &&
        ["need", "want"].includes(expense.needWant);
});

            if (!validExpenses) {
    const invalidExpense = importedExpenses.find(function (expense) {
        return !expense ||
            typeof expense.id !== "string" ||
            typeof expense.description !== "string" ||
            expense.description.trim().length < 1 ||
            !Number.isFinite(Number(expense.amount)) ||
            Number(expense.amount) <= 0 ||
            !["Food", "Books", "Transport", "Entertainment", "Fees", "Other"].includes(expense.category) ||
            typeof expense.date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(expense.date) ||
            Number.isNaN(Date.parse(expense.date)) ||
            !["need", "want"].includes(expense.needWant);
    });

    throw new Error("Invalid record: " + JSON.stringify(invalidExpense));
}

            expenses = importedExpenses;
            saveExpenses();
            updateDashboard();
            displayExpenses();

            importStatus.textContent =
                "Expenses imported successfully!";
        } catch (error) {
            importStatus.textContent =
                "Import failed: " + error.message;
        }
    };

    reader.readAsText(file);
});

function updateTrend() {
    const chart = document.getElementById("trend-chart");
    chart.textContent = "";

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);

        const key = d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");

        days.push({ key: key, label: dayNames[d.getDay()], total: 0 });
    }

    expenses.forEach(function (expense) {
        const day = days.find(function (item) {
            return item.key === expense.date;
        });

        if (day) {
            day.total += Number(expense.amount);
        }
    });

    const biggest = Math.max(...days.map(function (item) {
        return item.total;
    }), 1);

    days.forEach(function (day) {
        const column = document.createElement("div");
        column.className = "trend-col";

        const value = document.createElement("span");
              value.textContent = day.total > 0 ? formatCurrency(day.total) : "";

        const bar = document.createElement("div");
        bar.className = "trend-bar";
        bar.style.height = Math.round((day.total / biggest) * 100) + "px";
        bar.title = day.label + ": " + formatCurrency(day.total);

        const label = document.createElement("span");
        label.textContent = day.label;

        column.append(value, bar, label);
        chart.append(column);
    });
}
function updateExtraStats() {
    updateTrend();
    document.getElementById("record-count").textContent = expenses.length;

    // Find the category with the most spending.
    const totals = {};
    expenses.forEach(function (expense) {
        totals[expense.category] =
            (totals[expense.category] || 0) + Number(expense.amount);
    });

    let topCategory = "None yet";
    let topAmount = 0;

    for (const name in totals) {
        if (totals[name] > topAmount) {
            topAmount = totals[name];
            topCategory = name;
        }
    }

    document.getElementById("top-category").textContent = topCategory;

    // Budget message.
    const message = document.getElementById("budget-message");
    const now = new Date();
    let monthTotal = 0;

    expenses.forEach(function (expense) {
        const d = new Date(expense.date + "T00:00:00");

        if (d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()) {
            monthTotal += Number(expense.amount);
        }
    });

    if (monthlyBudget <= 0) {
        message.textContent = "";
        return;
    }

    if (monthTotal > monthlyBudget) {
        message.setAttribute("aria-live", "assertive");
        message.textContent =
            "Over budget by " + formatCurrency(monthTotal - monthlyBudget) + ".";
    } else {
        message.setAttribute("aria-live", "polite");
        message.textContent =
            "You have " + formatCurrency(monthlyBudget - monthTotal) + " left this month.";
    }
}
// Update dashboard totals.
function updateDashboard() {
        updateExtraStats();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const startOfWeek = new Date(today);
    const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;

    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    let totalSpent = 0;
    let weeklySpent = 0;
    let monthlySpent = 0;

    expenses.forEach(function (expense) {
        const amount = Number(expense.amount);
        const expenseDate = new Date(expense.date + "T00:00:00");

        totalSpent += amount;

        if (expenseDate >= startOfWeek && expenseDate <= today) {
            weeklySpent += amount;
        }

        if (
            expenseDate.getMonth() === currentMonth &&
            expenseDate.getFullYear() === currentYear
        ) {
            monthlySpent += amount;
        }
    });

    totalSpentElement.textContent = formatCurrency(totalSpent);
    weeklySpentElement.textContent = formatCurrency(weeklySpent);
    monthlySpentElement.textContent = formatCurrency(monthlySpent);

// Display the monthly budget and remaining amount.
monthlyBudgetElement.textContent = monthlyBudget > 0
    ? formatCurrency(monthlyBudget)
    : "Not set";

const remaining = monthlyBudget - monthlySpent;

budgetRemainingElement.textContent = monthlyBudget > 0
    ? formatCurrency(remaining)
    : "Not set";

// Calculate average daily spending over the last 7 days.
const sevenDaysAgo = new Date(today);
sevenDaysAgo.setDate(today.getDate() - 6);
sevenDaysAgo.setHours(0, 0, 0, 0);

let lastSevenDaysSpent = 0;

expenses.forEach(function (expense) {
    const expenseDate = new Date(expense.date + "T00:00:00");

    if (expenseDate >= sevenDaysAgo && expenseDate <= today) {
        lastSevenDaysSpent += Number(expense.amount);
    }
});

const dailyPace = lastSevenDaysSpent / 7;

if (monthlyBudget <= 0) {
    runwayDaysElement.textContent = "Set a budget";
} else if (remaining <= 0) {
    runwayDaysElement.textContent = "Budget reached";
} else if (dailyPace === 0) {
    runwayDaysElement.textContent = "Not enough spending data";

} else {
    runwayDaysElement.textContent =
        Math.floor(remaining / dailyPace) + " days";
}
}

// Handle submitted expenses.
expenseForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const description = document.getElementById("expense-description").value.trim();
    const amount = Number(document.getElementById("expense-amount").value);
    const category = document.getElementById("expense-category").value;
    const date = document.getElementById("expense-date").value;
    const needWant = document.querySelector(
        'input[name="needWant"]:checked'
    );

    const rawDescription = document.getElementById("expense-description").value;
    const amountText = document.getElementById("expense-amount").value;

    const descriptionError = checkDescription(rawDescription);
    const amountError = checkAmount(amountText);
    const categoryError = checkCategory(category);
    const dateError = checkDate(date);
    const needWantError = needWant ? "" : "Please choose Need or Want.";

    document.getElementById("description-error").textContent = descriptionError;
    document.getElementById("amount-error").textContent = amountError;
    document.getElementById("category-error").textContent = categoryError;
    document.getElementById("date-error").textContent = dateError;
    document.getElementById("needwant-error").textContent = needWantError;

    if (descriptionError || amountError || categoryError || dateError || needWantError) {
        return;
    }
    expenses.push({
      id: Date.now().toString(),
      description: description,
      amount: amount,
      category: category,
      date: date,
      needWant: needWant.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()  
    });

    saveExpenses();
    updateDashboard();
    displayExpenses();

    alert("Expense saved successfully!");
    expenseForm.reset();
});

function addHighlightedText(cell, text, pattern) {
    cell.textContent = "";

    if (!pattern) {
        cell.textContent = text;
        return;
    }

    let lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
        if (match[0] === "") {
            continue;
        }

        cell.append(text.slice(lastIndex, match.index));

        const mark = document.createElement("mark");
        mark.textContent = match[0];
        cell.append(mark);

        lastIndex = match.index + match[0].length;
    }

    cell.append(text.slice(lastIndex));
}
function displayExpenses() {
    const recordsSection = document.querySelector("#records");
    const recordsMessage = recordsSection.querySelector("p");

    const oldTable = recordsSection.querySelector("table");
    if (oldTable) {
        oldTable.remove();
    }

    // Start with all saved expenses.
    let displayedExpenses = [...expenses];

    // Search descriptions and categories.
        const searchTerm = searchInput.value.trim();
    const flags = caseToggle.checked ? "i" : "";
    let highlightPattern = null;

    if (searchTerm) {
        try {
            const searchPattern = new RegExp(searchTerm, flags);
            highlightPattern = new RegExp(searchTerm, flags + "g");

            displayedExpenses = displayedExpenses.filter(function (expense) {
                return searchPattern.test(expense.description) ||
                    searchPattern.test(expense.category);
            });
        } catch (error) {
            recordsMessage.textContent =
                "Invalid regular expression. Please check your search.";
            return;
        }
    }

    // Sort the displayed expenses.
    const sortOption = sortSelect.value;
if (sortOption === "newest") {
    displayedExpenses.sort(function (a, b) {
        const dateDifference = b.date.localeCompare(a.date);

        if (dateDifference !== 0) {
            return dateDifference;
        }

        return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
} else if (sortOption === "oldest") {
    displayedExpenses.sort(function (a, b) {
        const dateDifference = a.date.localeCompare(b.date);

        if (dateDifference !== 0) {
            return dateDifference;
        }

        return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
    
    } else if (sortOption === "description") {
        displayedExpenses.sort(function (a, b) {
            return a.description.localeCompare(b.description);
        });
    } else if (sortOption === "amount-high") {
        displayedExpenses.sort(function (a, b) {
            return Number(b.amount) - Number(a.amount);
        });
    } else if (sortOption === "amount-low") {
        displayedExpenses.sort(function (a, b) {
            return Number(a.amount) - Number(b.amount);
        });
    }

    if (displayedExpenses.length === 0) {
        recordsMessage.textContent = searchTerm
            ? "No matching expenses found."
            : "Your transactions will appear here.";
        return;
    }

function formatCurrency(amount) {
    const convertedAmount = Number(amount) * exchangeRates[selectedCurrency];

    return currencySymbols[selectedCurrency] + " " +
        convertedAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}


    recordsMessage.textContent = "";

    const table = document.createElement("table");
    const headerRow = table.insertRow();

    const headings = [
        "Date",
        "Description",
        "Category",
        "Amount",
        "Need/Want",
        "Actions"
    ];

    headings.forEach(function (heading) {
        const th = document.createElement("th");
        th.textContent = heading;
        th.scope = "col";
        headerRow.appendChild(th);
    });

    displayedExpenses.forEach(function (expense) {
        const row = table.insertRow();

        const values = [
            expense.date,
            expense.description,
            expense.category,
            formatCurrency(expense.amount),
            expense.needWant
        ];

               values.forEach(function (value, index) {
            const cell = row.insertCell();

            if (index === 1 || index === 2) {
                addHighlightedText(cell, value, highlightPattern);
            } else {
                cell.textContent = value;
            }
        });

        const actionsCell = row.insertCell();

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.type = "button";

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.type = "button";
        deleteButton.addEventListener("click", function (){
            const confirmed = confirm(
                "Are you sure you want to delete this expense?"
            );

            if (!confirmed) {
                return;

            }
            
            expenses = expenses.filter(function (item) {
                return item.id !== expense.id;

            });

            saveExpenses();
            updateDashboard();
            displayExpenses();

        });

            
        editButton.addEventListener("click", function (){
             const newDescription = prompt(
                "Edit expense description:",
                expense.description

             );

             if (newDescription === null || newDescription.trim() === ""){
                return;
             }

             const newAmount = prompt(
                "Edit expense amount:",
                expense.amount


            
             );

             if (newAmount === null){
                return;

             }

             const amount = Number(newAmount);

             if (!Number.isFinite(amount) || amount <= 0){
                alert("Please enter a valid amount.");
                return;

             }

             const expenseToEdit = expenses.find(function (item) {
                return item.id === expense.id;
             });

             if (expenseToEdit) {
                expenseToEdit.description = newDescription.trim();
                expenseToEdit.amount = amount;
                expenseToEdit.updatedAt = new Date().toISOString();

                saveExpenses();
                updateDashboard();
                displayExpenses();
             }


        });
        
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        
    }
    );

    recordsSection.appendChild(table);
}
searchInput.addEventListener("input", displayExpenses);
sortSelect.addEventListener("change", displayExpenses);
caseToggle.addEventListener("change", displayExpenses);

// Save the monthly budget.
budgetForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const amount = Number(budgetInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid budget greater than zero.");
        return;
    }

    monthlyBudget = amount;

    localStorage.setItem(
        "runway:monthly-budget",
        String(monthlyBudget)
    );

    updateDashboard();
    alert("Monthly budget saved successfully!");
});
// Show saved totals and records when the page opens.
updateDashboard();
displayExpenses();
