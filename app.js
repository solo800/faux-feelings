// DOM elements
const searchInput = document.getElementById('feeling-input');
const clearButton = document.getElementById('clear-button');
const fauxFeelingsContainer = document.getElementById('faux-feelings-container');
const feelingsContainer = document.getElementById('feelings-container');
const needsContainer = document.getElementById('needs-container');

// Application state
let fauxFeelingsData = [];
let selectedFauxFeelings = new Set();

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
        fauxFeelingsContainer.innerHTML = '<p style="color: #e53e3e;">Error loading feelings data. Please refresh the page.</p>';
    }
}

// Search through faux feelings data
function searchFeelings(query) {
    if (!query.trim()) {
        renderFauxFeelings([]);
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
    renderFauxFeelings(matchingEntries);
}

// Render faux feelings chips
function renderFauxFeelings(matchingEntries) {
    fauxFeelingsContainer.innerHTML = '';
    
    // Create a Set to track which faux feelings we've already rendered
    const renderedFauxFeelings = new Set();
    
    // First, render selected faux feelings (they always show)
    selectedFauxFeelings.forEach(fauxFeeling => {
        const entry = fauxFeelingsData.find(e => e.fauxFeeling === fauxFeeling);
        if (entry) {
            const chip = document.createElement('div');
            chip.className = 'chip selected';
            chip.textContent = entry.fauxFeeling;
            chip.dataset.fauxFeeling = entry.fauxFeeling;
            
            chip.addEventListener('click', () => {
                toggleFauxFeeling(entry.fauxFeeling);
            });
            
            fauxFeelingsContainer.appendChild(chip);
            renderedFauxFeelings.add(entry.fauxFeeling);
        }
    });
    
    // Then, render matching unselected faux feelings
    matchingEntries.forEach(entry => {
        if (!renderedFauxFeelings.has(entry.fauxFeeling)) {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.textContent = entry.fauxFeeling;
            chip.dataset.fauxFeeling = entry.fauxFeeling;
            
            chip.addEventListener('click', () => {
                toggleFauxFeeling(entry.fauxFeeling);
            });
            
            fauxFeelingsContainer.appendChild(chip);
        }
    });
    
    // Show placeholder if nothing to display
    if (fauxFeelingsContainer.children.length === 0) {
        // Empty container will show CSS ::before placeholder
    }
}

// Toggle faux feeling selection
function toggleFauxFeeling(fauxFeeling) {
    if (selectedFauxFeelings.has(fauxFeeling)) {
        selectedFauxFeelings.delete(fauxFeeling);
    } else {
        selectedFauxFeelings.add(fauxFeeling);
    }
    
    // Re-render all sections
    searchFeelings(searchInput.value);
    renderFeelings();
    renderNeeds();
}

// Render feelings from selected faux feelings
function renderFeelings() {
    feelingsContainer.innerHTML = '';
    
    if (selectedFauxFeelings.size === 0) {
        return;
    }
    
    const allFeelings = new Set();
    
    selectedFauxFeelings.forEach(fauxFeeling => {
        const entry = fauxFeelingsData.find(e => e.fauxFeeling === fauxFeeling);
        if (entry && entry.feelings) {
            entry.feelings.forEach(feeling => allFeelings.add(feeling));
        }
    });
    
    allFeelings.forEach(feeling => {
        const chip = document.createElement('div');
        chip.className = 'chip non-interactive';
        chip.textContent = feeling;
        feelingsContainer.appendChild(chip);
    });
}

// Render needs from selected faux feelings
function renderNeeds() {
    needsContainer.innerHTML = '';
    
    if (selectedFauxFeelings.size === 0) {
        return;
    }
    
    const allNeeds = new Set();
    
    selectedFauxFeelings.forEach(fauxFeeling => {
        const entry = fauxFeelingsData.find(e => e.fauxFeeling === fauxFeeling);
        if (entry && entry.needs) {
            entry.needs.forEach(need => allNeeds.add(need));
        }
    });
    
    if (allNeeds.size > 0) {
        const needsList = document.createElement('div');
        needsList.className = 'needs-list';
        
        allNeeds.forEach(need => {
            const needTag = document.createElement('span');
            needTag.className = 'need-tag';
            needTag.textContent = need;
            needsList.appendChild(needTag);
        });
        
        needsContainer.appendChild(needsList);
    }
}

// Handle search input
searchInput.addEventListener('input', (e) => {
    const hasValue = e.target.value.length > 0;
    clearButton.classList.toggle('visible', hasValue);
    searchFeelings(e.target.value);
});

// Handle clear button
clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.classList.remove('visible');
    searchFeelings('');
    searchInput.focus();
});

// Initialize the application
loadData();
