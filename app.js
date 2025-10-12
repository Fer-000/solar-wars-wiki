// Firebase configuration - Replace with your own config
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, orderBy, limit, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration object - REPLACE WITH YOUR OWN
const firebaseConfig = {
  apiKey: "AIzaSyAVfYL9M5iibrFL8P4Klm35CyUslOxO5Ug",
  authDomain: "solar-wars-wiki.firebaseapp.com",
  projectId: "solar-wars-wiki",
  storageBucket: "solar-wars-wiki.firebasestorage.app",
  messagingSenderId: "200924544853",
  appId: "1:200924544853:web:25572513e0ee299d7979dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global state
let currentAuthor = null;
let currentPageId = null;
let allPages = [];
let allCategories = new Set();

// Login functionality
window.login = function() {
    const authorName = document.getElementById('authorNameInput').value.trim();
    if (authorName) {
        currentAuthor = authorName;
        localStorage.setItem('solarWarsAuthor', authorName);
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        document.getElementById('authorBadge').textContent = `👤 ${authorName}`;
        loadHomePage();
    } else {
        alert('Please enter your name');
    }
};

// Check if user is already logged in
function checkLogin() {
    const savedAuthor = localStorage.getItem('solarWarsAuthor');
    if (savedAuthor) {
        currentAuthor = savedAuthor;
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        document.getElementById('authorBadge').textContent = `👤 ${savedAuthor}`;
        loadHomePage();
    }
}

// Load home page
async function loadHomePage() {
    hideAllViews();
    document.getElementById('homeView').style.display = 'block';
    await loadAllPages();
    displayCategories();
    displayRecentPages();
}

window.showHome = loadHomePage;

// Load all pages from Firestore
async function loadAllPages() {
    try {
        const pagesSnapshot = await getDocs(collection(db, 'pages'));
        allPages = [];
        allCategories.clear();
        
        pagesSnapshot.forEach((doc) => {
            const page = { id: doc.id, ...doc.data() };
            allPages.push(page);
            
            // Collect categories
            if (page.categories && Array.isArray(page.categories)) {
                page.categories.forEach(cat => allCategories.add(cat.trim()));
            }
        });
        
        // Sort pages by last modified
        allPages.sort((a, b) => {
            const dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
            const dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Error loading pages:", error);
        alert('Error loading pages. Check console for details.');
    }
}

// Display categories with hierarchy
function displayCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    
    // Build category hierarchy
    const categoryTree = buildCategoryTree();
    
    // Check if "SW Guide" exists and display it first (pinned)
    const swGuideKey = Object.keys(categoryTree).find(key => 
        key.toLowerCase() === 'sw guide' || key.toLowerCase() === 'sw-guide'
    );
    
    if (swGuideKey) {
        const swGuide = categoryTree[swGuideKey];
        displaySingleCategory(swGuide, categoryList, [], true);
    }
    
    // Display remaining top-level categories (excluding SW Guide)
    displayCategoryLevel(categoryTree, categoryList, [], swGuideKey);
}

// Build a tree structure from flat categories
function buildCategoryTree() {
    const tree = {};
    
    Array.from(allCategories).forEach(category => {
        const parts = category.split('-');
        let current = tree;
        
        parts.forEach((part, index) => {
            if (!current[part]) {
                current[part] = {
                    name: part,
                    fullPath: parts.slice(0, index + 1).join('-'),
                    children: {},
                    pageCount: 0
                };
            }
            current = current[part].children;
        });
    });
    
    // Count pages for each category path
    allCategories.forEach(category => {
        const parts = category.split('-');
        let current = tree;
        
        parts.forEach((part) => {
            if (current[part]) {
                current[part].pageCount = allPages.filter(page => 
                    page.categories && page.categories.some(cat => cat.startsWith(current[part].fullPath))
                ).length;
                current = current[part].children;
            }
        });
    });
    
    return tree;
}

// Display a level of categories
function displayCategoryLevel(categoryObj, container, parentPath, excludeKey = null) {
    const categories = Object.values(categoryObj)
        .filter(cat => !excludeKey || cat.name !== categoryObj[excludeKey]?.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    categories.forEach(category => {
        displaySingleCategory(category, container, parentPath, false);
    });
}

// Display a single category card
function displaySingleCategory(category, container, parentPath, isPinned = false) {
    const card = document.createElement('div');
    card.className = isPinned ? 'category-card pinned-category' : 'category-card';
    
    const hasChildren = Object.keys(category.children).length > 0;
    const indent = parentPath.length;
    
    card.innerHTML = `
        <div class="category-header">
            ${isPinned ? '<span class="category-icon">📌</span>' : (hasChildren ? '<span class="category-icon">📁</span>' : '<span class="category-icon">📄</span>')}
            <h3 style="margin-left: ${indent * 20}px">${category.name}</h3>
        </div>
        <p class="count">${category.pageCount} page${category.pageCount !== 1 ? 's' : ''}</p>
    `;
    
    card.onclick = (e) => {
        e.stopPropagation();
        if (hasChildren) {
            toggleCategoryExpansion(card, category);
        } else {
            showCategoryPages(category.fullPath);
        }
    };
    
    container.appendChild(card);
}

// Toggle category expansion
function toggleCategoryExpansion(card, category) {
    const existingChildren = card.nextElementSibling;
    
    if (existingChildren && existingChildren.classList.contains('category-children')) {
        // Collapse
        existingChildren.remove();
        card.classList.remove('expanded');
    } else {
        // Expand
        const childContainer = document.createElement('div');
        childContainer.className = 'category-children';
        
        Object.values(category.children).sort((a, b) => 
            a.name.localeCompare(b.name)
        ).forEach(child => {
            const childCard = document.createElement('div');
            childCard.className = 'category-card subcategory';
            
            const hasGrandchildren = Object.keys(child.children).length > 0;
            
            childCard.innerHTML = `
                <div class="category-header">
                    ${hasGrandchildren ? '<span class="category-icon">📁</span>' : '<span class="category-icon">📄</span>'}
                    <h3>${child.name}</h3>
                </div>
                <p class="count">${child.pageCount} page${child.pageCount !== 1 ? 's' : ''}</p>
            `;
            
            childCard.onclick = (e) => {
                e.stopPropagation();
                if (hasGrandchildren) {
                    toggleCategoryExpansion(childCard, child);
                } else {
                    showCategoryPages(child.fullPath);
                }
            };
            
            childContainer.appendChild(childCard);
        });
        
        card.insertAdjacentElement('afterend', childContainer);
        card.classList.add('expanded');
    }
}

// Display recent pages
function displayRecentPages() {
    const recentList = document.getElementById('recentPagesList');
    recentList.innerHTML = '';
    
    const recentPages = allPages.slice(0, 10);
    
    recentPages.forEach(page => {
        const card = document.createElement('div');
        card.className = 'page-card';
        const categories = page.categories ? page.categories.join(', ') : 'Uncategorized';
        card.innerHTML = `
            <h3>${page.title}</h3>
            <p class="meta">📁 ${categories}</p>
        `;
        card.onclick = () => showPage(page.id);
        recentList.appendChild(card);
    });
}

// Show category pages with breadcrumb navigation
function showCategoryPages(categoryPath) {
    hideAllViews();
    const searchView = document.getElementById('searchView');
    searchView.style.display = 'block';
    
    // Build breadcrumb
    const parts = categoryPath.split('-');
    let breadcrumbHTML = '<div class="breadcrumb">';
    breadcrumbHTML += '<span class="breadcrumb-item" onclick="showHome()">🏠 Home</span>';
    
    let currentPath = '';
    parts.forEach((part, index) => {
        currentPath += (index > 0 ? '-' : '') + part;
        const isLast = index === parts.length - 1;
        
        if (isLast) {
            breadcrumbHTML += ` <span class="breadcrumb-separator">›</span> <span class="breadcrumb-item active">${part}</span>`;
        } else {
            const pathToNavigate = currentPath;
            breadcrumbHTML += ` <span class="breadcrumb-separator">›</span> <span class="breadcrumb-item" onclick="showCategoryPages('${pathToNavigate}')">${part}</span>`;
        }
    });
    breadcrumbHTML += '</div>';
    
    // Get pages that match this category or any subcategory
    const categoryPages = allPages.filter(page => 
        page.categories && page.categories.some(cat => cat.startsWith(categoryPath))
    );
    
    // Get direct subcategories
    const subcategories = Array.from(allCategories)
        .filter(cat => {
            const catParts = cat.split('-');
            const pathParts = categoryPath.split('-');
            // Subcategory must be exactly one level deeper
            return catParts.length === pathParts.length + 1 && 
                   cat.startsWith(categoryPath + '-');
        })
        .sort();
    
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = breadcrumbHTML + `<h2>${parts[parts.length - 1]}</h2>`;
    
    // Show subcategories
    if (subcategories.length > 0) {
        const subcatContainer = document.createElement('div');
        subcatContainer.className = 'subcategory-grid';
        subcatContainer.innerHTML = '<h3>Subcategories</h3>';
        
        const subcatGrid = document.createElement('div');
        subcatGrid.className = 'category-grid-inline';
        
        subcategories.forEach(subcat => {
            const subcatPages = allPages.filter(page => 
                page.categories && page.categories.some(cat => cat.startsWith(subcat))
            );
            
            const subcatName = subcat.split('-').pop();
            const card = document.createElement('div');
            card.className = 'category-card-small';
            card.innerHTML = `
                <div class="category-header">
                    <span class="category-icon">📁</span>
                    <h4>${subcatName}</h4>
                </div>
                <p class="count">${subcatPages.length} page${subcatPages.length !== 1 ? 's' : ''}</p>
            `;
            card.onclick = () => showCategoryPages(subcat);
            subcatGrid.appendChild(card);
        });
        
        subcatContainer.appendChild(subcatGrid);
        searchResults.appendChild(subcatContainer);
    }
    
    // Show pages directly in this category
    const directPages = allPages.filter(page => 
        page.categories && page.categories.includes(categoryPath)
    );
    
    if (directPages.length > 0) {
        const pagesHeader = document.createElement('h3');
        pagesHeader.textContent = 'Pages';
        pagesHeader.style.marginTop = '2rem';
        searchResults.appendChild(pagesHeader);
        
        directPages.forEach(page => {
            const card = document.createElement('div');
            card.className = 'page-card';
            card.innerHTML = `
                <h3>${page.title}</h3>
                <p class="meta">📁 ${page.categories.join(', ')}</p>
            `;
            card.onclick = () => showPage(page.id);
            searchResults.appendChild(card);
        });
    } else if (subcategories.length === 0) {
        searchResults.innerHTML += '<p class="no-results">No pages in this category yet.</p>';
    }
}

// Show specific page
async function showPage(pageId) {
    hideAllViews();
    document.getElementById('pageView').style.display = 'block';
    currentPageId = pageId;
    
    try {
        const pageDoc = await getDoc(doc(db, 'pages', pageId));
        if (pageDoc.exists()) {
            const page = pageDoc.data();
            document.getElementById('pageTitle').textContent = page.title;
            
            // Display subtitle if it exists
            const subtitleElement = document.getElementById('pageSubtitle');
            if (page.subtitle && page.subtitle.trim()) {
                subtitleElement.textContent = page.subtitle;
                subtitleElement.style.display = 'block';
            } else {
                subtitleElement.style.display = 'none';
            }
            
            // Display page slug/ID
            const pageSlug = page.pageSlug || generateSlug(page.title);
            document.getElementById('pageIdBadge').textContent = pageSlug;
            
            // Apply theme to page header too
            const pageHeader = document.getElementById('pageView').querySelector('.page-header');
            pageHeader.className = 'page-header';
            if (page.styleTheme && page.styleTheme !== 'default') {
                pageHeader.classList.add(`theme-${page.styleTheme}`);
            }
            
            // Display metadata in separate paragraphs
            let metaHTML = '';
            if (page.categories && page.categories.length > 0) {
                metaHTML += `<p><strong>Categories:</strong> ${page.categories.join(', ')}</p>`;
            }
            if (page.startDate) {
                const dateText = page.endDate ? 
                    `${formatDate(page.startDate)} - ${formatDate(page.endDate)}` : 
                    formatDate(page.startDate);
                metaHTML += `<p><strong>Date:</strong> ${dateText}</p>`;
            }
            if (page.contributors && page.contributors.length > 0) {
                metaHTML += `<p><strong>Contributors:</strong> ${page.contributors.join(', ')}</p>`;
            }
            document.getElementById('pageDate').innerHTML = metaHTML;
            
            // Apply theme to page content
            const pageContentDiv = document.getElementById('pageContent');
            pageContentDiv.className = 'page-content';
            if (page.styleTheme && page.styleTheme !== 'default') {
                pageContentDiv.classList.add(`theme-${page.styleTheme}`);
            }
            
            // Display content with wiki links
            pageContentDiv.innerHTML = parseWikiContent(page.content);
        }
    } catch (error) {
        console.error("Error loading page:", error);
        alert('Error loading page. Check console for details.');
    }
}

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Parse wiki content for links and markdown
function parseWikiContent(content) {
    if (!content) return '';
    
    // First, protect wiki links by temporarily replacing them with a unique marker
    const wikiLinks = [];
    let protectedContent = content.replace(/\[\[([^\]]+)\]\]/g, (match, pageRef) => {
        wikiLinks.push(pageRef.trim());
        return `{{WIKILINK:${wikiLinks.length - 1}}}`;
    });
    
    // Parse markdown using marked.js
    let parsed = marked.parse(protectedContent);
    
    // Restore wiki links with proper HTML
    parsed = parsed.replace(/\{\{WIKILINK:(\d+)\}\}/g, (match, index) => {
        const pageRef = wikiLinks[parseInt(index)];
        return `<a href="#" onclick="searchAndShowPageByRef('${pageRef.replace(/'/g, "\\'")}'); return false;" class="wiki-link">${pageRef}</a>`;
    });
    
    return parsed;
}

// Search and show page by reference (slug or title)
window.searchAndShowPageByRef = async function(pageRef) {
    await loadAllPages();
    
    // First try to find by slug
    let page = allPages.find(p => p.pageSlug === pageRef);
    
    // If not found, try by title (backward compatibility)
    if (!page) {
        page = allPages.find(p => p.title.toLowerCase() === pageRef.toLowerCase());
    }
    
    if (page) {
        showPage(page.id);
    } else {
        alert(`Page "${pageRef}" not found. Use the page ID shown in the corner of each page for reliable linking.`);
    }
};

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.length === 4) return dateStr; // Just year
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

// Search pages
window.searchPages = async function() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!searchTerm) return;
    
    await loadAllPages();
    hideAllViews();
    document.getElementById('searchView').style.display = 'block';
    
    const results = allPages.filter(page => 
        page.title.toLowerCase().includes(searchTerm) ||
        (page.content && page.content.toLowerCase().includes(searchTerm))
    );
    
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = `<h2>Search results for "${searchTerm}"</h2>`;
    
    if (results.length === 0) {
        searchResults.innerHTML += '<p>No pages found.</p>';
    } else {
        results.forEach(page => {
            const card = document.createElement('div');
            card.className = 'page-card';
            const categories = page.categories ? page.categories.join(', ') : 'Uncategorized';
            card.innerHTML = `
                <h3>${page.title}</h3>
                <p class="meta">📁 ${categories}</p>
            `;
            card.onclick = () => showPage(page.id);
            searchResults.appendChild(card);
        });
    }
};

// Show create page form
window.showCreatePage = function() {
    hideAllViews();
    document.getElementById('editorView').style.display = 'block';
    document.getElementById('editorTitle').textContent = 'Create New Page';
    document.getElementById('pageForm').reset();
    currentPageId = null;
};

// Edit current page
window.editCurrentPage = async function() {
    if (!currentPageId) return;
    
    hideAllViews();
    document.getElementById('editorView').style.display = 'block';
    document.getElementById('editorTitle').textContent = 'Edit Page';
    
    try {
        const pageDoc = await getDoc(doc(db, 'pages', currentPageId));
        if (pageDoc.exists()) {
            const page = pageDoc.data();
            document.getElementById('pageTitleInput').value = page.title;
            document.getElementById('pageSubtitleInput').value = page.subtitle || '';
            document.getElementById('pageCategoriesInput').value = page.categories ? page.categories.join(', ') : '';
            document.getElementById('pageStartDate').value = page.startDate || '';
            document.getElementById('pageEndDate').value = page.endDate || '';
            document.getElementById('pageStyleTheme').value = page.styleTheme || 'default';
            document.getElementById('pageContentInput').value = page.content || '';
        }
    } catch (error) {
        console.error("Error loading page for edit:", error);
        alert('Error loading page for editing. Check console for details.');
    }
};

// Save page
window.savePage = async function(event) {
    event.preventDefault();
    
    const title = document.getElementById('pageTitleInput').value.trim();
    const subtitle = document.getElementById('pageSubtitleInput').value.trim();
    const categoriesInput = document.getElementById('pageCategoriesInput').value.trim();
    const categories = categoriesInput ? categoriesInput.split(',').map(c => c.trim()) : [];
    const startDate = document.getElementById('pageStartDate').value.trim();
    const endDate = document.getElementById('pageEndDate').value.trim();
    const styleTheme = document.getElementById('pageStyleTheme').value;
    const content = document.getElementById('pageContentInput').value.trim();
    
    if (!title || !content) {
        alert('Title and content are required');
        return;
    }
    
    // Generate base slug from title
    const baseSlug = generateSlug(title);
    
    const pageData = {
        title,
        subtitle,
        categories,
        startDate,
        endDate,
        styleTheme,
        content,
        lastModified: new Date().toISOString()
    };
    
    try {
        if (currentPageId) {
            // Update existing page
            const pageDoc = await getDoc(doc(db, 'pages', currentPageId));
            const existingData = pageDoc.data();
            const contributors = existingData.contributors || [];
            if (!contributors.includes(currentAuthor)) {
                contributors.push(currentAuthor);
            }
            pageData.contributors = contributors;
            pageData.createdBy = existingData.createdBy;
            pageData.createdAt = existingData.createdAt;
            pageData.pageSlug = existingData.pageSlug; // Keep existing slug
            
            await updateDoc(doc(db, 'pages', currentPageId), pageData);
            alert('Page updated successfully!');
            showPage(currentPageId);
        } else {
            // Create new page - check for duplicate slugs
            await loadAllPages();
            let finalSlug = baseSlug;
            let counter = 1;
            
            while (allPages.some(p => p.pageSlug === finalSlug)) {
                finalSlug = `${baseSlug}-${counter}`;
                counter++;
            }
            
            pageData.pageSlug = finalSlug;
            pageData.createdBy = currentAuthor;
            pageData.contributors = [currentAuthor];
            pageData.createdAt = new Date().toISOString();
            
            console.log('Attempting to save page with data:', pageData);
            const docRef = await addDoc(collection(db, 'pages'), pageData);
            console.log('Page created with ID:', docRef.id);
            alert(`Page created successfully! Page ID: ${finalSlug}`);
            showPage(docRef.id);
        }
    } catch (error) {
        console.error("Error saving page:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Full error:", JSON.stringify(error, null, 2));
        
        // More specific error messages
        if (error.code === 'permission-denied') {
            alert('Permission denied: Please check your Firestore security rules.\n\nGo to Firebase Console > Firestore Database > Rules\nand ensure write permissions are enabled for the "pages" collection.');
        } else if (error.code === 'invalid-argument') {
            alert('Invalid data: One of the fields contains an invalid value. Check the browser console for details.');
        } else {
            alert(`Error saving page: ${error.message}\n\nCheck console for more details.`);
        }
    }
};

// Delete current page
window.deleteCurrentPage = async function() {
    if (!currentPageId) return;
    
    // Get page title for confirmation
    try {
        const pageDoc = await getDoc(doc(db, 'pages', currentPageId));
        if (!pageDoc.exists()) {
            alert('Page not found');
            return;
        }
        
        const pageTitle = pageDoc.data().title;
        
        // Confirm deletion
        const confirmed = confirm(`Are you sure you want to delete "${pageTitle}"?\n\nThis action cannot be undone.`);
        
        if (confirmed) {
            await deleteDoc(doc(db, 'pages', currentPageId));
            alert('Page deleted successfully');
            currentPageId = null;
            loadHomePage();
        }
    } catch (error) {
        console.error("Error deleting page:", error);
        alert('Error deleting page. Check console for details.');
    }
};

// Cancel edit
window.cancelEdit = function() {
    if (currentPageId) {
        showPage(currentPageId);
    } else {
        loadHomePage();
    }
};

// Show timeline
window.showTimeline = async function() {
    await loadAllPages();
    hideAllViews();
    document.getElementById('timelineView').style.display = 'block';
    
    // Populate category filter
    const filterSelect = document.getElementById('timelineCategoryFilter');
    filterSelect.innerHTML = '<option value="">All Categories</option>';
    Array.from(allCategories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filterSelect.appendChild(option);
    });
    
    displayTimeline();
};

// Filter timeline
window.filterTimeline = function() {
    displayTimeline();
};

// Display timeline
function displayTimeline() {
    const filterCategory = document.getElementById('timelineCategoryFilter').value;
    
    // Filter pages with dates
    let timelinePages = allPages.filter(page => page.startDate);
    
    if (filterCategory) {
        timelinePages = timelinePages.filter(page => 
            page.categories && page.categories.includes(filterCategory)
        );
    }
    
    // Sort by start date
    timelinePages.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateA - dateB;
    });
    
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '<div class="timeline-line"></div>';
    
    if (timelinePages.length === 0) {
        container.innerHTML += '<p style="text-align: center; color: var(--text-secondary);">No events found for timeline.</p>';
        return;
    }
    
    timelinePages.forEach(page => {
        const event = document.createElement('div');
        event.className = 'timeline-event';
        
        const dateDisplay = page.endDate ? 
            `${formatDate(page.startDate)} - ${formatDate(page.endDate)}` : 
            formatDate(page.startDate);
        
        const categoriesHTML = page.categories ? 
            page.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('') : '';
        
        const subtitleHTML = page.subtitle && page.subtitle.trim() ? 
            `<p class="timeline-subtitle">${page.subtitle}</p>` : '';
        
        event.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <h3>${page.title}</h3>
                ${subtitleHTML}
                <p class="date">${dateDisplay}</p>
                <div class="categories">${categoriesHTML}</div>
            </div>
        `;
        
        event.querySelector('.timeline-content').onclick = () => showPage(page.id);
        container.appendChild(event);
    });
}

// Hide all views
function hideAllViews() {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
}

// Initialize on load
checkLogin();

// Add Enter key support for search
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPages();
            }
        });
    }
    
    const authorInput = document.getElementById('authorNameInput');
    if (authorInput) {
        authorInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});
