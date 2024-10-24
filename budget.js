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
    const date = document.getElementById('date').value; // Get the date input

    remainingBudget -= amount;
    expenses.push({ amount, category, description, date });

    document.getElementById('remainingBudget').textContent = `$${remainingBudget.toFixed(2)}`;

    updateRecentTransactions(amount, category, description, date);
    updateSpendingOverview();
    updateExpenseChart(); // Update the pie chart
});

// Update recent transactions list in a table format
function updateRecentTransactions(amount, category, description, date) {
    const recentTransactionsTableBody = document.getElementById('recentTransactionsTable'); // Target the <tbody>

    // Create a new row for the table
    const row = document.createElement('tr');

    // Create and populate the columns (date, description, cost)
    const dateCell = document.createElement('td');
    dateCell.textContent = date;

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = description;

    const costCell = document.createElement('td');
    costCell.textContent = `$${amount.toFixed(2)}`;

    // Append the cells to the row
    row.appendChild(dateCell);
    row.appendChild(descriptionCell);
    row.appendChild(costCell);

    // Append the row to the table body
    recentTransactionsTableBody.appendChild(row);

    // Show the table if there are transactions
    const recentTransactionsContainer = document.getElementById('recentTransactionsContainer');
    if (expenses.length > 0) {
        recentTransactionsContainer.style.display = 'table'; // Show the table container
    }
}

// Function to filter expenses by date range
function filterExpensesByDateRange() {
    const dateRange = document.getElementById('dateRange').value;
    let filteredExpenses = [];

    if (!dateRange) {
        // No date range selected, do nothing
        alert('Please select a date range to filter expenses.');
        return;
    }

    const today = new Date();
    let startDate, endDate;

    if (dateRange === 'today') {
        startDate = endDate = today.toISOString().split('T')[0]; // Get today's date
    } else if (dateRange === 'week') {
        endDate = today.toISOString().split('T')[0];
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0]; // 7 days ago
    } else if (dateRange === 'month') {
        endDate = today.toISOString().split('T')[0];
        startDate = new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0]; // 1 month ago
    } else if (dateRange === 'custom') {
        document.getElementById('customDateRange').style.display = 'block'; // Show custom range inputs
        return; // Wait for user to input the custom range
    }

    // Filter expenses based on the selected date range
    filteredExpenses = expenses.filter(expense => {
        return expense.date >= startDate && expense.date <= endDate;
    });

    // Update the overview and pie chart with the filtered expenses
    updateFilteredOverviewAndChart(filteredExpenses);
}


// Update spending overview and pie chart based on filtered expenses
function updateFilteredOverviewAndChart(filteredExpenses) {
    // Update Spending Overview
    const spendingOverviewList = document.getElementById('spendingOverview');
    spendingOverviewList.innerText = ''; // Clear the list

    const categoryTotals = {};
    let totalExpenses = 0;

    // Calculate total expenses and category totals for filtered expenses
    filteredExpenses.forEach(expense => {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
        totalExpenses += expense.amount;
    });

    // Display totals by category
    for (const category in categoryTotals) {
        const percentage = (categoryTotals[category] / totalExpenses * 100).toFixed(2); // Calculate percentage
        const listItem = document.createElement('li');
        listItem.textContent = `${category}: $${categoryTotals[category].toFixed(2)} (${percentage}%)`;
        spendingOverviewList.appendChild(listItem);
    }

    // Update the pie chart with filtered data
    updateExpenseChart(filteredExpenses);
}

// Update the pie chart with filtered data
function updateExpenseChart(filteredExpenses) {
    const categoryTotals = {};
    filteredExpenses.forEach(expense => {
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
                    },
                    datalabels: {
                        formatter: (value, ctx) => {
                            let sum = 0;
                            const dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.forEach(data => {
                                sum += data;
                            });
                            const percentage = (value * 100 / sum).toFixed(2) + "%"; // Calculate percentage
                            return percentage;
                        },
                        color: '#fff',  // Set color for the percentage labels
                        font: {
                            weight: 'bold',
                            size: 14
                        }
                    }
                }
            },
            plugins: [ChartDataLabels] // Enable the datalabels plugin
        });
    }
}
