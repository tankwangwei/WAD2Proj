// Variables to hold the current budget and expenses
let totalBudget = 0;
let remainingBudget = 0;
let expenses = [];
let expenseChart = null; // This will hold the chart instance

// Handle budget update
document.getElementById('budgetForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission

    const budgetInput = document.getElementById('budget').value;

    totalBudget = parseFloat(budgetInput);
    remainingBudget = totalBudget;

    document.getElementById('currentBudget').textContent = totalBudget.toFixed(2);
    document.getElementById('remainingBudget').textContent = `$${remainingBudget.toFixed(2)}`;
});

// Handle adding new expense
document.getElementById('expenseForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;

    remainingBudget -= amount;
    expenses.push({ amount, category, description });

    document.getElementById('remainingBudget').textContent = `$${remainingBudget.toFixed(2)}`;

    updateRecentTransactions(amount, category, description);
    updateSpendingOverview();
    updateExpenseChart(); // Update the pie chart
});

// Update recent transactions list
function updateRecentTransactions(amount, category, description) {
    const recentTransactionsList = document.getElementById('recentTransactions');
    const listItem = document.createElement('li');
    listItem.textContent = `${description} - $${amount.toFixed(2)} (${category})`;
    recentTransactionsList.appendChild(listItem);
}

function addCategory() {
    var newCategory = document.getElementById("newCategory").value;
    if (newCategory) {
        var select = document.getElementById("category");
        var option = document.createElement("option");
        option.text = newCategory;
        option.value = newCategory;
        select.add(option);
        document.getElementById("newCategory").value = ""; // Clear input after adding
    } else {
        alert("Please enter a category name");
    }
}

// Update spending overview
function updateSpendingOverview() {
    const spendingOverviewList = document.getElementById('spendingOverview');
    spendingOverviewList.innerHTML = ''; // Clear the list

    const categoryTotals = {};

    expenses.forEach(expense => {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
    });

    for (const category in categoryTotals) {
        const listItem = document.createElement('li');
        listItem.textContent = `${category}: $${categoryTotals[category].toFixed(2)}`;
        spendingOverviewList.appendChild(listItem);
    }
}

// Update the pie chart with the spending overview
function updateExpenseChart() {
    const categoryTotals = {};
    expenses.forEach(expense => {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    if (expenseChart) {
        // If the chart already exists, update its data
        expenseChart.data.labels = categories;
        expenseChart.data.datasets[0].data = amounts;
        expenseChart.update();
    } else {
        // Create a new pie chart
        const ctx = document.getElementById('expenseChart').getContext('2d');
        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Expenses by Category',
                    data: amounts,
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f', '#95a5a6'
                    ],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
}
