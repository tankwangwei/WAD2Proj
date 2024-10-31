// Existing variables and elements
let totalBudget = 0;
let totalSpending = 0;
const expenses = [];
let expenseChart;

const budgetForm = document.getElementById('budgetForm');
const expenseForm = document.getElementById('expenseForm');
const expenseCard = document.getElementById('expenseCard');
const dashboardSection = document.getElementById('dashboardSection');

const dashboardTotalBudget = document.getElementById('dashboardTotalBudget');
const dashboardTotalSpending = document.getElementById('dashboardTotalSpending');
const dashboardRemainingBudget = document.getElementById('dashboardRemainingBudget');
const recentTransactionsTable = document.getElementById('recentTransactionsTable');
const recentTransactionsContainer = document.getElementById('recentTransactionsContainer');
const dateRange = document.getElementById('dateRange'); // Date range dropdown

// Variables to track edit mode and the current transaction index
let isEditMode = false;
let currentEditIndex = null;

// Function to update the Recent Transactions Table
function updateRecentTransactionsTable() {
    recentTransactionsTable.innerHTML = ''; // Clear existing rows
    expenses.forEach((expense, index) => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = expense.date;

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = expense.description;

        const amountCell = document.createElement('td');
        amountCell.textContent = `$${expense.amount.toFixed(2)}`;

        // Action buttons (Edit and Delete) with spacing
        const actionCell = document.createElement('td');
        actionCell.style.display = 'flex';  // Use flex display for spacing
        actionCell.style.gap = '10px';      // Add 10px space between buttons

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.classList.add('edit-btn');

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');

        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);

        // Event listeners for Edit and Delete buttons
        editBtn.addEventListener('click', () => enterEditMode(index));
        deleteBtn.addEventListener('click', () => deleteTransaction(index));

        // Append cells to row
        row.appendChild(dateCell);
        row.appendChild(descriptionCell);
        row.appendChild(amountCell);
        row.appendChild(actionCell);
        recentTransactionsTable.appendChild(row);
    });
    recentTransactionsContainer.style.display = expenses.length ? 'block' : 'none';
}

// Enter edit mode for a specific transaction
function enterEditMode(index) {
    const { date, amount, category, description } = expenses[index];

    // Populate form with existing transaction data
    document.getElementById('date').value = date;
    document.getElementById('amount').value = amount;
    document.getElementById('category').value = category;
    document.getElementById('description').value = description;

    // Set edit mode and store the index
    isEditMode = true;
    currentEditIndex = index;

    // Update the submit button to show 'Update Expense'
    expenseForm.querySelector('button[type="submit"]').textContent = 'Update Expense';
}

// Delete a transaction
function deleteTransaction(index) {
    totalSpending -= expenses[index].amount;
    expenses.splice(index, 1); // Remove from expenses array
    updateDashboard();
    updateExpenseChart(getFilteredExpenses());
    updateRecentTransactionsTable(); // Refresh transaction table
}

// Add or update a transaction
expenseForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;

    if (isEditMode && currentEditIndex !== null) {
        // Edit mode: update the existing transaction
        const oldAmount = expenses[currentEditIndex].amount;
        expenses[currentEditIndex] = { date, description, category, amount };
        totalSpending = totalSpending - oldAmount + amount;

        // Reset edit mode
        isEditMode = false;
        currentEditIndex = null;
        expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
    } else {
        // Add mode: add a new transaction
        if (amount > (totalBudget - totalSpending)) {
            alert('Expense exceeds the remaining budget!');
            return;
        }

        totalSpending += amount;
        expenses.push({ date, description, category, amount });
    }

    // Sort expenses by transaction date in descending order (newest date first)
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    updateDashboard();
    updateExpenseChart(getFilteredExpenses());
    updateRecentTransactionsTable(); // Refresh transaction table
    expenseForm.reset();
});

// Reset edit mode on form reset
expenseForm.addEventListener('reset', function() {
    isEditMode = false;
    currentEditIndex = null;
    expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
});


// Function to update dashboard values
function updateDashboard() {
    dashboardTotalBudget.textContent = `$${totalBudget.toLocaleString()}`;
    dashboardTotalSpending.textContent = `$${totalSpending.toLocaleString()}`;
    dashboardRemainingBudget.textContent = `$${(totalBudget - totalSpending).toLocaleString()}`;
}

// Event listener for budget form submission
budgetForm.addEventListener('submit', function(event) {
    event.preventDefault();
    totalBudget = parseFloat(document.getElementById('budget').value);
    updateDashboard();
    expenseCard.style.display = 'block';
    dashboardSection.style.display = 'block';
});

// Function to update the expense chart
function updateExpenseChart(expensesToChart) {
    const categoryTotals = {};

    expensesToChart.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    const ctx = document.getElementById('spendingChart').getContext('2d');
    if (expenseChart) {
        expenseChart.data.labels = categories;
        expenseChart.data.datasets[0].data = amounts;
        expenseChart.update();
    } else {
        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Expenses by Category',
                    data: amounts,
                    backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f', '#95a5a6'],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    datalabels: {
                        formatter: (value, ctx) => {
                            const sum = ctx.chart.data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                            return ((value * 100 / sum).toFixed(2) + "%");
                        },
                        color: '#fff',
                        font: { weight: 'bold', size: 14 }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }
}

// Date Range Filtering for Chart
function getFilteredExpenses() {
    const selectedRange = dateRange.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        expenseDate.setHours(0, 0, 0, 0);

        if (selectedRange === 'today') {
            return expenseDate.getTime() === today.getTime();
        } else if (selectedRange === 'week') {
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 6);
            return expenseDate >= oneWeekAgo && expenseDate <= today;
        } else if (selectedRange === 'month') {
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(today.getMonth() - 1);
            return expenseDate >= oneMonthAgo && expenseDate <= today;
        }

        return true;
    });
}

// Reset edit mode if the form is reset or if a new transaction is added
expenseForm.addEventListener('reset', function() {
    isEditMode = false;
    currentEditIndex = null;
    expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
});

// Event listener for date range selection to update the chart
dateRange.addEventListener('change', () => updateExpenseChart(getFilteredExpenses()));









