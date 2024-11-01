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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


async function loadTrips() {
    const tripSelect = document.getElementById('trip');
    tripSelect.innerHTML = '<option value="">Select a trip</option>';

    try {
        const tripsRef = collection(db, "trips");
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
    } catch (error) {
        console.error("Error loading trips:", error);
    }
}

Chart.register(ChartDataLabels);


// Add this function to initialize the chart
function initializeChart() {
    console.log('Initializing chart...');
    
    const ctx = document.getElementById('spendingChart');
    if (!ctx) {
        console.error('Cannot find chart canvas element');
        return;
    }

    try {
        // Destroy existing chart if it exists
        if (expenseChart) {
            expenseChart.destroy();
        }

        // Create empty chart with default config
        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',   // Blue
                        'rgba(231, 76, 60, 0.8)',    // Red
                        'rgba(46, 204, 113, 0.8)',   // Green
                        'rgba(155, 89, 182, 0.8)',   // Purple
                        'rgba(241, 196, 15, 0.8)',   // Yellow
                        'rgba(149, 165, 166, 0.8)'   // Gray
                    ],
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        display: true,
                        labels: {
                            color: 'black',
                            font: {
                                size: 12
                            }
                        }
                    },
                    datalabels: {
                        color: 'white',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: (value, ctx) => {
                            if (value === 0) return '';
                            const total = ctx.dataset.data.reduce((acc, data) => acc + data, 0);
                            const percentage = ((value * 100) / total).toFixed(1);
                            return percentage + '%';
                        }
                    }
                }
            }
        });
        
        console.log('Chart initialized successfully');
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

// Function to load trip budget and expenses
async function loadTripData(tripId) {
    try {
        // Get trip data including budget
        const tripRef = doc(db, "trips", tripId);
        const tripDoc = await getDoc(tripRef);
        
        if (tripDoc.exists()) {
            const tripData = tripDoc.data();
            // Set budget from trip data
            totalBudget = tripData.budget || 0;
            document.getElementById('budget').value = totalBudget;
            
            // Show the expense form and dashboard
            expenseCard.style.display = 'block';
            dashboardSection.style.display = 'block';
            
            // Update dashboard with initial values
            updateDashboard();
        } else {
            console.log("No trip found with ID:", tripId);
            return;
        }

        // Set up expenses listener
        const expensesRef = collection(db, "expenses");
        const q = query(expensesRef, where("tripId", "==", tripId));

        // Clear existing expenses
        expenses.length = 0;
        totalSpending = 0;

        // Set up real-time listener for expenses
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Clear existing expenses before adding new ones
            expenses.length = 0;
            totalSpending = 0;

            snapshot.forEach((doc) => {
                const expense = {
                    id: doc.id,
                    ...doc.data()
                };
                expenses.push(expense);
                totalSpending += Number(expense.amount); // Ensure amount is treated as a number
            });

            // Sort expenses by date (most recent first)
            expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Log current state
            console.log('Current expenses:', expenses);
            console.log('Total spending:', totalSpending);
            console.log('Total budget:', totalBudget);

            // Update UI elements
            updateDashboard();
            updateExpenseChart(getFilteredExpenses());
            updateRecentTransactionsTable();

            // Show/hide transactions container based on whether there are expenses
            recentTransactionsContainer.style.display = expenses.length ? 'block' : 'none';
        }, (error) => {
            console.error("Error getting expenses:", error);
        });

        // Return unsubscribe function to clean up listener when needed
        return unsubscribe;

    } catch (error) {
        console.error("Error in loadTripData:", error);
        alert('Error loading trip data. Please try again.');
    }

    function updateAllVisualizations() {
        updateDashboard();
        const filteredExpenses = getFilteredExpenses();
        console.log('Filtered expenses for chart:', filteredExpenses);
        updateExpenseChart(filteredExpenses);
        updateRecentTransactionsTable();
    }
}


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

    if (!currentTripId) {
        alert('Please select a trip first');
        return;
    }

    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;

    try {
        if (isEditMode && currentEditIndex !== null) {
            // Update existing expense
            const expenseId = expenses[currentEditIndex].id;
            await updateDoc(doc(db, "expenses", expenseId), {
                date,
                amount,
                category,
                description,
                updatedAt: new Date()
            });
        } else {
            // Add new expense
            const expenseData = {
                tripId: currentTripId,
                date,
                amount,
                category,
                description,
                createdAt: new Date()
            };
            
            console.log('Adding new expense:', expenseData); // Debug log
            
            await addDoc(collection(db, "expenses"), expenseData);
        }

        expenseForm.reset();
        isEditMode = false;
        currentEditIndex = null;
        expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
    } catch (error) {
        console.error("Error managing expense:", error);
        alert('Error saving expense: ' + error.message);
    }
});

// Reset edit mode on form reset
expenseForm.addEventListener('reset', function() {
    isEditMode = false;
    currentEditIndex = null;
    expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
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
    
    const selectedTripId = document.getElementById('trip').value;
    if (!selectedTripId) {
        alert('Please select a trip');
        return;
    }

    totalBudget = parseFloat(document.getElementById('budget').value);
    
    try {
        // Update trip document with budget
        await updateDoc(doc(db, "trips", selectedTripId), {
            budget: totalBudget
        });

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
function updateExpenseChart(expensesToChart) {
    console.log('Updating expense chart with data:', expensesToChart);

    // Initialize chart if it doesn't exist
    if (!expenseChart) {
        initializeChart();
    }

    const categoryTotals = {};

    // Calculate totals for each category
    expensesToChart.forEach(expense => {
        const amount = Number(expense.amount) || 0;
        const category = expense.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    console.log('Category totals:', categoryTotals);

    // Only update chart if we have data
    if (Object.keys(categoryTotals).length > 0) {
        expenseChart.data.labels = Object.keys(categoryTotals);
        expenseChart.data.datasets[0].data = Object.values(categoryTotals);
        expenseChart.update();
        console.log('Chart updated with new data');
    } else {
        console.log('No expense data to display');
        // Show empty state
        expenseChart.data.labels = ['No Expenses'];
        expenseChart.data.datasets[0].data = [1];
        expenseChart.update();
    }
}

// Date Range Filtering for Chart
function getFilteredExpenses() {
    const selectedRange = dateRange.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expenses.filter(expense => {
        if (!expense.date) return false;

        const expenseDate = new Date(expense.date);
        if (isNaN(expenseDate.getTime())) return false;

        expenseDate.setHours(0, 0, 0, 0);

        switch(selectedRange) {
            case 'today':
                return expenseDate.getTime() === today.getTime();
            case 'week': {
                const oneWeekAgo = new Date(today);
                oneWeekAgo.setDate(today.getDate() - 6);
                return expenseDate >= oneWeekAgo && expenseDate <= today;
            }
            case 'month': {
                const oneMonthAgo = new Date(today);
                oneMonthAgo.setMonth(today.getMonth() - 1);
                return expenseDate >= oneMonthAgo && expenseDate <= today;
            }
            default:
                return true; // Show all expenses if no date range selected
        }
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

async function deleteTransaction(index) {
    try {
        const expenseId = expenses[index].id;
        await deleteDoc(doc(db, "expenses", expenseId));
        // No need to update UI here as the onSnapshot listener will handle it
    } catch (error) {
        console.error("Error deleting expense:", error);
        alert('Error deleting expense');
    }
}


document.addEventListener('DOMContentLoaded', function() { //on load
    loadTrips();
    initializeChart(); 

    document.getElementById('trip').addEventListener('change', async function(e) {
        const selectedTripId = e.target.value;

        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }
    
        if (selectedTripId) {
            currentTripId = selectedTripId;
            
            try {
                const tripRef = doc(db, "trips", selectedTripId);
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
});









