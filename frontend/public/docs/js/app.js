/* ==========================================================================
   MP-MLA SaaS Platform Documentation - Interactive Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  initSidebar();
  initTOCScrollSpy();
  initLightbox();
  initCopyCode();
});

/* --------------------------------------------------------------------------
   1. Theme Management (Light / Dark mode toggle)
   -------------------------------------------------------------------------- */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('mp_mla_doc_theme') || 'dark';

  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('mp_mla_doc_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = theme === 'dark' 
      ? '☀️' 
      : '🌙';
    themeToggleBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
  }
}

/* --------------------------------------------------------------------------
   2. Search Engine & Interactive Search Modal (Ctrl + K)
   -------------------------------------------------------------------------- */
let searchIndex = [];

function initSearch() {
  const searchModalOverlay = document.getElementById('searchModalOverlay');
  const searchTriggerBtn = document.getElementById('searchTriggerBtn');
  const searchInput = document.getElementById('searchInput');
  const searchResultsContainer = document.getElementById('searchResults');

  // Build search index from DOM sections
  const sections = document.querySelectorAll('.doc-section');
  sections.forEach(section => {
    const id = section.id;
    const titleEl = section.querySelector('h2');
    const title = titleEl ? titleEl.innerText : '';
    const paragraphs = Array.from(section.querySelectorAll('p, li')).map(el => el.innerText).join(' ');
    
    if (id && title) {
      searchIndex.push({
        id: id,
        title: title,
        content: paragraphs
      });
    }
  });

  const openSearch = () => {
    if (searchModalOverlay) {
      searchModalOverlay.classList.add('active');
      setTimeout(() => searchInput && searchInput.focus(), 100);
    }
  };

  const closeSearch = () => {
    if (searchModalOverlay) {
      searchModalOverlay.classList.remove('active');
    }
  };

  if (searchTriggerBtn) searchTriggerBtn.addEventListener('click', openSearch);
  
  if (searchModalOverlay) {
    searchModalOverlay.addEventListener('click', (e) => {
      if (e.target === searchModalOverlay) closeSearch();
    });
  }

  // Keyboard shortcut Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      closeSearch();
      closeLightbox();
    }
  });

  // Perform Live Search Query
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        searchResultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Type to start searching...</div>';
        return;
      }

      const results = searchIndex.filter(item => 
        item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query)
      );

      if (results.length === 0) {
        searchResultsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No documentation matches found for "${query}"</div>`;
      } else {
        searchResultsContainer.innerHTML = results.map(res => {
          const matchIndex = res.content.toLowerCase().indexOf(query);
          let snippet = res.content.substring(Math.max(0, matchIndex - 40), matchIndex + 100);
          if (matchIndex > 40) snippet = '...' + snippet;
          snippet += '...';

          return `
            <a href="#${res.id}" class="search-result-item" onclick="document.getElementById('searchModalOverlay').classList.remove('active')">
              <div class="search-result-title">${res.title}</div>
              <div class="search-result-snippet">${snippet}</div>
            </a>
          `;
        }).join('');
      }
    });
  }
}

/* --------------------------------------------------------------------------
   3. Sidebar & Mobile Drawer Toggle
   -------------------------------------------------------------------------- */
function initSidebar() {
  const mobileToggleBtn = document.getElementById('mobileToggleBtn');
  const sidebar = document.getElementById('sidebar');

  if (mobileToggleBtn && sidebar) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // Smooth click & highlight sidebar links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('active');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   4. Table of Contents (TOC) & ScrollSpy
   -------------------------------------------------------------------------- */
function initTOCScrollSpy() {
  const tocList = document.getElementById('tocList');
  const sections = document.querySelectorAll('.doc-section');
  
  if (!tocList || sections.length === 0) return;

  // Build TOC dynamically
  tocList.innerHTML = '';
  sections.forEach(section => {
    const h2 = section.querySelector('h2');
    if (h2 && section.id) {
      const li = document.createElement('li');
      li.className = 'toc-item';
      li.innerHTML = `<a href="#${section.id}" class="toc-link" data-id="${section.id}">${h2.innerText.replace(/^[^\w\s]+/, '').trim()}</a>`;
      tocList.appendChild(li);
    }
  });

  // Intersection Observer for Active TOC Link
  const observerOptions = {
    root: null,
    rootMargin: '-80px 0px -60% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.toc-link').forEach(link => {
          link.classList.toggle('active', link.getAttribute('data-id') === id);
        });
        document.querySelectorAll('.nav-link').forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));
}

/* --------------------------------------------------------------------------
   5. Image Lightbox Zoom Modal
   -------------------------------------------------------------------------- */
function initLightbox() {
  const images = document.querySelectorAll('.screenshot-img');
  const lightboxOverlay = document.createElement('div');
  lightboxOverlay.className = 'lightbox-modal';
  lightboxOverlay.id = 'lightboxOverlay';
  lightboxOverlay.innerHTML = '<img class="lightbox-img" id="lightboxImg" src="" alt="Enlarged Screenshot" />';
  document.body.appendChild(lightboxOverlay);

  images.forEach(img => {
    img.addEventListener('click', () => {
      const lightboxImg = document.getElementById('lightboxImg');
      lightboxImg.src = img.src;
      lightboxOverlay.classList.add('active');
    });
  });

  lightboxOverlay.addEventListener('click', closeLightbox);
}

function closeLightbox() {
  const lightboxOverlay = document.getElementById('lightboxOverlay');
  if (lightboxOverlay) lightboxOverlay.classList.remove('active');
}

/* --------------------------------------------------------------------------
   6. Copy Code Snippet Button
   -------------------------------------------------------------------------- */
function initCopyCode() {
  const codeBlocks = document.querySelectorAll('pre');
  codeBlocks.forEach(block => {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'search-shortcut';
    copyBtn.style.position = 'absolute';
    copyBtn.style.right = '10px';
    copyBtn.style.top = '10px';
    copyBtn.style.cursor = 'pointer';
    copyBtn.innerText = 'Copy';

    block.style.position = 'relative';
    block.appendChild(copyBtn);

    copyBtn.addEventListener('click', () => {
      const code = block.querySelector('code') ? block.querySelector('code').innerText : block.innerText;
      navigator.clipboard.writeText(code);
      copyBtn.innerText = 'Copied!';
      setTimeout(() => copyBtn.innerText = 'Copy', 2000);
    });
  });
}
