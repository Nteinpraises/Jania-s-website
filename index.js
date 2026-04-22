// ══════════════════════════════════════════════════════
//  FIREBASE SETUP
//  index.html script tag must be:
//  <script type="module" src="index.js"></script>
// ══════════════════════════════════════════════════════

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, updateDoc, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase config
const firebaseConfig = {
  apiKey:            "AIzaSyCxywiQG69yFiEYqjAnRdthpWmT6nZGv8E",
  authDomain:        "jania-s-project.firebaseapp.com",
  projectId:         "jania-s-project",
  storageBucket:     "jania-s-project.firebasestorage.app",
  messagingSenderId: "212792005831",
  appId:             "1:212792005831:web:5692e792c230408a0a1ae2",
  measurementId:     "G-8ZP4X77S6Y"
};

const firebaseApp = initializeApp(firebaseConfig);
const analytics   = getAnalytics(firebaseApp);
const db          = getFirestore(firebaseApp);

// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
let adminPassword     = localStorage.getItem('adminPass') || 'jania2025';
let isLoggedIn        = false;
let blogPosts         = [];
let currentBlogFilter = 'all';
let editingPostId     = null;
let bpImgData         = null;

// ══════════════════════════════════════════════════════
//  FIRESTORE — BLOG POSTS
// ══════════════════════════════════════════════════════
async function loadPostsFromDB() {
  try {
    const q        = query(collection(db, "blogPosts"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    blogPosts      = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error loading posts:", e);
    blogPosts = [];
  }
}

async function savePostToDB(post) {
  const docRef = await addDoc(collection(db, "blogPosts"), post);
  return docRef.id;
}

async function updatePostInDB(id, data) {
  await updateDoc(doc(db, "blogPosts", id), data);
}

async function deletePostFromDB(id) {
  await deleteDoc(doc(db, "blogPosts", id));
}

// ══════════════════════════════════════════════════════
//  FIRESTORE — SITE IMAGES (no Storage, no CORS needed)
//  Images are compressed to base64 and saved in Firestore
//  so every visitor on every device sees the same images
// ══════════════════════════════════════════════════════
async function saveSiteImageToDB(key, base64Data) {
  try {
    const snapshot = await getDocs(collection(db, "siteImages"));
    const existing = snapshot.docs.find(d => d.data().key === key);
    if (existing) {
      await updateDoc(doc(db, "siteImages", existing.id), { key, data: base64Data });
    } else {
      await addDoc(collection(db, "siteImages"), { key, data: base64Data });
    }
    const cache   = JSON.parse(localStorage.getItem('siteImages') || '{}');
    cache[key]    = base64Data;
    localStorage.setItem('siteImages', JSON.stringify(cache));
  } catch (e) {
    console.error("Error saving site image:", e);
  }
}

async function loadSiteImagesFromDB() {
  try {
    const snapshot = await getDocs(collection(db, "siteImages"));
    const cache    = JSON.parse(localStorage.getItem('siteImages') || '{}');
    snapshot.docs.forEach(d => {
      const { key, data } = d.data();
      if (key && data) cache[key] = data;
    });
    localStorage.setItem('siteImages', JSON.stringify(cache));
  } catch (e) {
    console.error("Error loading site images:", e);
  }
}

// ══════════════════════════════════════════════════════
//  IMAGE COMPRESSION
//  Keeps images small so Firestore stays fast
// ══════════════════════════════════════════════════════
function compressImage(base64, maxWidth, quality, callback) {
  const img  = new Image();
  img.onload = () => {
    const scale   = Math.min(1, maxWidth / img.width);
    const canvas  = document.createElement('canvas');
    canvas.width  = img.width  * scale;
    canvas.height = img.height * scale;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    callback(canvas.toDataURL('image/jpeg', quality));
  };
  img.src = base64;
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
const pages = [
  'home','ecohub','girlcharge','about',
  'blog','blog-single','contact','admin-login','admin'
];

function showPage(page) {
  pages.forEach(p => {
    const el  = document.getElementById('page-' + p);
    if (el)  el.classList.remove('active');
    const nav = document.getElementById('nav-' + p);
    if (nav) nav.classList.remove('active');
  });
  const target = document.getElementById('page-' + page);
  if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');

  if (page === 'home')  renderHomeBlog();
  if (page === 'blog')  renderBlogPage();
  if (page === 'admin') renderAdminPanel();
  renderFooters();
  applyStoredImages();
}

function toggleMobile() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// ══════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════
function doLogin() {
  const lockoutUntil = parseInt(localStorage.getItem('loginLockout') || '0');
  const now = Date.now();

  if (now < lockoutUntil) {
    const mins = Math.ceil((lockoutUntil - now) / 60000);
    const errEl = document.getElementById('login-error');
    errEl.textContent = `Too many failed attempts. Please try again in ${mins} minute(s).`;
    errEl.classList.add('show');
    document.getElementById('admin-pass').value = '';
    return;
  }

  const pass = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('login-error');

  if (pass === adminPassword) {
    isLoggedIn = true;
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('loginLockout');
    document.getElementById('admin-pass').value = '';
    errEl.classList.remove('show');
    showPage('admin');
  } else {
    let attempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
    localStorage.setItem('loginAttempts', String(attempts));

    if (attempts >= 5) {
      const lockUntil = Date.now() + 60 * 60 * 1000;
      localStorage.setItem('loginLockout', String(lockUntil));
      localStorage.removeItem('loginAttempts');
      errEl.textContent = 'Too many failed attempts. Admin access locked for 1 hour.';
    } else {
      errEl.textContent = `Incorrect password. ${5 - attempts} attempt(s) remaining before lockout.`;
    }

    errEl.classList.add('show');
    document.getElementById('admin-pass').value = '';
  }
}

function doLogout() {
  isLoggedIn = false;
  showPage('home');
}

function changePassword() {
  const curr = document.getElementById('curr-pass').value;
  const nw   = document.getElementById('new-pass').value;
  const conf = document.getElementById('confirm-pass').value;
  const err  = document.getElementById('pass-error');
  err.style.display = 'none';

  if (curr !== adminPassword) {
    err.textContent = 'Current password is incorrect.';
    err.style.display = 'block'; return;
  }
  if (nw.length < 6) {
    err.textContent = 'New password must be at least 6 characters.';
    err.style.display = 'block'; return;
  }
  if (nw !== conf) {
    err.textContent = 'Passwords do not match.';
    err.style.display = 'block'; return;
  }

  adminPassword = nw;
  localStorage.setItem('adminPass', nw);
  document.getElementById('curr-pass').value    = '';
  document.getElementById('new-pass').value     = '';
  document.getElementById('confirm-pass').value = '';
  showSuccess('settings-success');
}

// ══════════════════════════════════════════════════════
//  BLOG RENDERING
// ══════════════════════════════════════════════════════
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function catLabel(cat) {
  if (cat === 'eco') return { label: 'EcoHub',     cls: 'eco' };
  if (cat === 'gc')  return { label: 'Girl Charge', cls: 'gc' };
  return                     { label: 'General',    cls: 'general' };
}

function bgClass(cat) {
  if (cat === 'eco') return 'eco-bg';
  if (cat === 'gc')  return 'gc-bg';
  return 'default-bg';
}

function blogCardHTML(post) {
  const c       = catLabel(post.category);
  const excerpt = post.excerpt || post.content.substring(0, 120) + '...';
  const imgHTML = post.img
    ? `<img src="${post.img}" class="blog-img" alt="${post.title}">`
    : `<div class="blog-img-placeholder ${bgClass(post.category)}">📰</div>`;
  return `
    <div class="blog-card" onclick="openPost('${post.id}')">
      ${imgHTML}
      <div class="blog-body">
        <span class="blog-cat ${c.cls}">${c.label}</span>
        <h3>${post.title}</h3>
        <p>${excerpt}</p>
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
  const latest = blogPosts.slice(0, 3);
  el.innerHTML = latest.length === 0
    ? `<div class="blog-empty"><div class="icon">📝</div><h3>No posts yet</h3><p>Check back soon for stories and insights.</p></div>`
    : latest.map(p => blogCardHTML(p)).join('');
}

function renderBlogPage() {
  const el = document.getElementById('blog-grid-main');
  if (!el) return;
  const posts = currentBlogFilter === 'all'
    ? blogPosts
    : blogPosts.filter(p => p.category === currentBlogFilter);
  el.innerHTML = posts.length === 0
    ? `<div class="blog-empty" style="grid-column:1/-1;"><div class="icon">📝</div><h3>No posts in this category</h3><p>Posts will appear here once published.</p></div>`
    : posts.map(p => blogCardHTML(p)).join('');
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
  const c          = catLabel(post.category);
  const imgHTML    = post.img
    ? `<img src="${post.img}" class="blog-single-img" alt="${post.title}">`
    : `<div class="blog-single-img-placeholder ${bgClass(post.category)}">📰</div>`;
  const paragraphs = post.content
    .split('\n').filter(l => l.trim())
    .map(l => `<p>${l}</p>`).join('');

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

// ══════════════════════════════════════════════════════
//  ADMIN — BLOG
// ══════════════════════════════════════════════════════
function previewBlogImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader  = new FileReader();
  reader.onload = ev => {
    compressImage(ev.target.result, 800, 0.7, compressed => {
      bpImgData              = compressed;
      const prev             = document.getElementById('bp-img-preview');
      prev.src               = compressed;
      prev.style.display     = 'block';
    });
  };
  reader.readAsDataURL(file);
}

async function publishPost() {
  const title   = document.getElementById('bp-title').value.trim();
  const cat     = document.getElementById('bp-cat').value;
  const excerpt = document.getElementById('bp-excerpt').value.trim();
  const content = document.getElementById('bp-content').value.trim();

  if (!title || !content) {
    alert('Please add a title and content for your post.');
    return;
  }

  const btn       = document.querySelector('[onclick="publishPost()"]');
  btn.textContent = 'Publishing...';
  btn.disabled    = true;

  try {
    if (editingPostId) {
      const existing = blogPosts.find(p => p.id === editingPostId);
      await updatePostInDB(editingPostId, {
        title, category: cat, excerpt, content,
        img: bpImgData || existing?.img || null
      });
      editingPostId = null;
    } else {
      await savePostToDB({
        title, category: cat, excerpt, content,
        date: new Date().toISOString(),
        img:  bpImgData || null
      });
    }

    await loadPostsFromDB();
    document.getElementById('bp-title').value          = '';
    document.getElementById('bp-excerpt').value        = '';
    document.getElementById('bp-content').value        = '';
    document.getElementById('bp-img-preview').style.display = 'none';
    bpImgData = null;
    showSuccess('blog-success');
    renderAdminPostList();
    renderHomeBlog();

  } catch (e) {
    alert('Error publishing post: ' + e.message);
    console.error(e);
  } finally {
    btn.textContent = 'Publish Post';
    btn.disabled    = false;
  }
}

function renderAdminPostList() {
  const el = document.getElementById('admin-post-list');
  if (!el) return;
  if (blogPosts.length === 0) {
    el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;">No posts yet. Write your first post above!</p>';
    return;
  }
  el.innerHTML = blogPosts.map(p => {
    const c = catLabel(p.category);
    return `<div class="blog-post-item">
      <div class="blog-post-item-info">
        <div class="blog-post-item-title">${p.title}</div>
        <div class="blog-post-item-meta">
          <span class="blog-cat ${c.cls}" style="font-size:0.7rem;padding:2px 8px;">${c.label}</span>
          &nbsp; ${formatDate(p.date)}
        </div>
      </div>
      <div class="blog-post-actions">
        <button class="btn btn-edit btn-sm"   onclick="editPost('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function editPost(id) {
  const post = blogPosts.find(p => p.id === id);
  if (!post) return;
  document.getElementById('bp-title').value   = post.title;
  document.getElementById('bp-cat').value     = post.category;
  document.getElementById('bp-excerpt').value = post.excerpt || '';
  document.getElementById('bp-content').value = post.content;
  if (post.img) {
    const prev         = document.getElementById('bp-img-preview');
    prev.src           = post.img;
    prev.style.display = 'block';
    bpImgData          = null;
  }
  editingPostId = id;
  document.querySelector('[onclick="publishPost()"]').textContent = 'Update Post';
  document.getElementById('bp-title').scrollIntoView({ behavior: 'smooth' });
}

async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
  try {
    await deletePostFromDB(id);
    await loadPostsFromDB();
    renderAdminPostList();
    renderHomeBlog();
  } catch (e) {
    alert('Error deleting post: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════
//  IMAGE UPLOADS — base64 → Firestore (no Storage/CORS)
// ══════════════════════════════════════════════════════
function readFile(file, cb) {
  const reader  = new FileReader();
  reader.onload = e => cb(e.target.result);
  reader.readAsDataURL(file);
}

function handleImageUpload(file, previewId, storageKey, maxWidth) {
  readFile(file, raw => {
    compressImage(raw, maxWidth || 1200, 0.8, async compressed => {
      await saveSiteImageToDB(storageKey, compressed);
      const prev = document.getElementById(previewId);
      if (prev) { prev.src = compressed; prev.style.display = 'block'; }
      applyStoredImages();
    });
  });
}

function uploadHeroImg(e)  { const f = e.target.files[0]; if (!f) return; handleImageUpload(f, 'hero-preview',     'hero',    1200); }
function uploadAboutImg(e) { const f = e.target.files[0]; if (!f) return; handleImageUpload(f, 'about-preview',    'about',   1000); }
function uploadEcoLogo(e)  { const f = e.target.files[0]; if (!f) return; handleImageUpload(f, 'eco-logo-preview', 'ecoLogo',  400); }
function uploadGCLogo(e)   { const f = e.target.files[0]; if (!f) return; handleImageUpload(f, 'gc-logo-preview',  'gcLogo',   400); }

function uploadPartnerLogos(e) {
  const files = Array.from(e.target.files);
  const cache = JSON.parse(localStorage.getItem('siteImages') || '{}');
  if (!cache.partnerLogos) cache.partnerLogos = [];
  let pending = files.length;
  files.forEach((file, i) => {
    readFile(file, raw => {
      compressImage(raw, 300, 0.8, async compressed => {
        cache.partnerLogos.push(compressed);
        pending--;
        if (pending === 0) {
          await saveSiteImageToDB('partnerLogos', JSON.stringify(cache.partnerLogos));
          renderPartnerLogoPreviews();
        }
      });
    });
  });
}

function renderPartnerLogoPreviews() {
  const el    = document.getElementById('partner-logos-preview');
  const cache = JSON.parse(localStorage.getItem('siteImages') || '{}');
  if (!el || !cache.partnerLogos) return;
  el.innerHTML = cache.partnerLogos.map((src, i) => `
    <div style="position:relative;">
      <img src="${src}" style="width:80px;height:80px;object-fit:contain;border:1px solid rgba(0,0,0,0.1);border-radius:10px;background:white;padding:6px;">
      <button onclick="removePartnerLogo(${i})" style="position:absolute;top:-6px;right:-6px;background:#c00;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1;">×</button>
    </div>`).join('');
}

async function removePartnerLogo(idx) {
  const cache = JSON.parse(localStorage.getItem('siteImages') || '{}');
  cache.partnerLogos.splice(idx, 1);
  await saveSiteImageToDB('partnerLogos', JSON.stringify(cache.partnerLogos));
  renderPartnerLogoPreviews();
}

function applyStoredImages() {
  const cache = JSON.parse(localStorage.getItem('siteImages') || '{}');
  if (cache.hero) {
    const wrap = document.getElementById('hero-img-wrap');
    if (wrap) wrap.innerHTML = `<img src="${cache.hero}" class="hero-img" alt="Jania">`;
  }
  if (cache.about) {
    const frame = document.getElementById('about-img-frame');
    if (frame) frame.innerHTML = `<img src="${cache.about}" class="founder-img" alt="Jania">`;
  }
  if (cache.ecoLogo) {
    ['eco-logo-mini','eco-logo-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${cache.ecoLogo}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
    });
    const card = document.querySelector('.org-card.eco .org-card-logo-placeholder');
    if (card) card.innerHTML = `<img src="${cache.ecoLogo}" style="width:100%;height:100%;object-fit:contain;">`;
  }
  if (cache.gcLogo) {
    ['gc-logo-mini','gc-logo-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${cache.gcLogo}" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
    });
    const card = document.querySelector('.org-card.gc .org-card-logo-placeholder');
    if (card) card.innerHTML = `<img src="${cache.gcLogo}" style="width:100%;height:100%;object-fit:contain;">`;
  }
}

// ══════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════
function renderAdminPanel() {
  renderAdminPostList();
  const cache = JSON.parse(localStorage.getItem('siteImages') || '{}');
  if (cache.hero)    { const el = document.getElementById('hero-preview');     if (el) { el.src = cache.hero;    el.style.display = 'block'; } }
  if (cache.about)   { const el = document.getElementById('about-preview');    if (el) { el.src = cache.about;   el.style.display = 'block'; } }
  if (cache.ecoLogo) { const el = document.getElementById('eco-logo-preview'); if (el) { el.src = cache.ecoLogo; el.style.display = 'block'; } }
  if (cache.gcLogo)  { const el = document.getElementById('gc-logo-preview');  if (el) { el.src = cache.gcLogo;  el.style.display = 'block'; } }
  if (cache.partnerLogos?.length) renderPartnerLogoPreviews();
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('admin-' + tab).classList.add('active');
}

// ══════════════════════════════════════════════════════
//  CONTACT & PROFILE
// ══════════════════════════════════════════════════════
function submitContactForm() {
  const name  = document.getElementById('cf-fname').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  if (!name || !email) { alert('Please fill in at least your name and email.'); return; }
  showSuccess('contact-success');
  ['cf-fname','cf-lname','cf-email','cf-message'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function saveProfile() { showSuccess('profile-success'); }

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function showSuccess(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ══════════════════════════════════════════════════════
//  FOOTER
// ══════════════════════════════════════════════════════
function footerHTML() {
  return `
    <div class="footer-top">
      <div class="footer-brand">
        <div class="footer-logo">Jania<span>.</span></div>
        <p class="footer-desc">Uniting two powerful missions — EcoHub and The Girl Charge — to build a better future for Cameroon's youth through climate action and gender equality.</p>
        <div class="footer-social">
          <a href="https://www.facebook.com/profile.php?id=100085923873693"  target="_blank" class="social-btn" title="Facebook">F</a>
          <a href="https://www.instagram.com/yosimbom_jania?igsh=d3JzNWVzYzRrcDFp" target="_blank" class="social-btn" title="Instagram">I</a>
          <a href="https://www.linkedin.com/in/jania-ney-yosimbom-2a83a124a/"   target="_blank" class="social-btn" title="LinkedIn">L</a>
          <a href="https://wa.me/237679443906" target="_blank" class="social-btn" title="WhatsApp">W</a>
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
      <div class="footer-dev">Designed with ❤️ by <a href="https://nteinpraises.vercel.app" target="_blank">Ntein Praises</a></div>
    </div>`;
}

function renderFooters() {
  ['footer-home','footer-eco','footer-gc','footer-about','footer-blog','footer-bs','footer-contact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = footerHTML();
  });
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
window.addEventListener('load', async () => {
  await loadSiteImagesFromDB(); // pull site images from Firestore into local cache
  await loadPostsFromDB();      // pull blog posts from Firestore
  renderFooters();
  applyStoredImages();
  renderHomeBlog();
});

// ══════════════════════════════════════════════════════
//  EXPOSE FUNCTIONS TO HTML (required for type="module")
// ══════════════════════════════════════════════════════
window.showPage         = showPage;
window.toggleMobile     = toggleMobile;
window.doLogin          = doLogin;
window.doLogout         = doLogout;
window.changePassword   = changePassword;
window.filterBlog       = filterBlog;
window.openPost         = openPost;
window.publishPost      = publishPost;
window.editPost         = editPost;
window.deletePost       = deletePost;
window.switchAdminTab   = switchAdminTab;
window.submitContactForm = submitContactForm;
window.saveProfile      = saveProfile;
window.previewBlogImg   = previewBlogImg;
window.uploadHeroImg    = uploadHeroImg;
window.uploadAboutImg   = uploadAboutImg;
window.uploadEcoLogo    = uploadEcoLogo;
window.uploadGCLogo     = uploadGCLogo;
window.uploadPartnerLogos = uploadPartnerLogos;
window.removePartnerLogo  = removePartnerLogo;