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

// Existing variables and elements
let totalBudget = 0;
let totalSpending = 0;
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
    console.log("Current auth state:", auth.currentUser); // Debug auth state
    console.log("Local userUID:", userUID); // Debug local userUID

    const tripSelect = document.getElementById('trip');
    tripSelect.innerHTML = '<option value="">Select a trip</option>';

    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("No user logged in");
            window.location.href = "login.html";
            return;
        }
        userUID = user.uid;
        console.log("Attempting to load trips for user:", userUID);
        console.log("Full collection path:", `users/${userUID}/trips`);

        // Query trips from user's subcollection
        const tripsRef = collection(db, `users/${userUID}/trips`);
        const querySnapshot = await getDocs(tripsRef);
        
        console.log("Number of trips found:", querySnapshot.size); // Debug log
        
        querySnapshot.forEach((doc) => {
            const tripData = doc.data();
            console.log("Trip data:", tripData); // Debug log
            
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = tripData.name || 'Unnamed Trip'; // Fallback if name is missing
            tripSelect.appendChild(option);
        });

        if (querySnapshot.size === 0) {
            console.log("No trips found for user"); // Debug log
        }
    } catch (error) {
        console.error("Error loading trips:", error);
        console.error("Error details:", error.code, error.message);
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
                                    text: `${chart.data.labels[i]} - $${data.toFixed(2)}`,
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
                            size: 16 // Increased font size
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
                        // Add offset to prevent text from being cut off
                        offset: 8,
                        // Add padding around labels
                        padding: {
                            top: 5,
                            bottom: 5,
                            left: 5,
                            right: 5
                        },
                        // Add background to labels for better readability
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
                                return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
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
        console.log('Current userUID:', userUID);

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
        console.log('Setting up expenses listener for trip:', tripId);
        const expensesRef = collection(db, `users/${userUID}/trips/${tripId}/expenses`);
        const q = query(expensesRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('Snapshot received with size:', snapshot.size);
            
            // Clear existing expenses
            expenses.length = 0;
            totalSpending = 0;
            
            // Debug: Print all documents in snapshot
            snapshot.forEach((doc) => {
                console.log('Raw document data:', doc.id, doc.data());
            });
        
            snapshot.forEach((doc) => {
                const expenseData = doc.data();
                const expense = {
                    id: doc.id,
                    ...expenseData
                };
                
                // Detailed logging for each expense
                console.log('Processing expense:', {
                    id: expense.id,
                    amount: expense.amount,
                    category: expense.category,
                    date: expense.date,
                    description: expense.description
                });
                
                // Validate expense category
                if (!expense.category) {
                    console.warn('Expense missing category:', expense);
                } else if (!Object.values(EXPENSE_CATEGORIES).includes(expense.category)) {
                    console.warn('Invalid category found:', expense.category);
                    console.log('Valid categories are:', Object.values(EXPENSE_CATEGORIES));
                }

                // Validate expense amount
                const amount = Number(expense.amount);
                if (isNaN(amount)) {
                    console.warn('Invalid amount found:', expense.amount);
                } else {
                    totalSpending += amount;
                }

                expenses.push(expense);
            });
        
            // Log final state
            console.log('All loaded expenses:', expenses);
            console.log('Total spending calculated:', totalSpending);
            console.log('Current total budget:', totalBudget);

            // Sort expenses by date
            expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Get filtered expenses for the chart
            const filteredExpenses = getFilteredExpenses();
            console.log('Filtered expenses for chart:', filteredExpenses);

            // Update UI
            updateDashboard();
            updateExpenseChart(filteredExpenses);
            updateRecentTransactionsTable();
            
            // Show/hide transactions container
            recentTransactionsContainer.style.display = expenses.length ? 'block' : 'none';

            // Debug: Log final state of chart data
            if (expenseChart) {
                console.log('Current chart data:', {
                    labels: expenseChart.data.labels,
                    data: expenseChart.data.datasets[0].data,
                    backgroundColor: expenseChart.data.datasets[0].backgroundColor
                });
            }
        });

        console.log('Trip data load complete');
        return unsubscribe;

    } catch (error) {
        console.error("Error in loadTripData:", error);
        console.error("Error details:", {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        alert('Error loading trip data. Please try again.');
    }
}

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


// Modified expense form submission, add/update
expenseForm.addEventListener('submit', async function(event) {
    event.preventDefault();

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

        // Verify the expenses array after adding
        console.log('Current expenses after save:', expenses);

        expenseForm.reset();
        isEditMode = false;
        currentEditIndex = null;
        expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';

    } catch (error) {
        console.error("Error saving expense:", error);
        alert('Error saving expense: ' + error.message);
    }
});


// Function to update dashboard values
function updateDashboard() {
    // Ensure we're working with numbers and handle potential NaN values
    const budget = Number(totalBudget) || 0;
    const spending = Number(totalSpending) || 0;
    const remaining = budget - spending;

    // Format numbers with commas and fixed decimal places
    dashboardTotalBudget.textContent = `$${budget.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    dashboardTotalSpending.textContent = `$${spending.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    dashboardRemainingBudget.textContent = `$${remaining.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Add visual feedback for remaining budget
    if (remaining < 0) {
        dashboardRemainingBudget.style.color = '#e74c3c'; // Red for overspent
    } else {
        dashboardRemainingBudget.style.color = '#2ecc71'; // Green for within budget
    }
}

// Event listener for budget form submission
budgetForm.addEventListener('submit', async function(event) {
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


// Function to update the expense chart
function updateExpenseChart(filteredExpenses) {
    console.log('Filtered expenses received:', filteredExpenses); // Debug log

    if (!expenseChart) {
        initializeChart();
    }

    // Initialize totals for all categories with 0
    const categoryTotals = {};
    Object.values(EXPENSE_CATEGORIES).forEach(category => {
        categoryTotals[category] = 0;
    });

    // Calculate totals for each category
    filteredExpenses.forEach(expense => {
        console.log('Processing expense:', expense); // Debug log
        if (expense.category && Object.values(EXPENSE_CATEGORIES).includes(expense.category)) {
            categoryTotals[expense.category] += Number(expense.amount) || 0;
        }
    });

    console.log('Category totals calculated:', categoryTotals); // Debug log

    // Prepare data for chart
    const labels = [];
    const data = [];
    const backgroundColor = [];
    
    // Check if we have any expenses
    const hasExpenses = Object.values(categoryTotals).some(total => total > 0);

    if (hasExpenses) {
        // Add data for all categories
        Object.entries(categoryTotals).forEach(([category, total]) => {
            labels.push(category);
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

    // Update chart options
    expenseChart.options.plugins.legend.display = hasExpenses;
    expenseChart.options.plugins.datalabels = {
        color: 'white',
        font: { weight: 'bold', size: 14 },
        formatter: (value, ctx) => {
            if (value === 0) return '';
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value * 100) / sum).toFixed(1);
            return `${percentage}%`;
        },
        display: context => context.dataset.data[context.dataIndex] > 0
    };

    // Refresh the chart
    expenseChart.update();

    // Debug log the final chart data
    console.log('Final chart data:', {
        labels,
        data,
        backgroundColor,
        categoryTotals
    });
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
        switch(selectedRange) {
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
expenseForm.addEventListener('reset', function() {
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



document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userUID = user.uid;
            loadTrips();  // Load trips after we have the userUID
            initializeChart();

            // Add trip selection handler
            document.getElementById('trip').addEventListener('change', async function(e) {
                const selectedTripId = e.target.value;

                if (expenseChart) {
                    expenseChart.destroy();
                    expenseChart = null;
                }
            
                if (selectedTripId) {
                    currentTripId = selectedTripId;
                    
                    try {
                        // Use the correct path with user ID
                        const tripRef = doc(db, `users/${userUID}/trips`, selectedTripId);
                        const tripDoc = await getDoc(tripRef);
                        
                        if (tripDoc.exists()) {
                            const tripData = tripDoc.data();
                            
                            // Set budget values
                            totalBudget = Number(tripData.budget) || 0;
                            document.getElementById('budget').value = totalBudget;
                            
                            // Reset spending and expenses
                            totalSpending = 0;
                            expenses.length = 0;
                            
                            // Show UI elements
                            expenseCard.style.display = 'block';
                            dashboardSection.style.display = 'block';
                            
                            // Load trip data and set up listeners
                            initializeChart();
                            await loadTripData(selectedTripId);
                            
                            // Initial dashboard update
                            updateDashboard();
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
            // If no user is logged in, redirect to login page
            window.location.href = "login.html";
        }
    });
});

let currencyRates = {};
let selectedCurrency = 'USD'; // Default currency

// Fetch and populate currency options
async function getCurrencyRates() {
    try {
        const response = await axios.get("http://data.fixer.io/api/latest", {
            params: { access_key: "c0f555a5661422620003b935f9e77b04" } // Use your API key here
        });
        currencyRates = response.data.rates;
        console.log("Currency rates fetched:", currencyRates); // Debug log
        
        const currencySelect = document.getElementById("currency");
        currencySelect.innerHTML = '<option value="">Select Currency</option>';
        
        Object.keys(currencyRates).sort().forEach(key => {
            let option = document.createElement("option");
            option.value = key;
            option.textContent = key;
            currencySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching currency rates:", error);
    }
}

function convertAmount(amount, currency) {
    const conversionRate = currencyRates[currency];
    console.log("Converting amount:", amount, "to currency:", currency, "with rate:", conversionRate); // Debug log
    if (!conversionRate) {
        console.warn(`Conversion rate not found for currency: ${currency}`);
        return amount;
    }
    return (amount * conversionRate).toFixed(2);
}



function updateCurrency() {
    selectedCurrency = document.getElementById("currency").value;
    if (!selectedCurrency) return;

    const convertedBudget = convertAmount(totalBudget, selectedCurrency);
    const convertedSpending = convertAmount(totalSpending, selectedCurrency);
    const convertedRemaining = convertAmount(totalBudget - totalSpending, selectedCurrency);

    console.log("Updated values - Budget:", convertedBudget, "Spending:", convertedSpending, "Remaining:", convertedRemaining); // Debug log

    dashboardTotalBudget.textContent = `${convertedBudget} ${selectedCurrency}`;
    dashboardTotalSpending.textContent = `${convertedSpending} ${selectedCurrency}`;
    dashboardRemainingBudget.textContent = `${convertedRemaining} ${selectedCurrency}`;

    updateRecentTransactionsTableInCurrency(selectedCurrency);
}


function updateRecentTransactionsTableInCurrency(currency) {
    recentTransactionsTable.innerHTML = '';
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
            const convertedAmount = convertAmount(amount, currency);
            amountCell.textContent = `${convertedAmount} ${currency}`;
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






