import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAb7M3MiQ3tGYMT1PCFRam-Z0S6rXqwVcQ",
    authDomain: "wad2-32757.firebaseapp.com",
    projectId: "wad2-32757",
    storageBucket: "wad2-32757.appspot.com",
    messagingSenderId: "191549341083",
    appId: "1:191549341083:web:ad67ea6030d29c8700353e"
};

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
let userUID = null;

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        tripID: params.get('tripID'),
        location: params.get('location')
    };
}

// Existing variables and elements
let totalBudget = 0;
let totalSpending = 0;
let remainingBudget = 0;
const expenses = [];
let expenseChart;
let currentTripId = null;
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

const EXPENSE_CATEGORIES = {
    ACCOMMODATION: 'Accommodation',
    TRANSPORTATION: 'Transportation',
    FOOD: 'Food',
    ACTIVITIES: 'Activities',
    SHOPPING: 'Shopping',
    MISCELLANEOUS: 'Miscellaneous'
};

const CATEGORY_COLORS = {
    'Accommodation': 'rgba(52, 152, 219, 0.8)',   // Blue
    'Transportation': 'rgba(231, 76, 60, 0.8)',   // Red
    'Food': 'rgba(46, 204, 113, 0.8)',           // Green
    'Activities': 'rgba(155, 89, 182, 0.8)',      // Purple
    'Shopping': 'rgba(241, 196, 15, 0.8)',        // Yellow
    'Miscellaneous': 'rgba(149, 165, 166, 0.8)'   // Gray
};


async function loadTrips() {
    const tripSelect = document.getElementById('trip');
    tripSelect.innerText = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.innerText = "Select a trip";
    tripSelect.appendChild(defaultOption);

    try {
        if (!auth.currentUser) return;
        userUID = auth.currentUser.uid;
        const tripsRef = collection(db, `users/${userUID}/trips`);
        const querySnapshot = await getDocs(tripsRef);

        // Get tripID - first check URL params, then fallback to localStorage
        const params = new URLSearchParams(window.location.search);
        const urlTripID = params.get('tripID');
        const storedTripID = localStorage.getItem("selectedTripId");
        const tripToSelect = urlTripID || storedTripID;

        console.log('TripID to select:', tripToSelect); // Debug log

        querySnapshot.forEach((doc) => {
            const tripData = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.innerText = tripData.name || 'Unnamed Trip';

            if (tripData.location) {
                const country = tripData.location.split(',').pop().trim();
                option.dataset.country = country;
            }

            // Set this option as selected if it matches the tripID
            // if (tripToSelect && doc.id === tripToSelect) {
            //     option.selected = true;
            //     console.log('Found matching trip, setting as selected'); // Debug log
            // }

            tripSelect.appendChild(option);
        });

        // If we have a trip to select, trigger the change event to load the trip data
        // if (tripToSelect) {
        //     console.log('Triggering change event for trip selection'); // Debug log
        //     currentTripId = tripToSelect;
        //     tripSelect.dispatchEvent(new Event('change'));

        //     // Load trip data
        //     await loadTripData(tripToSelect);

        //     // Show UI elements
        //     expenseCard.style.display = 'block';
        //     dashboardSection.style.display = 'block';
        // }
    } catch (error) {
        console.error("Error loading trips:", error);
    }
}

Chart.register(ChartDataLabels);


// Add this function to initialize the chart
function initializeChart() {
    const ctx = document.getElementById('spendingChart');
    if (!ctx) {
        console.error('Cannot find chart canvas element');
        return;
    }

    try {
        if (expenseChart) {
            expenseChart.destroy();
        }

        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        position: 'right',
                        display: true,
                        labels: {
                            font: {
                                size: 14
                            },
                            padding: 20,
                            generateLabels: (chart) => {
                                const datasets = chart.data.datasets;
                                return datasets[0].data.map((data, i) => ({
                                    text: `${chart.data.labels[i]}`, // Only show the category and amount
                                    fillStyle: datasets[0].backgroundColor[i],
                                    index: i
                                }));
                            }
                        }
                    },
                    datalabels: {
                        color: 'white',
                        font: {
                            weight: 'bold',
                            size: 16
                        },
                        formatter: (value, ctx) => {
                            if (value === 0) return '';
                            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value * 100) / sum).toFixed(1);
                            return `${percentage}%`;
                        },
                        display: (context) => {
                            return context.dataset.data[context.dataIndex] > 0;
                        },
                        offset: 8,
                        padding: {
                            top: 5,
                            bottom: 5,
                            left: 5,
                            right: 5
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        borderRadius: 4
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                if (value === 0) return 'No expenses recorded';
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value * 100) / total).toFixed(1);
                                return `${context.label}: ${value.toFixed(2)} ${selectedCurrency} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        console.log('Chart initialized with improved styling');
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}


// Function to load trip budget and expenses
async function loadTripData(tripId) {
    console.log('Loading trip data for ID:', tripId);
    try {
        if (!userUID) {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("No user logged in");
            }
            userUID = user.uid;
        }

        // Ensure currency rates are available
        if (!currencyRates || Object.keys(currencyRates).length === 0) {
            console.log('Currency rates not loaded, initializing with EUR only');
            currencyRates = { "EUR": 1 };
            selectedCurrency = "EUR";
        }

        // Get trip data including budget
        const tripRef = doc(db, `users/${userUID}/trips`, tripId);
        const tripDoc = await getDoc(tripRef);

        if (tripDoc.exists()) {
            const tripData = tripDoc.data();
            console.log('Retrieved trip data:', tripData);

            totalBudget = tripData.budget || 0;
            document.getElementById('budget').value = totalBudget;

            expenseCard.style.display = 'block';
            dashboardSection.style.display = 'block';

            updateDashboard();
        } else {
            console.log("No trip found with ID:", tripId);
            return;
        }

        // Set up expenses listener for this trip
        const expensesRef = collection(db, `users/${userUID}/trips/${tripId}/expenses`);
        const q = query(expensesRef);

        // Clear existing expenses
        expenses.length = 0;
        totalSpending = 0;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('Expenses snapshot received:', snapshot.size, 'documents');

            // Clear existing expenses
            expenses.length = 0;
            totalSpending = 0;

            snapshot.forEach((doc) => {
                const expenseData = doc.data();
                const expense = {
                    id: doc.id,
                    ...expenseData
                };

                // Validate expense data
                if (typeof expense.amount === 'number' && !isNaN(expense.amount)) {
                    totalSpending += expense.amount;
                } else {
                    console.warn('Invalid amount in expense:', expense);
                }

                expenses.push(expense);
            });

            // Sort expenses by date (most recent first)
            expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

            console.log('Updated expenses array:', expenses);
            console.log('Total spending:', totalSpending);

            // Update all UI elements
            updateDashboard();
            updateExpenseChart(getFilteredExpenses());
            updateRecentTransactionsTableInCurrency(selectedCurrency);

            // Show/hide transactions container
            recentTransactionsContainer.style.display = expenses.length ? 'block' : 'none';
        });

        // Return unsubscribe function
        return unsubscribe;

    } catch (error) {
        console.error("Error in loadTripData:", error);
        alert('Error loading trip data. Please try again.');
    }
}

// Function to update the Recent Transactions Table
function updateRecentTransactionsTable() {
    recentTransactionsTable.innerText = ''; // Clear existing rows
    expenses.forEach((expense, index) => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = expense.date;

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = expense.description;

        const amountCell = document.createElement('td');
        amountCell.textContent = `$${expense.amount.toFixed(2)}`;

        const actionCell = document.createElement('td');
        actionCell.className = 'action-cell'; // Ensure the class is added

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.classList.add('edit-btn');

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');

        // Append buttons to action cell
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


// Modified expense form submission, add/update
expenseForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form from submitting normally

    if (!currentTripId || !userUID) {
        alert('Please select a trip first');
        return;
    }

    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;

    // Debug logs
    console.log('Form Data:', {
        amount,
        date,
        category,
        description
    });
    console.log('Valid categories:', Object.values(EXPENSE_CATEGORIES));
    console.log('Is valid category:', Object.values(EXPENSE_CATEGORIES).includes(category));

    // Additional validation
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    if (!category || !Object.values(EXPENSE_CATEGORIES).includes(category)) {
        alert('Please select a valid category');
        return;
    }

    try {
        const expenseData = {
            date,
            amount,
            category,
            description,
            createdAt: new Date(),
            tripId: currentTripId
        };

        console.log('Saving expense with data:', expenseData);

        if (isEditMode && currentEditIndex !== null) {
            const expenseId = expenses[currentEditIndex].id;
            await updateDoc(
                doc(db, `users/${userUID}/trips/${currentTripId}/expenses`, expenseId),
                {
                    ...expenseData,
                    updatedAt: new Date()
                }
            );
        } else {
            const docRef = await addDoc(
                collection(db, `users/${userUID}/trips/${currentTripId}/expenses`),
                expenseData
            );
            console.log('Expense saved with ID:', docRef.id);
        }

        // Reset form without page reload
        expenseForm.reset();
        isEditMode = false;
        currentEditIndex = null;
        expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';

    } catch (error) {
        console.error("Error saving expense:", error);
        alert('Error saving expense: ' + error.message);
    }
});


// Function to update the dashboard values with the selected currency
function updateDashboard() {
    const convertedBudget = convertAmount(totalBudget, selectedCurrency);
    const convertedSpending = convertAmount(totalSpending, selectedCurrency);
    const convertedRemaining = convertAmount(totalBudget - totalSpending, selectedCurrency);
    const remaining = (convertedBudget - totalSpending).toFixed(2)
    

    dashboardTotalBudget.textContent = `${convertedBudget} ${selectedCurrency}`;
    dashboardTotalSpending.textContent = `${totalSpending.toFixed(2)} ${selectedCurrency}`;
    dashboardRemainingBudget.textContent = `${remaining} ${selectedCurrency}`;

    // Change color based on remaining budget
    dashboardRemainingBudget.style.color = (remaining < 0) ? '#e74c3c' : '#2ecc71';
}

// Event listener for budget form submission
budgetForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!userUID) {
        alert('Please log in first');
        return;
    }

    const selectedTripId = document.getElementById('trip').value;
    if (!selectedTripId) {
        alert('Please select a trip');
        return;
    }

    totalBudget = parseFloat(document.getElementById('budget').value);

    try {
        await updateDoc(doc(db, `users/${userUID}/trips`, selectedTripId), {
            budget: totalBudget
        }); //input budget into firestore

        currentTripId = selectedTripId;
        updateDashboard();
        expenseCard.style.display = 'block';
        dashboardSection.style.display = 'block';
    } catch (error) {
        console.error("Error updating budget:", error);
        alert('Error updating budget');
    }
});


// Function to update the expense chart with the selected currency
function updateExpenseChart(filteredExpenses) {
    if (!expenseChart) {
        initializeChart();
    }

    // Initialize totals for all categories
    const categoryTotals = {};
    Object.values(EXPENSE_CATEGORIES).forEach(category => {
        categoryTotals[category] = 0;
    });

    // Calculate totals for each category in EUR first, then convert
    filteredExpenses.forEach(expense => {
        if (expense.category && Object.values(EXPENSE_CATEGORIES).includes(expense.category)) {
            categoryTotals[expense.category] += Number(expense.amount) || 0;
        }
    });

    // Prepare data for chart with currency conversion
    const labels = [];
    const data = [];
    const backgroundColor = [];

    // Check if we have any expenses
    const hasExpenses = Object.values(categoryTotals).some(total => total > 0);

    if (hasExpenses) {
        // Convert each category total to the selected currency and add to chart data
        Object.entries(categoryTotals).forEach(([category, total]) => {
            // const convertedTotal = parseFloat(convertAmount(total, selectedCurrency));
            labels.push(`${category} - ${total} ${selectedCurrency}`);
            data.push(total);
            backgroundColor.push(CATEGORY_COLORS[category]);
        });
    } else {
        // Show "No Expenses" message
        labels.push('No Expenses');
        data.push(0);
        backgroundColor.push('rgba(200, 200, 200, 0.5)');
    }

    // Update chart data
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = data;
    expenseChart.data.datasets[0].backgroundColor = backgroundColor;

    // Update chart options for tooltips and datalabels to show amounts in selected currency
    expenseChart.options.plugins.tooltip.callbacks.label = (context) => {
        const value = context.raw;
        if (value === 0) return 'No expenses recorded';
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const percentage = ((value * 100) / total).toFixed(1);
        return `${context.label}: ${value.toFixed(2)} ${selectedCurrency} (${percentage}%)`;
    };
    expenseChart.options.plugins.datalabels.formatter = (value, ctx) => {
        if (value === 0) return '';
        const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
        const percentage = ((value * 100) / sum).toFixed(1);
        return `${percentage}%`;
    };

    // Refresh the chart
    expenseChart.update();
}

// Date Range Filtering for Chart
function getFilteredExpenses() {
    console.log('Getting filtered expenses. Current expenses:', expenses);
    const selectedRange = dateRange.value;
    console.log('Selected date range:', selectedRange);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredExpenses = expenses.filter(expense => {
        if (!expense.date) {
            console.log('Expense missing date:', expense);
            return false;
        }

        const expenseDate = new Date(expense.date);
        if (isNaN(expenseDate.getTime())) {
            console.log('Invalid date for expense:', expense);
            return false;
        }

        expenseDate.setHours(0, 0, 0, 0);

        let shouldInclude = true;
        switch (selectedRange) {
            case 'today':
                shouldInclude = expenseDate.getTime() === today.getTime();
                break;
            case 'week': {
                const oneWeekAgo = new Date(today);
                oneWeekAgo.setDate(today.getDate() - 6);
                shouldInclude = expenseDate >= oneWeekAgo && expenseDate <= today;
                break;
            }
            case 'month': {
                const oneMonthAgo = new Date(today);
                oneMonthAgo.setMonth(today.getMonth() - 1);
                shouldInclude = expenseDate >= oneMonthAgo && expenseDate <= today;
                break;
            }
            case 'all':
                shouldInclude = true; // Include all expenses for "All Time"
                break;
            default:
                shouldInclude = true;
        }

        console.log('Expense:', expense, 'Included:', shouldInclude);
        return shouldInclude;
    });

    console.log('Filtered expenses result:', filteredExpenses);
    return filteredExpenses;
}


// Reset edit mode if the form is reset or if a new transaction is added
expenseForm.addEventListener('reset', function () {
    isEditMode = false;
    currentEditIndex = null;
    expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
});

// Event listener for date range selection to update the chart
dateRange.addEventListener('change', () => updateExpenseChart(getFilteredExpenses())); //getFilteredExpenses into updatexpensechart funct

async function deleteTransaction(index) {
    try {
        const expenseId = expenses[index].id;
        await deleteDoc(
            doc(db, `users/${userUID}/trips/${currentTripId}/expenses`, expenseId)
        );
    } catch (error) {
        console.error("Error deleting expense:", error);
        alert('Error deleting expense');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication first
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userUID = user.uid;
            await loadTrips();  // Wait for trips to load

            // Get URL parameters for initial load
            const { tripID } = getUrlParams();

            if (tripID) {
                // Set the dropdown value to the tripID
                const tripSelect = document.getElementById('trip');
                // tripSelect.value = tripID;

                // Initialize chart and load trip data
                // currentTripId = tripID;
                // initializeChart();
                // await loadTripData(tripID);

                // Show UI elements
                // expenseCard.style.display = 'block';
                // dashboardSection.style.display = 'block';
            }

            // Add change event handler for trip dropdown
            document.getElementById('trip').addEventListener('change', async function (e) {
                const selectedTripId = e.target.value;
                const selectedOption = e.target.options[e.target.selectedIndex];

                if (selectedTripId) {
                    currentTripId = selectedTripId;

                    // Get trip data and update everything
                    try {
                        const tripRef = doc(db, `users/${userUID}/trips`, selectedTripId);
                        const tripDoc = await getDoc(tripRef);

                        if (tripDoc.exists()) {
                            const tripData = tripDoc.data();

                            // Set budget value
                            totalBudget = Number(tripData.budget) || 0;
                            // document.getElementById('budget').value = totalBudget;

                            // Set location-based currency if available
                            if (tripData.location) {
                                const country = tripData.location.split(',').pop().trim();
                                if (countryToCurrencyMap[country]) {
                                    selectedCurrency = countryToCurrencyMap[country];
                                    const currencySelect = document.getElementById('currency');
                                    if (currencySelect) {
                                        currencySelect.value = selectedCurrency;
                                    }
                                }
                            }

                            // Show UI elements
                            expenseCard.style.display = 'block';
                            dashboardSection.style.display = 'block';

                            // Initialize chart if needed
                            if (!expenseChart) {
                                initializeChart();
                            }

                            // Load full trip data including expenses
                            await loadTripData(selectedTripId);

                            // Update all UI elements
                            updateDashboard();

                        } else {
                            console.log("No trip found with ID:", selectedTripId);
                        }
                    } catch (error) {
                        console.error("Error loading trip:", error);
                        alert('Error loading trip data. Please try again.');
                    }
                } else {
                    // Reset everything if no trip is selected
                    expenseCard.style.display = 'none';
                    dashboardSection.style.display = 'none';
                    totalBudget = 0;
                    totalSpending = 0;
                    expenses.length = 0;
                    updateDashboard();
                }
            });
        } else {
            window.location.href = "login.html";
        }
    });
});

let currencyRates = {};
let selectedCurrency = 'EUR'; // Default currency

// Fetch and populate currency options
async function getCurrencyRates() {
    try {
        const response = await axios.get("http://data.fixer.io/api/latest", {
            params: { access_key: "45818ae685202a973809c1932d8763e2" }
        });

        if (response.data.success) {
            currencyRates = response.data.rates;
            console.log("Currency rates fetched successfully");

            // Populate currency select dropdown
            const currencySelect = document.getElementById("currency");
            currencySelect.innerText = ''; // Clear previous options

            // Add EUR as default option
            const defaultOption = document.createElement("option");
            defaultOption.value = "EUR";
            defaultOption.innerText = "EUR";
            currencySelect.appendChild(defaultOption);

            // Add remaining currencies
            Object.keys(currencyRates).sort().forEach(key => {
                if (key !== "EUR") { // Skip EUR as it's already added
                    const option = document.createElement("option");
                    option.value = key;
                    option.innerText = key;
                    currencySelect.appendChild(option);
                }
            });

            // Set initial currency
            selectedCurrency = "EUR";
            currencySelect.value = "EUR";

            // Update UI with new rates
            updateDashboard();
            if (expenses.length > 0) {
                updateExpenseChart(getFilteredExpenses());
                updateRecentTransactionsTableInCurrency(selectedCurrency);
            }
        } else {
            console.error("Failed to fetch currency rates:", response.data.error);
            handleCurrencyError();
        }
    } catch (error) {
        console.error("Error fetching currency rates:", error);
        handleCurrencyError();
    }
}


function handleCurrencyError() {
    currencyRates = { "EUR": 1 }; // Set default rate
    selectedCurrency = "EUR";

    // Update currency select dropdown with only EUR
    const currencySelect = document.getElementById("currency");
    currencySelect.innerText = ''; // Clear previous options

    const defaultOption = document.createElement("option");
    defaultOption.value = "EUR";
    defaultOption.innerText = "EUR";
    currencySelect.appendChild(defaultOption);
    currencySelect.value = "EUR";

    // Show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-warning';
    errorMessage.innerText = 'Currency conversion unavailable. Showing amounts in EUR.';
    errorMessage.style.margin = '10px 0';

    const dashboardSection = document.getElementById('dashboardSection');
    dashboardSection.insertBefore(errorMessage, dashboardSection.firstChild);
}

function convertAmount(amount, currency) {
    // If rates aren't loaded yet or currency is not specified, return original amount
    if (!currencyRates || !currency || !currencyRates[currency]) {
        console.log('Currency rates not ready, returning original amount:', amount);
        return amount.toFixed(2);
    }

    const conversionRate = currencyRates[currency];
    return (amount * conversionRate).toFixed(2);
}



// Function to update the currency across all elements when selected
function updateCurrency() {
    selectedCurrency = document.getElementById("currency").value;
    if (!selectedCurrency) return;

    updateDashboard();
    updateExpenseChart(getFilteredExpenses());
    updateRecentTransactionsTableInCurrency(selectedCurrency);
}

// Event listener for currency selection
document.getElementById("currency").addEventListener("change", updateCurrency);


function updateRecentTransactionsTableInCurrency(currency) {
    recentTransactionsTable.innerText = '';
    expenses.forEach((expense, index) => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = expense.date;

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = expense.description;

        const amountCell = document.createElement('td');
        const amount = parseFloat(expense.amount);
        if (isNaN(amount)) {
            amountCell.textContent = 'Invalid Amount';
        } else {
            // const convertedAmount = convertAmount(amount, currency);
            amountCell.textContent = `${amount} ${currency}`;
        }

        const actionCell = document.createElement('td');
        actionCell.style.display = 'flex';
        actionCell.style.gap = '10px';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.classList.add('edit-btn');

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');

        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);

        editBtn.addEventListener('click', () => enterEditMode(index));
        deleteBtn.addEventListener('click', () => deleteTransaction(index));

        row.appendChild(dateCell);
        row.appendChild(descriptionCell);
        row.appendChild(amountCell);
        row.appendChild(actionCell);
        recentTransactionsTable.appendChild(row);
    });
    recentTransactionsContainer.style.display = expenses.length ? 'block' : 'none';
}

// Event listener for currency selection
document.getElementById("currency").addEventListener("change", updateCurrency);

// Initialize currency rates on page load
getCurrencyRates();


const style = document.createElement('style');
style.textContent = `
    .chart-container {
        position: relative;
        height: 500px; /* Increased height */
        width: 100%;
        margin: 20px 0;
        padding: 20px;
    }

    #spendingChart {
        max-height: 100%;
    }

    .spending-overview {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
`;
document.head.appendChild(style);

const countryToCurrencyMap = {
    "Afghanistan": "AFN",
    "Albania": "ALL",
    "Algeria": "DZD",
    "Andorra": "EUR",
    "Angola": "AOA",
    "Argentina": "ARS",
    "Armenia": "AMD",
    "Australia": "AUD",
    "Austria": "EUR",
    "Azerbaijan": "AZN",
    "Bahamas": "BSD",
    "Bahrain": "BHD",
    "Bangladesh": "BDT",
    "Barbados": "BBD",
    "Belarus": "BYN",
    "Belgium": "EUR",
    "Belize": "BZD",
    "Benin": "XOF",
    "Bhutan": "BTN",
    "Bolivia": "BOB",
    "Bosnia and Herzegovina": "BAM",
    "Botswana": "BWP",
    "Brazil": "BRL",
    "Brunei": "BND",
    "Bulgaria": "BGN",
    "Burkina Faso": "XOF",
    "Burundi": "BIF",
    "Cabo Verde": "CVE",
    "Cambodia": "KHR",
    "Cameroon": "XAF",
    "Canada": "CAD",
    "Central African Republic": "XAF",
    "Chad": "XAF",
    "Chile": "CLP",
    "China": "CNY",
    "Colombia": "COP",
    "Comoros": "KMF",
    "Congo (Congo-Brazzaville)": "CDF",
    "Costa Rica": "CRC",
    "Croatia": "HRK",
    "Cuba": "CUP",
    "Cyprus": "EUR",
    "Czechia (Czech Republic)": "CZK",
    "Denmark": "DKK",
    "Djibouti": "DJF",
    "Dominica": "XCD",
    "Dominican Republic": "DOP",
    "Ecuador": "USD",
    "Egypt": "EGP",
    "El Salvador": "USD",
    "Equatorial Guinea": "XAF",
    "Eritrea": "ERN",
    "Estonia": "EUR",
    "Ethiopia": "ETB",
    "Fiji": "FJD",
    "Finland": "EUR",
    "France": "EUR",
    "Gabon": "XAF",
    "Gambia": "GMD",
    "Georgia": "GEL",
    "Germany": "EUR",
    "Ghana": "GHS",
    "Greece": "EUR",
    "Grenada": "XCD",
    "Guatemala": "GTQ",
    "Guinea": "GNF",
    "Guinea-Bissau": "XOF",
    "Guyana": "GYD",
    "Haiti": "HTG",
    "Honduras": "HNL",
    "Hungary": "HUF",
    "Iceland": "ISK",
    "India": "INR",
    "Indonesia": "IDR",
    "Iran": "IRR",
    "Iraq": "IQD",
    "Ireland": "EUR",
    "Israel": "ILS",
    "Italy": "EUR",
    "Jamaica": "JMD",
    "Japan": "JPY",
    "Jordan": "JOD",
    "Kazakhstan": "KZT",
    "Kenya": "KES",
    "Kiribati": "AUD",
    "Kuwait": "KWD",
    "Kyrgyzstan": "KGS",
    "Laos": "LAK",
    "Latvia": "EUR",
    "Lebanon": "LBP",
    "Lesotho": "LSL",
    "Liberia": "LRD",
    "Libya": "LYD",
    "Liechtenstein": "CHF",
    "Lithuania": "EUR",
    "Luxembourg": "EUR",
    "Madagascar": "MGA",
    "Malawi": "MWK",
    "Malaysia": "MYR",
    "Maldives": "MVR",
    "Mali": "XOF",
    "Malta": "EUR",
    "Marshall Islands": "USD",
    "Mauritania": "MRU",
    "Mauritius": "MUR",
    "Mexico": "MXN",
    "Moldova": "MDL",
    "Monaco": "EUR",
    "Mongolia": "MNT",
    "Montenegro": "EUR",
    "Morocco": "MAD",
    "Mozambique": "MZN",
    "Myanmar (formerly Burma)": "MMK",
    "Namibia": "NAD",
    "Nauru": "AUD",
    "Nepal": "NPR",
    "Netherlands": "EUR",
    "New Zealand": "NZD",
    "Nicaragua": "NIO",
    "Niger": "XOF",
    "Nigeria": "NGN",
    "North Macedonia": "MKD",
    "Norway": "NOK",
    "Oman": "OMR",
    "Pakistan": "PKR",
    "Palau": "USD",
    "Panama": "PAB",
    "Papua New Guinea": "PGK",
    "Paraguay": "PYG",
    "Peru": "PEN",
    "Philippines": "PHP",
    "Poland": "PLN",
    "Portugal": "EUR",
    "Qatar": "QAR",
    "Romania": "RON",
    "Russia": "RUB",
    "Rwanda": "RWF",
    "Saint Kitts and Nevis": "XCD",
    "Saint Lucia": "XCD",
    "Saint Vincent and the Grenadines": "XCD",
    "Samoa": "WST",
    "San Marino": "EUR",
    "Sao Tome and Principe": "STN",
    "Saudi Arabia": "SAR",
    "Senegal": "XOF",
    "Serbia": "RSD",
    "Seychelles": "SCR",
    "Sierra Leone": "SLL",
    "Singapore": "SGD",
    "Slovakia": "EUR",
    "Slovenia": "EUR",
    "Solomon Islands": "SBD",
    "Somalia": "SOS",
    "South Africa": "ZAR",
    "South Korea": "KRW",
    "South Sudan": "SSP",
    "Spain": "EUR",
    "Sri Lanka": "LKR",
    "Sudan": "SDG",
    "Suriname": "SRD",
    "Sweden": "SEK",
    "Switzerland": "CHF",
    "Syria": "SYP",
    "Taiwan": "TWD",
    "Tajikistan": "TJS",
    "Tanzania": "TZS",
    "Thailand": "THB",
    "Timor-Leste": "USD",
    "Togo": "XOF",
    "Tonga": "TOP",
    "Trinidad and Tobago": "TTD",
    "Tunisia": "TND",
    "Turkey": "TRY",
    "Turkmenistan": "TMT",
    "Tuvalu": "AUD",
    "Uganda": "UGX",
    "Ukraine": "UAH",
    "United Arab Emirates": "AED",
    "United Kingdom": "GBP",
    "United States": "USD",
    "Uruguay": "UYU",
    "Uzbekistan": "UZS",
    "Vanuatu": "VUV",
    "Vatican City": "EUR",
    "Venezuela": "VES",
    "Vietnam": "VND",
    "Yemen": "YER",
    "Zambia": "ZMW",
    "Zimbabwe": "ZWL"
};