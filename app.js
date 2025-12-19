// DOM elements
const searchInput = document.getElementById('feeling-input');
const clearButton = document.getElementById('clear-button');
const fauxFeelingsContainer = document.getElementById('faux-feelings-container');
const feelingsContainer = document.getElementById('feelings-container');
const needsContainer = document.getElementById('needs-container');
const modal = document.getElementById('feeling-modal');
const modalMessage = document.getElementById('modal-message');
const modalFauxFeelingsContainer = document.getElementById('modal-faux-feelings');
const modalClose = document.querySelector('.modal-close');

// Visualization tab elements
const vizFauxFeelingsContainer = document.getElementById('viz-faux-feelings-container');
const vizFeelingsContainer = document.getElementById('viz-feelings-container');
const vizNeedsContainer = document.getElementById('viz-needs-container');

// Tab elements
const tabBtnSearch = document.getElementById('tab-btn-search');
const tabBtnVisualization = document.getElementById('tab-btn-visualization');
const tabSearch = document.getElementById('tab-search');
const tabVisualization = document.getElementById('tab-visualization');
const selectionBadge = document.getElementById('selection-badge');

// Application state
let fauxFeelingsData = [];
let selectedFauxFeelings = new Set();
let selectedFeelings = new Set(); // User-selected feelings
let selectedNeeds = new Set(); // User-selected needs
let unselectedMatchingFauxFeelings = new Set(); // Unselected faux feelings that match search
let feelingSynonyms = {};

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

// Load synonyms from feeling-synonyms.json
async function loadSynonyms() {
    try {
        const response = await fetch('feeling-synonyms.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        feelingSynonyms = await response.json();
        console.log('Synonyms loaded successfully:', Object.keys(feelingSynonyms).length, 'words');
    } catch (error) {
        console.warn('Synonyms not loaded:', error);
        // Graceful degradation: search still works without synonyms
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Remove active class from all tabs
    tabBtnSearch.classList.remove('active');
    tabBtnVisualization.classList.remove('active');
    tabSearch.classList.remove('active');
    tabVisualization.classList.remove('active');
    
    // Add active class to selected tab
    if (tabName === 'search') {
        tabBtnSearch.classList.add('active');
        tabSearch.classList.add('active');
    } else if (tabName === 'visualization') {
        tabBtnVisualization.classList.add('active');
        tabVisualization.classList.add('active');
    }
}

// Update the selection badge count
function updateSelectionBadge() {
    const count = selectedFauxFeelings.size;
    selectionBadge.textContent = count;

    if (count > 0) {
        selectionBadge.classList.remove('hidden');
    } else {
        selectionBadge.classList.add('hidden');
    }
}

// Check if visualization should be enabled
function checkVisualizationEnabled() {
    const hasFauxFeeling = selectedFauxFeelings.size > 0;

    if (hasFauxFeeling) {
        tabBtnVisualization.disabled = false;
        tabBtnVisualization.classList.remove('disabled');
    } else {
        tabBtnVisualization.disabled = true;
        tabBtnVisualization.classList.add('disabled');
    }
}

// Check if a feeling matches any selected faux feeling (case-insensitive)
function doesFeelingMatchFauxFeeling(feeling) {
    const feelingLower = feeling.toLowerCase();
    return Array.from(selectedFauxFeelings).some(fauxFeeling =>
        fauxFeeling.toLowerCase() === feelingLower
    );
}

// Get all unique feelings from data and synonyms
function getAllFeelings() {
    const feelings = new Set();

    // Add all feelings from faux feelings data
    fauxFeelingsData.forEach(entry => {
        if (entry.feelings) {
            entry.feelings.forEach(feeling => feelings.add(feeling.toLowerCase()));
        }
    });

    // Add all canonical words and synonyms
    Object.entries(feelingSynonyms).forEach(([canonical, synonyms]) => {
        feelings.add(canonical.toLowerCase());
        synonyms.forEach(syn => feelings.add(syn.toLowerCase()));
    });

    return Array.from(feelings);
}

// Find which canonical word a feeling maps to (if any)
function getCanonicalFeeling(feeling) {
    const lowerFeeling = feeling.toLowerCase();

    // Check if it's already a canonical word
    if (feelingSynonyms[lowerFeeling]) {
        return lowerFeeling;
    }

    // Check if it's a synonym of any canonical word
    for (const [canonical, synonyms] of Object.entries(feelingSynonyms)) {
        if (synonyms.map(s => s.toLowerCase()).includes(lowerFeeling)) {
            return canonical;
        }
    }

    return null;
}

// Get all synonyms for a feeling (including the canonical word)
function getSynonymsForFeeling(feeling) {
    const canonical = getCanonicalFeeling(feeling);
    if (!canonical) return [feeling];

    return [canonical, ...feelingSynonyms[canonical]].map(f => f.toLowerCase());
}

// Get expanded search terms using synonyms
function getExpandedTerms(query) {
    const terms = [query];

    // Check if query is a synonym of any canonical word
    for (const [canonical, synonyms] of Object.entries(feelingSynonyms)) {
        if (synonyms.includes(query) || canonical === query) {
            // Add canonical word and all synonyms
            terms.push(canonical, ...synonyms);
            break;
        }
    }

    return [...new Set(terms)]; // deduplicate
}

// Search and rank feelings based on query
function searchAndRankFeelings(query) {
    if (!query.trim()) {
        return [];
    }

    const lowerQuery = query.toLowerCase();
    const allFeelings = getAllFeelings();

    // Track feelings by rank (1 = best match, 4 = weakest match)
    const ranked = {
        1: new Set(), // Prefix matches
        2: new Set(), // Synonyms of prefix matches
        3: new Set(), // Substring matches
        4: new Set()  // Synonyms of substring matches
    };

    // Find prefix and substring matches
    const prefixMatches = [];
    const substringMatches = [];

    allFeelings.forEach(feeling => {
        if (feeling.startsWith(lowerQuery)) {
            prefixMatches.push(feeling);
            ranked[1].add(feeling);
        } else if (feeling.includes(lowerQuery)) {
            substringMatches.push(feeling);
            ranked[3].add(feeling);
        }
    });

    // Add synonyms of prefix matches
    prefixMatches.forEach(feeling => {
        const synonyms = getSynonymsForFeeling(feeling);
        synonyms.forEach(syn => {
            if (!ranked[1].has(syn)) {
                ranked[2].add(syn);
            }
        });
    });

    // Add synonyms of substring matches
    substringMatches.forEach(feeling => {
        const synonyms = getSynonymsForFeeling(feeling);
        synonyms.forEach(syn => {
            if (!ranked[1].has(syn) && !ranked[2].has(syn) && !ranked[3].has(syn)) {
                ranked[4].add(syn);
            }
        });
    });

    // Combine all ranked results in order
    const results = [
        ...Array.from(ranked[1]),
        ...Array.from(ranked[2]),
        ...Array.from(ranked[3]),
        ...Array.from(ranked[4])
    ];

    return results;
}

// Search for both feelings and faux feelings based on query
function searchFeelings(query) {
    if (!query.trim()) {
        // Clear search results
        renderFeelingsResults([]);
        unselectedMatchingFauxFeelings.clear();
        renderFauxFeelingsDisplay();
        return;
    }

    const lowerQuery = query.toLowerCase();

    // Search for matching feelings
    const matchingFeelings = searchAndRankFeelings(query);
    console.log('Matching feelings for "' + query + '":', matchingFeelings);

    // Search for direct faux feeling matches
    const matchingFauxFeelings = fauxFeelingsData.filter(entry =>
        entry.fauxFeeling.toLowerCase().includes(lowerQuery)
    );

    // Update unselected matching faux feelings
    unselectedMatchingFauxFeelings.clear();
    matchingFauxFeelings.forEach(entry => {
        if (!selectedFauxFeelings.has(entry.fauxFeeling)) {
            unselectedMatchingFauxFeelings.add(entry.fauxFeeling);
        }
    });

    console.log('Matching faux feelings for "' + query + '":', Array.from(unselectedMatchingFauxFeelings));

    // Render both
    renderFeelingsResults(matchingFeelings);
    renderFauxFeelingsDisplay();
}

// Render feelings search results as chips in feelings-container
function renderFeelingsResults(feelings) {
    feelingsContainer.innerHTML = '';

    if (feelings.length === 0) {
        return;
    }

    // Filter out feelings that match selected faux feelings
    const filteredFeelings = feelings.filter(feeling => !doesFeelingMatchFauxFeeling(feeling));

    if (filteredFeelings.length === 0) {
        return;
    }

    filteredFeelings.forEach(feeling => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = feeling;
        chip.dataset.feeling = feeling;

        // Just show modal, don't track selection in search tab
        chip.addEventListener('click', () => {
            showFeelingModalForSelection(feeling);
        });

        feelingsContainer.appendChild(chip);
    });
}

// Show modal for feeling selection (no tracking in search tab)
function showFeelingModalForSelection(feeling) {
    // Get all synonyms for the selected feeling
    const synonyms = getSynonymsForFeeling(feeling);

    // Find all faux feelings that include any synonym of the selected feeling
    const matchingFauxFeelings = fauxFeelingsData.filter(entry => {
        if (!entry.feelings) return false;
        return entry.feelings.some(f =>
            synonyms.includes(f.toLowerCase())
        );
    });

    // Show modal with options
    showFeelingModal(feeling, matchingFauxFeelings);
}

// Show modal dialog for selecting faux feelings
function showFeelingModal(feeling, fauxFeelingEntries) {
    // Set modal message
    modalMessage.textContent = `Great start, "${feeling}" is real. Now let's trace it back to a faux feeling. Which of these resonates most with you?`;

    // Clear and populate modal faux feelings
    modalFauxFeelingsContainer.innerHTML = '';

    // Filter out entries where the faux feeling name matches the selected feeling
    const feelingLower = feeling.toLowerCase();
    const filteredEntries = fauxFeelingEntries.filter(entry =>
        entry.fauxFeeling.toLowerCase() !== feelingLower
    );

    filteredEntries.forEach(entry => {
        const chip = document.createElement('div');
        chip.className = 'chip';

        // Highlight if already selected
        if (selectedFauxFeelings.has(entry.fauxFeeling)) {
            chip.classList.add('selected');
        }

        chip.textContent = entry.fauxFeeling;
        chip.dataset.fauxFeeling = entry.fauxFeeling;

        chip.addEventListener('click', () => {
            toggleFauxFeeling(entry.fauxFeeling);
            // Update chip appearance in modal
            chip.classList.toggle('selected');
        });

        modalFauxFeelingsContainer.appendChild(chip);
    });

    // Show modal
    modal.classList.remove('hidden');
}

// Close modal
function closeModal() {
    modal.classList.add('hidden');
}

// Render faux feelings display (selected + unselected matches)
function renderFauxFeelingsDisplay() {
    fauxFeelingsContainer.innerHTML = '';

    // First, render selected faux feelings
    selectedFauxFeelings.forEach(fauxFeeling => {
        const chip = document.createElement('div');
        chip.className = 'chip selected';
        chip.textContent = fauxFeeling;
        chip.dataset.fauxFeeling = fauxFeeling;

        chip.addEventListener('click', () => {
            toggleFauxFeeling(fauxFeeling);
        });

        fauxFeelingsContainer.appendChild(chip);
    });

    // Then, render unselected matching faux feelings
    unselectedMatchingFauxFeelings.forEach(fauxFeeling => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = fauxFeeling;
        chip.dataset.fauxFeeling = fauxFeeling;

        chip.addEventListener('click', () => {
            toggleFauxFeeling(fauxFeeling);
        });

        fauxFeelingsContainer.appendChild(chip);
    });
}

// Toggle faux feeling selection
function toggleFauxFeeling(fauxFeeling) {
    const wasSelected = selectedFauxFeelings.has(fauxFeeling);

    if (wasSelected) {
        selectedFauxFeelings.delete(fauxFeeling);
        // If it was a match from search, add it back to unselected matches
        if (searchInput.value.trim()) {
            const lowerQuery = searchInput.value.toLowerCase();
            const entry = fauxFeelingsData.find(e => e.fauxFeeling === fauxFeeling);
            if (entry && entry.fauxFeeling.toLowerCase().includes(lowerQuery)) {
                unselectedMatchingFauxFeelings.add(fauxFeeling);
            }
        }
    } else {
        selectedFauxFeelings.add(fauxFeeling);
        // Remove from unselected matches if it was there
        unselectedMatchingFauxFeelings.delete(fauxFeeling);

        // If this faux feeling name matches any selected feelings, deselect those feelings
        const fauxFeelingLower = fauxFeeling.toLowerCase();
        Array.from(selectedFeelings).forEach(feeling => {
            if (feeling.toLowerCase() === fauxFeelingLower) {
                selectedFeelings.delete(feeling);
            }
        });
    }

    // Re-render faux feelings display
    renderFauxFeelingsDisplay();

    // Re-render feelings to apply filter (if search is active)
    if (searchInput.value.trim()) {
        const matchingFeelings = searchAndRankFeelings(searchInput.value);
        renderFeelingsResults(matchingFeelings);
    }

    // Render needs from all selected faux feelings
    renderNeeds();
    updateSelectionBadge();
    checkVisualizationEnabled();

    // Update visualization if on visualization tab
    if (tabVisualization.classList.contains('active')) {
        renderVisualizationControls();
        renderSankey();
    }
}

// Render needs from selected faux feelings as read-only chips
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
            const needChip = document.createElement('div');
            needChip.className = 'chip non-interactive';
            needChip.textContent = need;
            needChip.dataset.need = need;

            needsList.appendChild(needChip);
        });

        needsContainer.appendChild(needsList);
    }
}

// Handle search input
searchInput.addEventListener('input', (e) => {
    const hasValue = e.target.value.length > 0;
    clearButton.classList.toggle('visible', hasValue);

    // When user starts typing, clear non-selected items
    if (hasValue) {
        // Search will update unselectedMatchingFauxFeelings
        searchFeelings(e.target.value);
    } else {
        // Clear everything when input is empty
        renderFeelingsResults([]);
        unselectedMatchingFauxFeelings.clear();
        renderFauxFeelingsDisplay();
    }
});

// Handle clear button
clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.classList.remove('visible');
    renderFeelingsResults([]);
    unselectedMatchingFauxFeelings.clear();
    renderFauxFeelingsDisplay();
    searchInput.focus();
});

// Handle modal close button
modalClose.addEventListener('click', closeModal);

// Handle clicking outside modal to close
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Render visualization controls in viz tab
function renderVisualizationControls() {
    renderVizFauxFeelings();
    renderVizFeelings();
    renderVizNeeds();
}

// Render selected faux feelings in viz tab (read-only display)
function renderVizFauxFeelings() {
    vizFauxFeelingsContainer.innerHTML = '';

    if (selectedFauxFeelings.size === 0) {
        vizFauxFeelingsContainer.innerHTML = '<p style="color: #a0aec0; font-style: italic;">No faux feelings selected</p>';
        return;
    }

    selectedFauxFeelings.forEach(fauxFeeling => {
        const chip = document.createElement('div');
        chip.className = 'chip non-interactive selected';
        chip.textContent = fauxFeeling;
        vizFauxFeelingsContainer.appendChild(chip);
    });
}

// Render available feelings for selection in viz tab
function renderVizFeelings() {
    vizFeelingsContainer.innerHTML = '';

    if (selectedFauxFeelings.size === 0) {
        return;
    }

    const availableFeelings = new Set();

    // Collect all feelings from selected faux feelings
    selectedFauxFeelings.forEach(fauxFeeling => {
        const entry = fauxFeelingsData.find(e => e.fauxFeeling === fauxFeeling);
        if (entry && entry.feelings) {
            entry.feelings.forEach(feeling => {
                // Skip if feeling matches a faux feeling name
                if (!doesFeelingMatchFauxFeeling(feeling)) {
                    availableFeelings.add(feeling);
                }
            });
        }
    });

    if (availableFeelings.size === 0) {
        vizFeelingsContainer.innerHTML = '<p style="color: #a0aec0; font-style: italic;">No feelings available</p>';
        return;
    }

    Array.from(availableFeelings).sort().forEach(feeling => {
        const chip = document.createElement('div');
        chip.className = 'chip';

        if (selectedFeelings.has(feeling)) {
            chip.classList.add('selected');
        }

        chip.textContent = feeling;
        chip.dataset.feeling = feeling;

        chip.addEventListener('click', () => {
            toggleVizFeeling(feeling);
        });

        vizFeelingsContainer.appendChild(chip);
    });
}

// Render available needs for selection in viz tab
function renderVizNeeds() {
    vizNeedsContainer.innerHTML = '';

    if (selectedFauxFeelings.size === 0) {
        return;
    }

    const availableNeeds = new Set();

    // Collect all needs from selected faux feelings
    selectedFauxFeelings.forEach(fauxFeeling => {
        const entry = fauxFeelingsData.find(e => e.fauxFeeling === fauxFeeling);
        if (entry && entry.needs) {
            entry.needs.forEach(need => availableNeeds.add(need));
        }
    });

    if (availableNeeds.size === 0) {
        vizNeedsContainer.innerHTML = '<p style="color: #a0aec0; font-style: italic;">No needs available</p>';
        return;
    }

    Array.from(availableNeeds).sort().forEach(need => {
        const chip = document.createElement('div');
        chip.className = 'chip';

        if (selectedNeeds.has(need)) {
            chip.classList.add('selected');
        }

        chip.textContent = need;
        chip.dataset.need = need;

        chip.addEventListener('click', () => {
            toggleVizNeed(need);
        });

        vizNeedsContainer.appendChild(chip);
    });
}

// Toggle feeling selection in viz tab
function toggleVizFeeling(feeling) {
    if (selectedFeelings.has(feeling)) {
        selectedFeelings.delete(feeling);
    } else {
        selectedFeelings.add(feeling);
    }

    renderVizFeelings();
    renderSankey();
}

// Toggle need selection in viz tab
function toggleVizNeed(need) {
    if (selectedNeeds.has(need)) {
        selectedNeeds.delete(need);
    } else {
        selectedNeeds.add(need);
    }

    renderVizNeeds();
    renderSankey();
}

// Build Sankey diagram data from selected items only
function buildSankeyData() {
    // Return empty structure if not all three types are selected
    if (selectedFauxFeelings.size === 0 || selectedFeelings.size === 0 || selectedNeeds.size === 0) {
        return { nodes: [], links: [] };
    }

    const nodes = [];
    const nodeIds = new Set();
    const linkMap = new Map(); // Track link counts using "source|||target" as key

    // Iterate through selected faux feelings
    selectedFauxFeelings.forEach(fauxFeeling => {
        const entry = fauxFeelingsData.find(e => e.fauxFeeling === fauxFeeling);
        if (!entry) return;

        // Add faux feeling node
        const fauxId = `faux-${fauxFeeling}`;
        if (!nodeIds.has(fauxId)) {
            nodes.push({ id: fauxId, name: fauxFeeling, type: 'faux' });
            nodeIds.add(fauxId);
        }

        // Process only selected feelings that are in this entry
        if (entry.feelings) {
            entry.feelings.forEach(feeling => {
                const feelingLower = feeling.toLowerCase();

                // Skip if this feeling matches any selected faux feeling
                if (doesFeelingMatchFauxFeeling(feeling)) return;

                // Only include if this feeling (or its synonyms) is selected
                const synonyms = getSynonymsForFeeling(feelingLower);
                const isSelected = Array.from(selectedFeelings).some(selectedFeeling =>
                    synonyms.includes(selectedFeeling.toLowerCase())
                );

                if (!isSelected) return;

                // Add feeling node
                const feelingId = `feeling-${feeling}`;
                if (!nodeIds.has(feelingId)) {
                    nodes.push({ id: feelingId, name: feeling, type: 'feeling' });
                    nodeIds.add(feelingId);
                }

                // Add link from faux feeling to feeling
                const linkKey1 = `${fauxId}|||${feelingId}`;
                linkMap.set(linkKey1, (linkMap.get(linkKey1) || 0) + 1);

                // Process only selected needs
                if (entry.needs) {
                    entry.needs.forEach(need => {
                        // Only include if this need is selected
                        if (!selectedNeeds.has(need)) return;

                        // Add need node
                        const needId = `need-${need}`;
                        if (!nodeIds.has(needId)) {
                            nodes.push({ id: needId, name: need, type: 'need' });
                            nodeIds.add(needId);
                        }

                        // Add link from feeling to need
                        const linkKey2 = `${feelingId}|||${needId}`;
                        linkMap.set(linkKey2, (linkMap.get(linkKey2) || 0) + 1);
                    });
                }
            });
        }
    });

    // Convert link map to links array
    const links = [];
    linkMap.forEach((value, key) => {
        const [source, target] = key.split('|||');
        links.push({ source, target, value });
    });

    return { nodes, links };
}

// Render Sankey diagram
function renderSankey() {
    const data = buildSankeyData();
    const svg = d3.select('#sankey-svg');
    const emptyState = document.querySelector('#visualization-container .empty-state');

    // Clear existing content
    svg.selectAll('*').remove();

    // Show empty state if no data
    if (data.nodes.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    // Hide empty state
    emptyState.classList.add('hidden');

    // Detect viewport and choose orientation
    const isMobile = window.innerWidth < 768;

    // Get SVG dimensions
    const container = document.getElementById('visualization-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = 20;

    // Configure sankey
    const sankey = d3.sankey()
        .nodeId(d => d.id)
        .nodeWidth(20)
        .nodePadding(10)
        .nodeAlign(d3.sankeyCenter)
        .extent([[margin, margin], [width - margin, height - margin]]);

    // Apply sankey layout to data
    const graph = sankey(data);

    // Set SVG dimensions explicitly
    svg.attr('width', width).attr('height', height);

    // Create link path generator
    const linkHorizontal = d3.sankeyLinkHorizontal();

    // Create links (paths)
    const link = svg.append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(graph.links)
        .join('path')
        .attr('d', d => {
            if (isMobile) {
                // Vertical: manually create bezier path with swapped coordinates
                // For top-to-bottom flow
                const x0 = (d.source.y0 + d.source.y1) / 2;  // Center x of source
                const y0 = d.source.x1;                      // Bottom edge of source
                const x1 = (d.target.y0 + d.target.y1) / 2;  // Center x of target
                const y1 = d.target.x0;                      // Top edge of target

                // Control points for smooth vertical curve
                const yi = d3.interpolateNumber(y0, y1);
                const cy0 = yi(0.5);  // Control point y for source
                const cy1 = yi(0.5);  // Control point y for target

                return `M${x0},${y0} C${x0},${cy0} ${x1},${cy1} ${x1},${y1}`;
            } else {
                // Horizontal: standard left-to-right
                return linkHorizontal(d);
            }
        })
        .attr('stroke', '#cbd5e0')
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('fill', 'none')
        .attr('opacity', 0.5);

    // Create nodes (rectangles)
    const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('rect')
        .data(graph.nodes)
        .join('rect')
        .attr('x', d => isMobile ? d.y0 : d.x0)
        .attr('y', d => isMobile ? d.x0 : d.y0)
        .attr('width', d => isMobile ? (d.y1 - d.y0) : (d.x1 - d.x0))
        .attr('height', d => isMobile ? (d.x1 - d.x0) : (d.y1 - d.y0))
        .attr('fill', d => {
            if (d.type === 'faux') return '#7ba8c1';
            if (d.type === 'feeling') return '#9cb5a4';
            if (d.type === 'need') return '#c4a882';
            return '#cbd5e0';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

    // Add labels
    const label = svg.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(graph.nodes)
        .join('text')
        .attr('x', d => {
            if (isMobile) {
                // Vertical: center horizontally
                return (d.y0 + d.y1) / 2;
            } else {
                // Horizontal: position based on side
                return d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6;
            }
        })
        .attr('y', d => {
            if (isMobile) {
                // Vertical: position above or below
                return d.x0 < height / 2 ? d.x0 - 6 : d.x1 + 12;
            } else {
                // Horizontal: center vertically
                return (d.y0 + d.y1) / 2;
            }
        })
        .attr('text-anchor', d => {
            if (isMobile) {
                return 'middle';
            } else {
                return d.x0 < width / 2 ? 'start' : 'end';
            }
        })
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#2d3748')
        .text(d => d.name);
}

// Handle tab button clicks
tabBtnSearch.addEventListener('click', () => {
    switchTab('search');
});

tabBtnVisualization.addEventListener('click', () => {
    // Don't switch if button is disabled
    if (tabBtnVisualization.disabled) {
        return;
    }
    switchTab('visualization');
    renderVisualizationControls();
    renderSankey();
});

// Handle window resize to redraw Sankey with correct orientation
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (tabVisualization.classList.contains('active')) {
            renderSankey();
        }
    }, 250);
});

// Initialize the application
loadData();
loadSynonyms();
updateSelectionBadge();
checkVisualizationEnabled(); // Disable visualization button initially
