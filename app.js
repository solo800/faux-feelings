// DOM elements
const searchInput = document.getElementById('feeling-input');
const clearButton = document.getElementById('clear-button');
const fauxFeelingsContainer = document.getElementById('faux-feelings-container');
const feelingsContainer = document.getElementById('feelings-container');
const needsContainer = document.getElementById('needs-container');

// Tab elements
const tabBtnSearch = document.getElementById('tab-btn-search');
const tabBtnVisualization = document.getElementById('tab-btn-visualization');
const tabSearch = document.getElementById('tab-search');
const tabVisualization = document.getElementById('tab-visualization');
const selectionBadge = document.getElementById('selection-badge');

// Application state
let fauxFeelingsData = [];
let selectedFauxFeelings = new Set();
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

// Search through faux feelings data
function searchFeelings(query) {
    if (!query.trim()) {
        renderFauxFeelings([]);
        return;
    }

    const lowerQuery = query.toLowerCase();
    let matchingEntries = [];

    // First pass: direct match (current behavior)
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

    // Second pass: synonym expansion (if no direct matches)
    if (matchingEntries.length === 0) {
        const expandedTerms = getExpandedTerms(lowerQuery);

        fauxFeelingsData.forEach(entry => {
            // Check if any expanded term matches fauxFeeling
            if (expandedTerms.some(term => entry.fauxFeeling.toLowerCase().includes(term))) {
                matchingEntries.push(entry);
                return;
            }

            // Check if any expanded term matches any feeling
            if (entry.feelings && entry.feelings.some(feeling =>
                expandedTerms.some(term => feeling.toLowerCase().includes(term)))) {
                matchingEntries.push(entry);
            }
        });
    }

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
    updateSelectionBadge();

    // Update visualization if on visualization tab
    if (tabVisualization.classList.contains('active')) {
        renderSankey();
    }
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

// Build Sankey diagram data from selected faux feelings
function buildSankeyData() {
    // Return empty structure if nothing selected
    if (selectedFauxFeelings.size === 0) {
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

        // Process feelings
        if (entry.feelings) {
            entry.feelings.forEach(feeling => {
                // Add feeling node
                const feelingId = `feeling-${feeling}`;
                if (!nodeIds.has(feelingId)) {
                    nodes.push({ id: feelingId, name: feeling, type: 'feeling' });
                    nodeIds.add(feelingId);
                }

                // Add link from faux feeling to feeling (use ||| as delimiter)
                const linkKey1 = `${fauxId}|||${feelingId}`;
                linkMap.set(linkKey1, (linkMap.get(linkKey1) || 0) + 1);

                // Process needs - link from this feeling to all needs
                if (entry.needs) {
                    entry.needs.forEach(need => {
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
    switchTab('visualization');
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
