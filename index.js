// ══════════════ STATE ══════════════
const DEFAULT_PASS = 'jania2025';
let adminPassword = localStorage.getItem('adminPass') || DEFAULT_PASS;
let isLoggedIn = false;
let blogPosts = JSON.parse(localStorage.getItem('blogPosts') || '[]');
let siteImages = JSON.parse(localStorage.getItem('siteImages') || '{}');
let currentBlogFilter = 'all';
let editingPostId = null;

// Sample starter post
if (blogPosts.length === 0) {
  blogPosts = [{
    id: 'post-1',
    title: 'Welcome to EcoHub & The Girl Charge — Our Story Begins',
    category: 'general',
    excerpt: 'A new digital home for two powerful movements changing the lives of young Cameroonians.',
    content: `We are thrilled to launch this unified platform bringing together two incredible missions under one roof.

EcoHub has been on a mission since 2024 to train the next generation of climate leaders — and in under a year, we've already reached over 1,000 young advocates. The journey has been remarkable, and this platform marks a new chapter in how we connect, train, and inspire youth across Cameroon.

The Girl Charge, founded in 2025, has quickly built a community of over 1,500 young girls in the Northwest region. Every day, we see girls stepping into their power — discovering their voice, building skills, and daring to dream bigger.

This website is our new home, our hub, and our megaphone. Here you'll find stories from the field, resources for young changemakers, updates on our programs, and ways to get involved.

We believe deeply that young people — especially young girls — are not problems to be solved. They are solutions waiting to be unleashed. And we are here to do exactly that.

Welcome to the movement. Let's charge ahead together.

— Yosimbom Jania`,
    date: new Date().toISOString(),
    img: null
  }];
  savePosts();
}

function savePosts() {
  try { localStorage.setItem('blogPosts', JSON.stringify(blogPosts)); } catch(e) {}
}
function saveImages() {
  try { localStorage.setItem('siteImages', JSON.stringify(siteImages)); } catch(e) {}
}

// ══════════════ NAVIGATION ══════════════
const pages = ['home','ecohub','girlcharge','about','blog','blog-single','contact','admin-login','admin'];

function showPage(page) {
  pages.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.remove('active');
    const nav = document.getElementById('nav-' + p);
    if (nav) nav.classList.remove('active');
  });
  const target = document.getElementById('page-' + page);
  if (target) { target.classList.add('active'); window.scrollTo(0,0); }
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');

  if (page === 'home') renderHomeBlog();
  if (page === 'blog') renderBlogPage();
  if (page === 'admin') renderAdminPanel();
  renderFooters();
  applyStoredImages();
}

function toggleMobile() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// ══════════════ AUTH ══════════════
function doLogin() {
  const pass = document.getElementById('admin-pass').value;
  if (pass === adminPassword) {
    isLoggedIn = true;
    document.getElementById('admin-pass').value = '';
    document.getElementById('login-error').classList.remove('show');
    showPage('admin');
  } else {
    document.getElementById('login-error').classList.add('show');
  }
}

function doLogout() {
  isLoggedIn = false;
  showPage('home');
}

function changePassword() {
  const curr = document.getElementById('curr-pass').value;
  const nw = document.getElementById('new-pass').value;
  const conf = document.getElementById('confirm-pass').value;
  const err = document.getElementById('pass-error');
  err.style.display = 'none';
  if (curr !== adminPassword) { err.textContent = 'Current password is incorrect.'; err.style.display = 'block'; return; }
  if (nw.length < 6) { err.textContent = 'New password must be at least 6 characters.'; err.style.display = 'block'; return; }
  if (nw !== conf) { err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
  adminPassword = nw;
  localStorage.setItem('adminPass', nw);
  document.getElementById('curr-pass').value = '';
  document.getElementById('new-pass').value = '';
  document.getElementById('confirm-pass').value = '';
  showSuccess('settings-success');
}

// ══════════════ BLOG RENDERING ══════════════
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function catLabel(cat) {
  if (cat === 'eco') return { label:'EcoHub', cls:'eco' };
  if (cat === 'gc') return { label:'Girl Charge', cls:'gc' };
  return { label:'General', cls:'general' };
}

function bgClass(cat) {
  if (cat === 'eco') return 'eco-bg';
  if (cat === 'gc') return 'gc-bg';
  return 'default-bg';
}

function blogCardHTML(post, limit) {
  const c = catLabel(post.category);
  const excerpt = limit ? (post.excerpt || post.content.substring(0,120) + '...') : post.excerpt;
  const imgHTML = post.img
    ? `<img src="${post.img}" class="blog-img" alt="${post.title}">`
    : `<div class="blog-img-placeholder ${bgClass(post.category)}">📰</div>`;
  return `
    <div class="blog-card" onclick="openPost('${post.id}')">
      ${imgHTML}
      <div class="blog-body">
        <span class="blog-cat ${c.cls}">${c.label}</span>
        <h3>${post.title}</h3>
        <p>${excerpt || ''}</p>
        <div class="blog-meta">
          <span class="blog-date">${formatDate(post.date)}</span>
          <span class="read-more">Read →</span>
        </div>
      </div>
    </div>`;
}

function renderHomeBlog() {
  const el = document.getElementById('home-blog-preview');
  if (!el) return;
  const latest = [...blogPosts].reverse().slice(0, 3);
  if (latest.length === 0) {
    el.innerHTML = `<div class="blog-empty"><div class="icon">📝</div><h3>No posts yet</h3><p>Check back soon for stories and insights.</p></div>`;
  } else {
    el.innerHTML = latest.map(p => blogCardHTML(p, true)).join('');
  }
}

function renderBlogPage() {
  const el = document.getElementById('blog-grid-main');
  if (!el) return;
  let posts = [...blogPosts].reverse();
  if (currentBlogFilter !== 'all') posts = posts.filter(p => p.category === currentBlogFilter);
  if (posts.length === 0) {
    el.innerHTML = `<div class="blog-empty" style="grid-column:1/-1;"><div class="icon">📝</div><h3>No posts in this category</h3><p>Posts will appear here once published.</p></div>`;
  } else {
    el.innerHTML = posts.map(p => blogCardHTML(p, true)).join('');
  }
}

function filterBlog(cat) {
  currentBlogFilter = cat;
  ['all','eco','gc','general'].forEach(f => {
    const el = document.getElementById('filter-' + f);
    if (el) el.style.opacity = f === cat ? '1' : '0.5';
  });
  renderBlogPage();
}

function openPost(id) {
  const post = blogPosts.find(p => p.id === id);
  if (!post) return;
  const c = catLabel(post.category);
  const imgHTML = post.img
    ? `<img src="${post.img}" class="blog-single-img" alt="${post.title}">`
    : `<div class="blog-single-img-placeholder ${bgClass(post.category)}">📰</div>`;
  const paragraphs = post.content.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
  document.getElementById('blog-single-content').innerHTML = `
    <span class="back-btn" onclick="showPage('blog')">← Back to Blog</span>
    <div class="blog-single-header">
      <span class="blog-cat ${c.cls}">${c.label}</span>
      <h1>${post.title}</h1>
      <div class="blog-single-meta">
        <span class="blog-author">By Yosimbom Jania</span>
        <span class="blog-date">${formatDate(post.date)}</span>
      </div>
    </div>
    ${imgHTML}
    <div class="blog-content">${paragraphs}</div>
    <div style="margin-top:48px;padding-top:32px;border-top:1px solid rgba(0,0,0,0.08);">
      <p style="color:var(--muted);font-size:0.9rem;margin-bottom:20px;">Enjoyed this post? Share it or get in touch:</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <a href="https://wa.me/237679443906" target="_blank" class="btn btn-primary btn-sm">Share via WhatsApp</a>
        <button class="btn btn-outline btn-sm" style="color:var(--green);border-color:var(--green);" onclick="showPage('contact')">Get Involved</button>
      </div>
    </div>`;
  showPage('blog-single');
}

// ══════════════ ADMIN - BLOG ══════════════
let bpImgData = null;

function previewBlogImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    bpImgData = ev.target.result;
    const prev = document.getElementById('bp-img-preview');
    prev.src = bpImgData; prev.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function publishPost() {
  const title = document.getElementById('bp-title').value.trim();
  const cat = document.getElementById('bp-cat').value;
  const excerpt = document.getElementById('bp-excerpt').value.trim();
  const content = document.getElementById('bp-content').value.trim();
  if (!title || !content) { alert('Please add a title and content for your post.'); return; }

  if (editingPostId) {
    const idx = blogPosts.findIndex(p => p.id === editingPostId);
    if (idx > -1) {
      blogPosts[idx] = { ...blogPosts[idx], title, category: cat, excerpt, content, img: bpImgData || blogPosts[idx].img };
    }
    editingPostId = null;
    document.querySelector('[onclick="publishPost()"]').textContent = '🚀 Publish Post';
  } else {
    const post = { id: 'post-' + Date.now(), title, category: cat, excerpt, content, date: new Date().toISOString(), img: bpImgData };
    blogPosts.push(post);
  }
  savePosts();
  document.getElementById('bp-title').value = '';
  document.getElementById('bp-excerpt').value = '';
  document.getElementById('bp-content').value = '';
  document.getElementById('bp-img-preview').style.display = 'none';
  bpImgData = null;
  showSuccess('blog-success');
  renderAdminPostList();
}

function renderAdminPostList() {
  const el = document.getElementById('admin-post-list');
  if (!el) return;
  if (blogPosts.length === 0) {
    el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;">No posts yet. Write your first post above!</p>';
    return;
  }
  el.innerHTML = [...blogPosts].reverse().map(p => {
    const c = catLabel(p.category);
    return `<div class="blog-post-item">
      <div class="blog-post-item-info">
        <div class="blog-post-item-title">${p.title}</div>
        <div class="blog-post-item-meta"><span class="blog-cat ${c.cls}" style="font-size:0.7rem;padding:2px 8px;">${c.label}</span> &nbsp; ${formatDate(p.date)}</div>
      </div>
      <div class="blog-post-actions">
        <button class="btn btn-edit btn-sm" onclick="editPost('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function editPost(id) {
  const post = blogPosts.find(p => p.id === id);
  if (!post) return;
  document.getElementById('bp-title').value = post.title;
  document.getElementById('bp-cat').value = post.category;
  document.getElementById('bp-excerpt').value = post.excerpt || '';
  document.getElementById('bp-content').value = post.content;
  if (post.img) { const prev = document.getElementById('bp-img-preview'); prev.src = post.img; prev.style.display = 'block'; bpImgData = post.img; }
  editingPostId = id;
  document.querySelector('[onclick="publishPost()"]').textContent = '💾 Update Post';
  document.getElementById('bp-title').scrollIntoView({ behavior: 'smooth' });
}

function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
  blogPosts = blogPosts.filter(p => p.id !== id);
  savePosts();
  renderAdminPostList();
}

function renderAdminPanel() {
  renderAdminPostList();
  // Restore image previews
  if (siteImages.hero) { const el = document.getElementById('hero-preview'); if(el){el.src=siteImages.hero;el.style.display='block';} }
  if (siteImages.about) { const el = document.getElementById('about-preview'); if(el){el.src=siteImages.about;el.style.display='block';} }
  if (siteImages.ecoLogo) { const el = document.getElementById('eco-logo-preview'); if(el){el.src=siteImages.ecoLogo;el.style.display='block';} }
  if (siteImages.gcLogo) { const el = document.getElementById('gc-logo-preview'); if(el){el.src=siteImages.gcLogo;el.style.display='block';} }
  if (siteImages.partnerLogos && siteImages.partnerLogos.length) renderPartnerLogoPreviews();
}

// ══════════════ IMAGE UPLOADS ══════════════
function readFile(file, cb) {
  const reader = new FileReader();
  reader.onload = e => cb(e.target.result);
  reader.readAsDataURL(file);
}

function uploadHeroImg(e) {
  const file = e.target.files[0]; if (!file) return;
  readFile(file, data => {
    siteImages.hero = data; saveImages();
    const prev = document.getElementById('hero-preview'); prev.src = data; prev.style.display = 'block';
    applyStoredImages();
  });
}

function uploadAboutImg(e) {
  const file = e.target.files[0]; if (!file) return;
  readFile(file, data => {
    siteImages.about = data; saveImages();
    const prev = document.getElementById('about-preview'); prev.src = data; prev.style.display = 'block';
    applyStoredImages();
  });
}

function uploadEcoLogo(e) {
  const file = e.target.files[0]; if (!file) return;
  readFile(file, data => {
    siteImages.ecoLogo = data; saveImages();
    const prev = document.getElementById('eco-logo-preview'); prev.src = data; prev.style.display = 'block';
    applyStoredImages();
  });
}

function uploadGCLogo(e) {
  const file = e.target.files[0]; if (!file) return;
  readFile(file, data => {
    siteImages.gcLogo = data; saveImages();
    const prev = document.getElementById('gc-logo-preview'); prev.src = data; prev.style.display = 'block';
    applyStoredImages();
  });
}

function uploadPartnerLogos(e) {
  const files = Array.from(e.target.files);
  if (!siteImages.partnerLogos) siteImages.partnerLogos = [];
  let pending = files.length;
  files.forEach(file => {
    readFile(file, data => {
      siteImages.partnerLogos.push(data);
      pending--;
      if (pending === 0) { saveImages(); renderPartnerLogoPreviews(); }
    });
  });
}

function renderPartnerLogoPreviews() {
  const el = document.getElementById('partner-logos-preview');
  if (!el || !siteImages.partnerLogos) return;
  el.innerHTML = siteImages.partnerLogos.map((src, i) =>
    `<div style="position:relative;">
      <img src="${src}" style="width:80px;height:80px;object-fit:contain;border:1px solid rgba(0,0,0,0.1);border-radius:10px;background:white;padding:6px;">
      <button onclick="removePartnerLogo(${i})" style="position:absolute;top:-6px;right:-6px;background:#c00;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1;">×</button>
    </div>`
  ).join('');
}

function removePartnerLogo(idx) {
  siteImages.partnerLogos.splice(idx, 1);
  saveImages(); renderPartnerLogoPreviews();
}

function applyStoredImages() {
  // Hero photo
  if (siteImages.hero) {
    const wrap = document.getElementById('hero-img-wrap');
    if (wrap) {
      wrap.innerHTML = `<img src="${siteImages.hero}" class="hero-img" alt="Jania">`;
    }
  }
  // About photo
  if (siteImages.about) {
    const frame = document.getElementById('about-img-frame');
    if (frame) frame.innerHTML = `<img src="${siteImages.about}" class="founder-img" alt="Jania">`;
  }
  // EcoHub logo
  if (siteImages.ecoLogo) {
    ['eco-logo-mini','eco-logo-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${siteImages.ecoLogo}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
    });
    // Also replace emoji in org card
    const card = document.querySelector('.org-card.eco .org-card-logo-placeholder');
    if (card) card.innerHTML = `<img src="${siteImages.ecoLogo}" style="width:100%;height:100%;object-fit:contain;">`;
  }
  // GC logo
  if (siteImages.gcLogo) {
    ['gc-logo-mini','gc-logo-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${siteImages.gcLogo}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
    });
    const card = document.querySelector('.org-card.gc .org-card-logo-placeholder');
    if (card) card.innerHTML = `<img src="${siteImages.gcLogo}" style="width:100%;height:100%;object-fit:contain;">`;
  }
}

// ══════════════ ADMIN TABS ══════════════
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('admin-' + tab).classList.add('active');
}

// ══════════════ PROFILE ══════════════
function saveProfile() {
  showSuccess('profile-success');
}

// ══════════════ CONTACT ══════════════
function submitContactForm() {
  const name = document.getElementById('cf-fname').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  if (!name || !email) { alert('Please fill in at least your name and email.'); return; }
  showSuccess('contact-success');
  ['cf-fname','cf-lname','cf-email','cf-message'].forEach(id => { document.getElementById(id).value = ''; });
}

// ══════════════ HELPERS ══════════════
function showSuccess(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ══════════════ FOOTER ══════════════
function footerHTML() {
  return `
    <div class="footer-top">
      <div class="footer-brand">
        <div class="footer-logo">Jania<span>.</span></div>
        <p class="footer-desc">Uniting two powerful missions — EcoHub and The Girl Charge — to build a better future for Cameroon's youth through climate action and gender equality.</p>
        <div class="footer-social">
          <a href="https://wa.me/237679443906" target="_blank" class="social-btn" title="WhatsApp">💬</a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Navigate</h4>
        <ul>
          <li><a onclick="showPage('home')">Home</a></li>
          <li><a onclick="showPage('about')">About Jania</a></li>
          <li><a onclick="showPage('blog')">Blog</a></li>
          <li><a onclick="showPage('contact')">Get Involved</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Organisations</h4>
        <ul>
          <li><a onclick="showPage('ecohub')">EcoHub</a></li>
          <li><a onclick="showPage('girlcharge')">The Girl Charge</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          <li><a href="https://wa.me/237679443906" target="_blank">+237 679 443 906</a></li>
          <li><a onclick="showPage('contact')">Send a Message</a></li>
          <li><a onclick="showPage('admin-login')" style="color:rgba(255,255,255,0.2);font-size:0.78rem;">Admin Login</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-copy">© ${new Date().getFullYear()} Yosimbom Jania · EcoHub · The Girl Charge. All rights reserved.</div>
      <div class="footer-dev">Designed & built by <a href="https://nteinpraises.vercel.app" target="_blank">Ntein Praises</a></div>
    </div>`;
}

function renderFooters() {
  ['footer-home','footer-eco','footer-gc','footer-about','footer-blog','footer-bs','footer-contact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = footerHTML();
  });
}

// ══════════════ INIT ══════════════
window.addEventListener('load', () => {
  renderFooters();
  applyStoredImages();
  renderHomeBlog();
});