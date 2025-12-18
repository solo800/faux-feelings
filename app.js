// Application state
let fauxFeelingsData = [];
let selectedChips = new Set();
let allUniqueFeelings = new Set();

// DOM elements
const searchInput = document.getElementById('feeling-input');
const clearButton = document.getElementById('clear-button');
const chipsContainer = document.getElementById('chips-container');
const selectedDisplay = document.getElementById('selected-display');

// Load data from faux-feelings-worksheet.json
async function loadData() {
    try {
        const response = await fetch('faux-feelings-worksheet.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        fauxFeelingsData = await response.json();
        
        // Extract all unique feelings from the feelings arrays
        fauxFeelingsData.forEach(item => {
            if (item.feelings) {
                item.feelings.forEach(feeling => {
                    allUniqueFeelings.add(feeling);
                });
            }
        });
        
        renderChips();
        updateNeedsDisplay();
    } catch (error) {
        console.error('Error loading data:', error);
        chipsContainer.innerHTML = '<p style="color: #e53e3e;">Error loading feelings data. Please refresh the page.</p>';
    }
}

// Filter feelings based on search query
function filterFeelings(query) {
    if (!query.trim()) {
        return [];
    }
    const lowerQuery = query.toLowerCase();
    const matchingFeelings = [];
    
    // Search through all unique feelings
    allUniqueFeelings.forEach(feeling => {
        if (feeling.toLowerCase().includes(lowerQuery)) {
            matchingFeelings.push(feeling);
        }
    });
    
    // Also search through faux feelings
    fauxFeelingsData.forEach(item => {
        if (item.fauxFeeling.toLowerCase().includes(lowerQuery)) {
            matchingFeelings.push(item.fauxFeeling);
        }
    });
    
    return matchingFeelings;
}

// Render chips in the results section
function renderChips() {
    const query = searchInput.value;
    const matchingFeelings = filterFeelings(query);

    // Clear container
    chipsContainer.innerHTML = '';

    // Create a Set to track which feelings we've already rendered
    const renderedFeelings = new Set();

    // First, render selected chips
    selectedChips.forEach(feelingName => {
        const chip = createChip(feelingName, true);
        chipsContainer.appendChild(chip);
        renderedFeelings.add(feelingName);
    });

    // Then, render matching unselected chips
    matchingFeelings.forEach(feeling => {
        if (!renderedFeelings.has(feeling)) {
            const chip = createChip(feeling, false);
            chipsContainer.appendChild(chip);
        }
    });

    // Show message if no results and no selected chips
    if (chipsContainer.children.length === 0) {
        if (query.trim()) {
            chipsContainer.innerHTML = '<p style="color: #a0aec0; font-style: italic;">No matching feelings found. Try a different search.</p>';
        } else {
            chipsContainer.innerHTML = '<p style="color: #a0aec0; font-style: italic;">Start typing to search for feelings...</p>';
        }
    }
}

// Create a chip element
function createChip(feelingName, isSelected) {
    const chip = document.createElement('div');
    chip.className = isSelected ? 'chip selected' : 'chip';
    chip.textContent = feelingName;
    chip.dataset.feelingName = feelingName;

    chip.addEventListener('click', () => {
        toggleChipSelection(feelingName);
    });

    return chip;
}

// Toggle chip selection
function toggleChipSelection(feelingName) {
    if (selectedChips.has(feelingName)) {
        selectedChips.delete(feelingName);
    } else {
        selectedChips.add(feelingName);
    }
    renderChips();
    updateNeedsDisplay();
}

// Update the needs display section
function updateNeedsDisplay() {
    if (selectedChips.size === 0) {
        selectedDisplay.innerHTML = '';
        return;
    }

    // Collect all unique needs from selected feelings
    const allNeeds = new Set();

    selectedChips.forEach(feelingName => {
        // Check if it's a faux feeling
        const fauxFeeling = fauxFeelingsData.find(f => f.fauxFeeling === feelingName);
        if (fauxFeeling && fauxFeeling.needs) {
            fauxFeeling.needs.forEach(need => allNeeds.add(need));
        } else {
            // It's a regular feeling, find all faux feelings that contain it
            fauxFeelingsData.forEach(item => {
                if (item.feelings && item.feelings.includes(feelingName)) {
                    if (item.needs) {
                        item.needs.forEach(need => allNeeds.add(need));
                    }
                }
            });
        }
    });

    // Build the display HTML
    let html = '<div class="needs-title">Underlying Needs:</div>';

    if (allNeeds.size > 0) {
        html += '<div class="needs-list">';
        allNeeds.forEach(need => {
            html += `<span class="need-tag">${need}</span>`;
        });
        html += '</div>';
    } else {
        html += '<p style="color: #a0aec0; font-style: italic;">No needs data available for selected feelings.</p>';
    }

    selectedDisplay.innerHTML = html;
}

// Handle search input
searchInput.addEventListener('input', (e) => {
    const hasValue = e.target.value.length > 0;
    clearButton.classList.toggle('visible', hasValue);
    renderChips();
});

// Handle clear button
clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.classList.remove('visible');
    renderChips();
    searchInput.focus();
});

// Initialize the application
loadData();
