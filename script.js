document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
});

function initApp() {
    // Load items from localStorage
    loadItems();
    
    // Set up event listeners
    document.getElementById('bucket-item-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('search-btn').addEventListener('click', filterItems);
    document.getElementById('search-input').addEventListener('keyup', filterItems);
    document.getElementById('status-filter').addEventListener('change', filterItems);
    document.getElementById('type-filter').addEventListener('change', filterItems);
    document.getElementById('tag-filter').addEventListener('change', filterItems);
    document.getElementById('tier-filter').addEventListener('change', filterItems);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
    document.getElementById('export-btn').addEventListener('click', exportToCSV);
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
    document.getElementById('tag-input').addEventListener('keyup', updateTagsPreview);
    
    // New file operation listeners
    document.getElementById('save-file-btn').addEventListener('click', saveToFile);
    document.getElementById('load-file-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', loadFromFile);
    
    // Initialize filter dropdowns
    updateFilterOptions();
    updateBudgetSummary();
}

// Data management
let items = [];
let editItemId = null;

// Tier budget limits (in Rupiah)
const tierBudgets = {
    essential: 50000000,
    functional: 100000000,
    "nice-to-have": 250000000,
    peak: 500000000,
    luxury: 1000000000
};

// Tier display names
const tierDisplayNames = {
    essential: "🟢 Essential / Bare Bones",
    functional: "🔵 Functional Upgrade",
    "nice-to-have": "🟡 Nice-to-Have",
    peak: "🟣 Peak - Dim Return",
    luxury: "🟠 Luxury Item"
};

function loadItems() {
    const storedItems = localStorage.getItem('bucketListItems');
    if (storedItems) {
        items = JSON.parse(storedItems);
        renderItems();
        updateBudgetSummary();
    }
}

function saveItems() {
    localStorage.setItem('bucketListItems', JSON.stringify(items));
    updateFilterOptions();
    updateBudgetSummary();
    updateFileStatus('Data saved to browser storage.');
}

function updateFilterOptions() {
    // Update type filter
    const typeFilter = document.getElementById('type-filter');
    const typeSuggestions = document.getElementById('type-suggestions');
    updateFilterWithUniqueValues(items, 'type', typeFilter, typeSuggestions);
    
    // Update tag filter
    const tagFilter = document.getElementById('tag-filter');
    updateTagFilter(items, tagFilter);
}

function updateFilterWithUniqueValues(items, property, filterElement, datalistElement) {
    const uniqueValues = [...new Set(items.map(item => item[property]).filter(value => value))];
    
    // Clear existing options except the first one (All)
    while (filterElement.options.length > 1) {
        filterElement.remove(1);
    }
    
    // Clear datalist
    datalistElement.innerHTML = '';
    
    // Add new options
    uniqueValues.forEach(value => {
        // Add to filter dropdown
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        filterElement.appendChild(option);
        
        // Add to datalist for suggestions
        const datalistOption = document.createElement('option');
        datalistOption.value = value;
        datalistElement.appendChild(datalistOption);
    });
}

function updateTagFilter(items, filterElement) {
    // Get all unique tags from all items
    const allTags = [];
    items.forEach(item => {
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                if (!allTags.includes(tag)) {
                    allTags.push(tag);
                }
            });
        }
    });
    
    // Clear existing options except the first one (All)
    while (filterElement.options.length > 1) {
        filterElement.remove(1);
    }
    
    // Add new options
    allTags.sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        filterElement.appendChild(option);
    });
}

function updateTagsPreview() {
    const tagInput = document.getElementById('tag-input');
    const tagsContainer = document.getElementById('tags-preview');
    const tags = tagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    tagsContainer.innerHTML = '';
    
    tags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            ${tag}
            <span class="tag-remove" data-tag="${tag}">&times;</span>
        `;
        tagsContainer.appendChild(tagElement);
    });
    
    // Add event listeners to remove buttons
    const removeButtons = tagsContainer.querySelectorAll('.tag-remove');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tagToRemove = this.getAttribute('data-tag');
            const updatedTags = tags.filter(tag => tag !== tagToRemove);
            tagInput.value = updatedTags.join(', ');
            updateTagsPreview();
        });
    });
}

// Form handling
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Process tags
    const tagInput = document.getElementById('tag-input');
    const tags = tagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    const formData = {
        name: document.getElementById('name').value,
        status: document.getElementById('status').value,
        type: document.getElementById('type').value,
        tags: tags,
        tier: document.getElementById('tier').value,
        price: document.getElementById('price').value ? parseFloat(document.getElementById('price').value) : 0,
        link: document.getElementById('link').value,
        notes: document.getElementById('notes').value
    };
    
    if (editItemId !== null) {
        // Update existing item
        updateItem(editItemId, formData);
    } else {
        // Add new item
        addItem(formData);
    }
    
    // Reset form
    document.getElementById('bucket-item-form').reset();
    document.getElementById('tags-preview').innerHTML = '';
    cancelEdit();
}

function addItem(itemData) {
    const newItem = {
        id: Date.now().toString(),
        ...itemData
    };
    
    items.push(newItem);
    saveItems();
    renderItems();
}

function updateItem(id, itemData) {
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
        items[index] = { id, ...itemData };
        saveItems();
        renderItems();
    }
}

function cancelEdit() {
    editItemId = null;
    document.getElementById('bucket-item-form').reset();
    document.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-plus"></i> Add Item';
    document.getElementById('cancel-edit').style.display = 'none';
    document.getElementById('tags-preview').innerHTML = '';
}

function startEditItem(id) {
    const item = items.find(item => item.id === id);
    if (item) {
        editItemId = id;
        
        // Fill form with item data
        document.getElementById('name').value = item.name || '';
        document.getElementById('status').value = item.status || 'want';
        document.getElementById('type').value = item.type || '';
        document.getElementById('tier').value = item.tier || 'essential';
        document.getElementById('price').value = item.price || '';
        document.getElementById('link').value = item.link || '';
        document.getElementById('notes').value = item.notes || '';
        
        // Fill tags
        document.getElementById('tag-input').value = item.tags ? item.tags.join(', ') : '';
        updateTagsPreview();
        
        // Change button text and show cancel button
        document.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Update Item';
        document.getElementById('cancel-edit').style.display = 'inline-block';
        
        // Scroll to form
        document.querySelector('.item-form').scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        items = items.filter(item => item.id !== id);
        saveItems();
        renderItems();
    }
}

// Budget Summary Functions
function updateBudgetSummary() {
    // Calculate total spent per tier
    const tierTotals = {
        essential: 0,
        functional: 0,
        "nice-to-have": 0,
        peak: 0,
        luxury: 0
    };
    
    items.forEach(item => {
        if (item.tier && tierTotals.hasOwnProperty(item.tier)) {
            tierTotals[item.tier] += item.price || 0;
        }
    });
    
    // Update each tier's display
    for (const tier in tierTotals) {
        const totalSpent = tierTotals[tier];
        const budgetLimit = tierBudgets[tier];
        const remaining = budgetLimit - totalSpent;
        
        const remainingElement = document.getElementById(`${tier}-remaining`);
        
        if (remainingElement) {
            if (remaining >= 0) {
                remainingElement.innerHTML = `<span class="budget-under">Remaining: Rp. ${formatCurrency(remaining)}</span>`;
            } else {
                remainingElement.innerHTML = `<span class="budget-over">Over budget: Rp. ${formatCurrency(Math.abs(remaining))}</span>`;
            }
        }
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// Rendering
function renderItems(itemsToRender = items) {
    const container = document.getElementById('items-container');
    
    if (itemsToRender.length === 0) {
        container.innerHTML = '<div class="no-items">No items found. Add some items to your bucket list!</div>';
        return;
    }
    
    container.innerHTML = itemsToRender.map(item => {
        // Check if this item exceeds its tier budget
        const tierTotal = items
            .filter(i => i.tier === item.tier)
            .reduce((sum, i) => sum + (i.price || 0), 0);
        
        const isOverBudget = tierTotal > tierBudgets[item.tier];
        const budgetWarning = isOverBudget ? '<div class="budget-warning"><i class="fas fa-exclamation-triangle"></i> Over Budget</div>' : '';
        
        return `
            <div class="item-card tier-${item.tier}" data-id="${item.id}">
                <div class="item-header">
                    <div class="item-name">${item.name}</div>
                    <span class="item-status status-${item.status}">${item.status}</span>
                </div>
                ${budgetWarning}
                <div class="item-details">
                    ${item.type ? `<div class="item-detail"><span class="detail-label">Type:</span> ${item.type}</div>` : ''}
                    ${item.tier ? `<div class="item-detail"><span class="detail-label">Tier:</span> ${tierDisplayNames[item.tier] || item.tier}</div>` : ''}
                    ${item.price ? `<div class="item-detail"><span class="detail-label">Price:</span> Rp. ${formatCurrency(item.price)}</div>` : ''}
                    ${item.link ? `<div class="item-detail"><span class="detail-label">Link:</span> <a href="${item.link}" target="_blank">View</a></div>` : ''}
                    ${item.notes ? `<div class="item-detail"><span class="detail-label">Notes:</span> ${item.notes}</div>` : ''}
                </div>
                ${item.tags && item.tags.length > 0 ? `
                    <div class="item-detail">
                        <span class="detail-label">Tags:</span>
                        <div class="item-tags">
                            ${item.tags.map(tag => `<span class="item-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="item-actions">
                    <button class="btn" onclick="startEditItem('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger" onclick="deleteItem('${item.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Filtering
function filterItems() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const tagFilter = document.getElementById('tag-filter').value;
    const tierFilter = document.getElementById('tier-filter').value;
    
    const filteredItems = items.filter(item => {
        // Search term filter
        const matchesSearch = searchTerm === '' || 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.notes && item.notes.toLowerCase().includes(searchTerm)) ||
            (item.type && item.type.toLowerCase().includes(searchTerm)) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        
        // Status filter
        const matchesStatus = statusFilter === '' || item.status === statusFilter;
        
        // Type filter
        const matchesType = typeFilter === '' || item.type === typeFilter;
        
        // Tag filter
        const matchesTag = tagFilter === '' || (item.tags && item.tags.includes(tagFilter));
        
        // Tier filter
        const matchesTier = tierFilter === '' || item.tier === tierFilter;
        
        return matchesSearch && matchesStatus && matchesType && matchesTag && matchesTier;
    });
    
    renderItems(filteredItems);
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('type-filter').value = '';
    document.getElementById('tag-filter').value = '';
    document.getElementById('tier-filter').value = 'essential'; // Default to essential
    
    renderItems();
}

// Export functionality
function exportToCSV() {
    if (items.length === 0) {
        alert('No items to export!');
        return;
    }
    
    // Define CSV headers
    const headers = ['Name', 'Status', 'Type', 'Tags', 'Tier', 'Price', 'Link', 'Notes'];
    
    // Convert items to CSV rows
    const csvRows = [headers.join(',')];
    
    items.forEach(item => {
        const row = [
            escapeCSV(item.name || ''),
            escapeCSV(item.status || ''),
            escapeCSV(item.type || ''),
            escapeCSV(item.tags ? item.tags.join('; ') : ''),
            escapeCSV(item.tier || ''),
            item.price || 0,
            escapeCSV(item.link || ''),
            escapeCSV(item.notes || '')
        ];
        
        csvRows.push(row.join(','));
    });
    
    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bucket-list.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeCSV(value) {
    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

// File operations
function saveToFile() {
    if (items.length === 0) {
        alert('No items to save!');
        return;
    }
    
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bucket-list-data.json');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    updateFileStatus('Data saved to file: bucket-list-data.json');
}

function loadFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileContents = e.target.result;
            const fileData = JSON.parse(fileContents);
            
            if (Array.isArray(fileData)) {
                items = fileData;
                saveItems();
                renderItems();
                updateFileStatus(`Data loaded from: ${file.name}`);
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            console.error('Error loading file:', error);
            updateFileStatus('Error loading file. Please make sure the file contains valid JSON data.');
            alert('Error loading file. Please make sure the file contains valid JSON data.');
        }
    };
    reader.readAsText(file);
    
    // Reset the file input
    event.target.value = '';
}

function updateFileStatus(message) {
    document.getElementById('file-status').textContent = message;
}