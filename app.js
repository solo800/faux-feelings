// DOM elements
const searchInput = document.getElementById('feeling-input');

// Application state
let fauxFeelingsData = [];

// Load data from faux-feelings-worksheet.json
async function loadData() {
    try {
        const response = await fetch('faux-feelings-worksheet.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        fauxFeelingsData = await response.json();
        console.log('Data loaded successfully:', fauxFeelingsData.length, 'entries');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Search through faux feelings data
function searchFeelings(query) {
    if (!query.trim()) {
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const matchingEntries = [];
    
    fauxFeelingsData.forEach(entry => {
        // Check if query matches fauxFeeling
        if (entry.fauxFeeling.toLowerCase().includes(lowerQuery)) {
            matchingEntries.push(entry);
            return;
        }
        
        // Check if query matches any feeling in the feelings array
        if (entry.feelings && entry.feelings.some(feeling => feeling.toLowerCase().includes(lowerQuery))) {
            matchingEntries.push(entry);
        }
    });
    
    console.log('Matching entries for "' + query + '":', matchingEntries);
}

// Handle search input
searchInput.addEventListener('input', (e) => {
    searchFeelings(e.target.value);
});

// Initialize the application
loadData();
