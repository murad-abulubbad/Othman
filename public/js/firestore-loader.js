import { db, collection, query, orderBy, getDocs } from '../firebase.js';

// ════ FIRESTORE DYNAMIC LOADER ════
// Fetches Categories + Items from Firestore.
// Builds sections-nav and all product sections dynamically.

async function loadFirestoreData() {
  try {
    // Fetch Categories (ordered by createdAt asc)
    const categoriesQuery = query(collection(db, 'Categories'), orderBy('createdAt', 'asc'));
    const categoriesSnapshot = await getDocs(categoriesQuery);
    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch Items (ordered by createdAt desc)
    const itemsQuery = query(collection(db, 'Items'), orderBy('createdAt', 'desc'));
    const itemsSnapshot = await getDocs(itemsQuery);
    const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Build nav cards in #sections-grid
    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid) {
      sectionsGrid.innerHTML = categories.map(cat => `
        <a href="#cat-${cat.id}" class="section-card">
          <div class="section-card-icon">🎮</div>
          <div class="section-card-title">${cat.name}</div>
          <div class="section-card-platform">${cat.platform || ''}</div>
        </a>
      `).join('');
    }

    // Build dynamic sections in #dynamic-sections
    const dynamicSections = document.getElementById('dynamic-sections');
    if (dynamicSections) {
      dynamicSections.innerHTML = categories.map(cat => {
        const categoryItems = items.filter(item => item.categoryID === cat.id);
        const itemsHtml = categoryItems.map(item => ({
          name: item.name,
          img: item.imageUrl,
          price: item.discountPrice || item.originalPrice,
          priceLabel: item.discountPrice && item.originalPrice 
            ? `<span style="text-decoration:line-through;opacity:0.6;font-size:0.8em">${item.originalPrice}</span> ${item.discountPrice}` 
            : '',
          genre: item.genre,
          condition: item.condition || 'مستعمل',
          trailer: item.videoTrailerUrl,
          platform: cat.platform
        }));

        return `
          <section id="cat-${cat.id}" class="dynamic-category-section">
            <h2 class="section-title">${cat.name} <span>${cat.platform || ''}</span></h2>
            <div class="section-line"></div>
            <div class="games-grid" id="grid-cat-${cat.id}"></div>
          </section>
        `;
      }).join('');

      // Render items for each category
      categories.forEach(cat => {
        const categoryItems = items.filter(item => item.categoryID === cat.id);
        const formattedItems = categoryItems.map(item => ({
          name: item.name,
          img: item.imageUrl,
          price: item.discountPrice || item.originalPrice,
          priceLabel: item.discountPrice && item.originalPrice 
            ? `<span style="text-decoration:line-through;opacity:0.6;font-size:0.8em">${item.originalPrice}</span> ${item.discountPrice}` 
            : '',
          genre: item.genre,
          condition: item.condition || 'مستعمل',
          trailer: item.videoTrailerUrl
        }));
        
        if (formattedItems.length > 0) {
          renderGameGrid(`grid-cat-${cat.id}`, formattedItems, cat.platform);
        }
      });
    }

    // Store category titles for page navigation
    window._catPageTitles = {};
    categories.forEach(cat => {
      window._catPageTitles[`cat-${cat.id}`] = cat.name;
    });

  } catch (error) {
    console.error('Error loading Firestore data:', error);
  }
}

// Load data when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFirestoreData);
} else {
  loadFirestoreData();
}
