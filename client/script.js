window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (!loader) return;
    loader.classList.add('out');
    setTimeout(() => { loader.style.display = 'none'; }, 600);
  }, 2200);
});

const cDot = document.getElementById('cDot');
const cRing = document.getElementById('cRing');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
(function animC() {
  if (cDot) { cDot.style.left = mx + 'px'; cDot.style.top = my + 'px'; }
  if (cRing) {
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    cRing.style.left = rx + 'px'; cRing.style.top = ry + 'px';
  }
  requestAnimationFrame(animC);
})();
document.addEventListener('mouseover', e => {
  if (!cRing) return;
  if (e.target.closest('button,a,[onclick],.pcard,.cat-card,.team-card,.wl-card,.cart-item')) {
    cRing.style.width = '50px'; cRing.style.height = '50px'; cRing.style.borderColor = 'rgba(212,175,55,.9)';
  } else {
    cRing.style.width = '34px'; cRing.style.height = '34px'; cRing.style.borderColor = 'rgba(212,175,55,.45)';
  }
});

let __authInFlight = false;

function formatCount(n) {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString('en-IN');
}

async function populateDynamicNumbers() {
  try {
    const [stats, categories] = await Promise.allSettled([
      apiGet('/stats'),
      VaultAPI.categories(),
    ]);

    if (stats.status === 'fulfilled' && stats.value) {
      const s = stats.value;
      document.querySelectorAll('[data-stat="products"]').forEach(el => {
        el.textContent = formatCount(s.totalProducts) + '+';
      });
      document.querySelectorAll('[data-stat="users"]').forEach(el => {
        el.textContent = formatCount(s.totalUsers) + '+';
      });
      document.querySelectorAll('[data-stat="successRate"]').forEach(el => {
        el.textContent = (s.successRate || 99.4) + '%';
      });
      document.querySelectorAll('[data-stat="countries"]').forEach(el => {
        el.textContent = formatCount(s.totalCountries || 52);
      });
      document.querySelectorAll('[data-total-products]').forEach(el => {
        el.textContent = formatCount(s.totalProducts);
      });
    }

    if (categories.status === 'fulfilled') {
      const list = (categories.value && categories.value.data) || [];
      const byName = {};
      let total = 0;
      list.forEach(c => {
        byName[c.name] = c.productCount || 0;
        total += c.productCount || 0;
      });

      document.querySelectorAll('[data-cat-count]').forEach(el => {
        const key = el.dataset.catCount;
        const count = key === 'All' ? total : (byName[key] || 0);
        if (el.classList.contains('cat-count')) {
          el.textContent = formatCount(count) + ' certified designs';
        } else {
          el.textContent = formatCount(count);
        }
      });
    }
  } catch (e) {
    console.error('[dynamic numbers] failed', e);
  }
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) { pg.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  if (id === 'collection') document.getElementById('nav-collection')?.classList.add('active');
  if (id === 'about') document.getElementById('nav-about')?.classList.add('active');

  if (id === 'about') { setTimeout(initAboutReveal, 100); }

  if (id === 'collection' || id.startsWith('cat-')) loadCatalog(id);
  if (id === 'cart') loadCartPage();
  if (id === 'wishlist') loadWishlistPage();
  if (id === 'admin') initAdminPage();
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let toastTimer;
function showToast(msg, icon = '✦') {
  const elMsg = document.getElementById('toast-msg');
  const elIcon = document.getElementById('toast-icon');
  const t = document.getElementById('toast');
  if (!t) return;
  if (elMsg) elMsg.textContent = msg;
  if (elIcon) elIcon.textContent = icon;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function openSearch() { document.getElementById('searchPanel')?.classList.add('open'); }
function closeSearch() { setTimeout(() => document.getElementById('searchPanel')?.classList.remove('open'), 180); }

let searchTimer;
document.addEventListener('DOMContentLoaded', () => {
  const sb = document.getElementById('searchBox');
  if (sb) {
    sb.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = sb.value.trim();
      if (q.length < 2) return;
      searchTimer = setTimeout(async () => {
        try {
          const r = await VaultAPI.search(q);
          if (r?.data?.length) {
            showPage('collection');
            renderProductGrid('mixedGrid', r.data);
          }
        } catch (e) { }
      }, 400);
    });
  }
});

function toggleSb(el) { el.querySelector('.sb-check')?.classList.toggle('on'); }

(function animateFloatEls() {
  const els = document.querySelectorAll('.float-el');
  const configs = [
    { delay: 0.8, dur: 6 }, { delay: 1.2, dur: 7 }, { delay: 0.5, dur: 5.5 },
    { delay: 1.0, dur: 6.5 }, { delay: 0.3, dur: 5 }, { delay: 0.9, dur: 7.5 },
  ];
  els.forEach((el, i) => {
    const c = configs[i] || { delay: 0.5 + i * .2, dur: 6 };
    el.style.animation = 'none';
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.transition = 'opacity 1s ease';
      el.style.opacity = '1';
      el.style.animation = `floatEl${i} ${c.dur}s ${c.delay}s ease-in-out infinite`;
    }, 1400 + i * 150);
  });
  const ks = document.createElement('style');
  ks.textContent = [0, 1, 2, 3, 4, 5].map(i => {
    const dy = [16, 20, 12, 18, 10, 22][i];
    return `@keyframes floatEl${i}{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-${dy}px) rotate(${i % 2 ? 3 : -3}deg)}}`;
  }).join('');
  document.head.appendChild(ks);
})();

const CATEGORY_THEME = {
  'Engagement Ring': { emoji: '💍', wire: '◇', bg: 'linear-gradient(135deg,#120d1a,#1a1226)' },
  'Ring': { emoji: '💎', wire: '◇', bg: 'linear-gradient(135deg,#180d1a,#200a24)' },
  'Pendant': { emoji: '📿', wire: '△', bg: 'linear-gradient(135deg,#0d1a12,#122016)' },
  'Earrings': { emoji: '✨', wire: '☆', bg: 'linear-gradient(135deg,#1a1a0d,#181808)' },
  'Bangle': { emoji: '⭕', wire: '○', bg: 'linear-gradient(135deg,#0d1018,#121822)' },
  'Necklace': { emoji: '📿', wire: '○', bg: 'linear-gradient(135deg,#0d1a14,#12201a)' },
  'Bracelet': { emoji: '🔗', wire: '○', bg: 'linear-gradient(135deg,#12201a,#0a1510)' },
};

function productCardHTML(p) {
  const theme = CATEGORY_THEME[p.category] || { emoji: '💎', wire: '◇', bg: 'linear-gradient(135deg,#120d1a,#1a1226)' };
  const price = p.salePrice || p.price || 0;
  const specs = (p.specs || []).slice(0, 3);
  const badge = p.badge || '';
  const badgeClass = (badge === 'New' || badge === 'Exclusive') ? 'badge-gold' : 'badge-green';
  return `<div class="pcard" data-product-id="${p._id}" onclick="openProduct('${p._id}')">
    <div class="pcard-img" style="background:${theme.bg}">
      ${p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover">`
      : `<div class="pcard-normal" style="font-size:68px">${theme.emoji}</div>`}
      <div class="pcard-wire" style="display:flex;align-items:center;justify-content:center;">
        <svg width="90" height="90" viewBox="0 0 90 90"><g stroke="#D4AF37" stroke-width="0.7" fill="none" opacity=".8"><circle cx="45" cy="45" r="32"/><circle cx="45" cy="45" r="22"/><line x1="13" y1="45" x2="77" y2="45"/><line x1="45" y1="13" x2="45" y2="77"/><ellipse cx="45" cy="45" rx="32" ry="12"/><ellipse cx="45" cy="45" rx="12" ry="32"/></g><text x="45" y="49" text-anchor="middle" font-family="Inter" font-size="20" fill="rgba(212,175,55,.4)">${theme.wire}</text></svg>
      </div>
      ${badge ? `<span class="pcard-badge ${badgeClass}">${badge}</span>` : ''}
      <div class="pcard-wish" data-wish="${p._id}" onclick="event.stopPropagation();toggleWishlist('${p._id}',this)">♡</div>
    </div>
    <div class="pcard-body">
      <div class="pcard-cat">${p.category || ''}</div>
      <div class="pcard-title">${p.title}${p.subtitle ? ' — ' + p.subtitle : ''}</div>
      <div class="pcard-specs">${specs.map(s => `<span>${s}</span>`).join('')}</div>
      <div class="pcard-foot">
        <div class="pcard-price">$${price}</div>
        <button class="pcard-add" onclick="event.stopPropagation();addToCart('${p._id}')">Add to Vault</button>
      </div>
    </div>
  </div>`;
}

function renderProductGrid(gridId, products) {
  const el = document.getElementById(gridId);
  if (!el) return;
  if (!products || !products.length) {
    el.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px 0;font-family:'Inter',sans-serif">No designs found.</div>`;
    return;
  }
  el.innerHTML = products.map(productCardHTML).join('');
}

async function loadCatalog(pageId) {
  const gridMap = {
    collection: 'mixedGrid',
    'cat-rings': 'ringsGrid',
    'cat-pendants': 'pendantsGrid',
    'cat-earrings': 'earringsGrid',
    'cat-bangles': 'banglesGrid',
  };
  const catMap = {
    'cat-rings': 'Engagement Ring',
    'cat-pendants': 'Pendant',
    'cat-earrings': 'Earrings',
    'cat-bangles': 'Bangle',
  };
  const gridId = gridMap[pageId];
  if (!gridId) return;
  const el = document.getElementById(gridId);
  if (!el) return;
  el.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px 0">Loading…</div>`;

  try {
    let products = [];
    if (pageId === 'collection') {
      const r = await VaultAPI.products('?isActive=true&limit=50');
      products = r?.data || [];
    } else {
      const r = await VaultAPI.products(`?category=${encodeURIComponent(catMap[pageId])}&isActive=true&limit=50`);
      products = r?.data || [];
    }
    renderProductGrid(gridId, products);
    document.querySelectorAll('[data-res-count]').forEach(el => {
      el.textContent = formatCount(products.length);
    });
  } catch (e) {
    renderProductGrid(gridId, []);
    document.querySelectorAll('[data-res-count]').forEach(el => {
      el.textContent = '0';
    });
  }
}

async function openProduct(productId) {
  showPage('product');
  const wrap = document.querySelector('#page-product .pdp-layout');
  if (!wrap) return;
  wrap.style.opacity = '0.4';
  try {
    const r = await VaultAPI.product(productId);
    renderProductDetail(r.data);
  } catch (e) {
    showToast('✖  Could not load design', '✖');
  } finally {
    wrap.style.opacity = '1';
  }
}

function renderProductDetail(p) {
  if (!p) return;
  const theme = CATEGORY_THEME[p.category] || { emoji: '💎', wire: '◇' };
  const price = p.salePrice || p.price || 0;

  const info = document.querySelector('#page-product .pdp-info');
  if (info) {
    info.innerHTML = `
      <div class="pdp-crumb">
        <span onclick="showPage('home')">Home</span> ›
        <span onclick="showPage('collection')">Collection</span> ›
        <span>${p.category || ''}</span>
      </div>
      <h1 class="pdp-title">${p.title}<br>${p.subtitle || ''}</h1>
      <div class="pdp-stars">
        <div class="stars-row">${'★'.repeat(Math.round(p.rating || 5))}${'☆'.repeat(5 - Math.round(p.rating || 5))}</div>
        <div class="star-count">${(p.rating || 4.9).toFixed(2)} · ${p.reviewCount || 0} reviews</div>
      </div>
      <div class="pdp-price-row">
        <div class="pdp-price">$${price}</div>
        <div>
          <div class="pdp-lic">${p.licenseType || 'Commercial'} License Included</div>
          <div style="font-size:11px;color:var(--muted);font-family:'Inter',sans-serif">Unlimited casting rights</div>
        </div>
      </div>
      <button class="add-btn" onclick="addToCart('${p._id}')">⊡ Add to Vault</button>
      <button class="wish-btn" onclick="toggleWishlist('${p._id}',this)">♡ Save to Wishlist</button>
      <div class="spec-box">
        <div class="spec-box-title">Engineering Specifications</div>
        ${p.estimatedWeight ? `<div class="spec-row"><span class="spec-k">Estimated Weight</span><span class="spec-v">${p.estimatedWeight}</span></div>` : ''}
        ${p.shankDiameter ? `<div class="spec-row"><span class="spec-k">Shank Diameter</span><span class="spec-v">${p.shankDiameter}</span></div>` : ''}
        ${p.stoneSize ? `<div class="spec-row"><span class="spec-k">Stone Size</span><span class="spec-v">${p.stoneSize}</span></div>` : ''}
        ${p.settingType ? `<div class="spec-row"><span class="spec-k">Setting Type</span><span class="spec-v">${p.settingType}</span></div>` : ''}
        ${p.wallThickness ? `<div class="spec-row"><span class="spec-k">Wall Thickness</span><span class="spec-v">${p.wallThickness}</span></div>` : ''}
        ${p.fileFormats?.length ? `<div class="spec-row"><span class="spec-k">File Formats</span><span class="spec-v">${p.fileFormats.join(', ')}</span></div>` : ''}
        ${p.compatibleMetals?.length ? `<div class="spec-row"><span class="spec-k">Compatible Metals</span><span class="spec-v">${p.compatibleMetals.join(', ')}</span></div>` : ''}
      </div>
      <div class="print-badge">
        <div class="print-icon">✓</div>
        <div class="print-txt">Tested for 3D Printing & Casting<span>Verified by The Vault's master jeweler certification board</span></div>
      </div>`;
  }

  const imgWrap = document.querySelector('#page-product .pdp-main-img');
  if (imgWrap) {
    imgWrap.innerHTML = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.title}" style="max-width:100%;max-height:100%;object-fit:contain">`
      : `<svg width="280" height="280" viewBox="0 0 280 280"><text x="140" y="150" text-anchor="middle" font-size="120">${theme.emoji}</text></svg>`;
  }
}

async function addToCart(productId) {
  if (!VaultAuth.isLoggedIn()) {
    showToast('✖  Please sign in first', '✖');
    showPage('login');
    return;
  }
  try {
    await VaultAPI.cartAdd(productId, 1);
    showToast('✦  Added to vault');
    updateHeaderBadges();
  } catch (e) {
    showToast(`✖  ${e.message}`, '✖');
  }
}

async function loadCartPage() {
  const itemsEl = document.querySelector('#page-cart .cart-items');
  const sumEl = document.querySelector('#page-cart .cart-summary');
  if (!itemsEl) return;

  if (!VaultAuth.isLoggedIn()) {
    itemsEl.innerHTML = `<div style="padding:60px 0;text-align:center;color:var(--muted);font-family:'Inter',sans-serif">Please <a onclick="showPage('login')" style="color:var(--gold);cursor:pointer">sign in</a> to view your cart.</div>`;
    if (sumEl) sumEl.style.display = 'none';
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = '0'; });
    return;
  }
  itemsEl.innerHTML = `<div style="padding:60px 0;text-align:center;color:var(--muted)">Loading…</div>`;
  if (sumEl) sumEl.style.display = '';

  try {
    const r = await VaultAPI.cart();
    const items = (r.items || []).filter(i => i.product);
    if (!items.length) {
      itemsEl.innerHTML = `<div style="padding:60px 0;text-align:center;color:var(--muted);font-family:'Inter',sans-serif">Your cart is empty. <a onclick="showPage('collection')" style="color:var(--gold);cursor:pointer">Browse designs →</a></div>`;
      renderCartSummary(0, 0);
      document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = '0'; });
      return;
    }
    itemsEl.innerHTML = items.map(it => {
      const p = it.product;
      const theme = CATEGORY_THEME[p.category] || { emoji: '💎' };
      return `<div class="cart-item">
        <div class="ci-img">${p.imageUrl
          ? `<img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`
          : theme.emoji}</div>
        <div class="ci-info">
          <div class="ci-cat">${p.category || ''}</div>
          <div class="ci-name">${p.title}${p.subtitle ? ' — ' + p.subtitle : ''}</div>
          <div class="ci-fmt">${(p.fileFormats || []).join(' + ')} · ${p.licenseType || 'Commercial'} License</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
            <button class="tbl-action-btn" onclick="changeCartQty('${p._id}',${it.quantity - 1})">−</button>
            <span style="font-family:'Inter',sans-serif">${it.quantity}</span>
            <button class="tbl-action-btn" onclick="changeCartQty('${p._id}',${it.quantity + 1})">+</button>
          </div>
        </div>
        <div class="ci-price">$${(it.total || 0).toFixed(2)}</div>
        <button class="ci-rm" onclick="removeCartItem('${p._id}')">✕</button>
      </div>`;
    }).join('');
    renderCartSummary(r.subtotal || 0, items.length);
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = items.length;
    });
  } catch (e) {
    itemsEl.innerHTML = `<div style="padding:60px 0;text-align:center;color:var(--muted)">Could not load cart.</div>`;
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = '0'; });
  }
}

function renderCartSummary(subtotal, count) {
  const sum = document.querySelector('#page-cart .cart-summary');
  if (!sum) return;
  const vat = subtotal * 0.20;
  const total = subtotal + vat;
  sum.innerHTML = `
    <div class="cs-title">Order Summary</div>
    <div class="cs-row"><span class="cs-lbl">Subtotal (${count} item${count !== 1 ? 's' : ''})</span><span class="cs-val">$${subtotal.toFixed(2)}</span></div>
    <div class="cs-row"><span class="cs-lbl">VAT (20%)</span><span class="cs-val">$${vat.toFixed(2)}</span></div>
    <div class="cs-row"><span class="cs-lbl">Digital Delivery</span><span class="cs-val" style="color:var(--emerald)">Free</span></div>
    <div class="promo-wrap">
      <input class="promo-inp" id="couponInput" type="text" placeholder="Promo code">
      <button class="promo-btn" onclick="applyCoupon()">Apply</button>
    </div>
    <div class="cs-total"><span>Total</span><span class="cs-total-val">$${total.toFixed(2)}</span></div>
    <button class="btn-gold-lg" style="width:100%;margin-top:20px;border-radius:10px" onclick="checkout()">Proceed to Checkout</button>
    <div class="cart-trust">
      <div class="ct-badge"><span>🔒</span> Secure checkout · SSL encrypted</div>
      <div class="ct-badge"><span>⚡</span> Instant download after payment</div>
      <div class="ct-badge"><span>↩</span> 30-day satisfaction guarantee</div>
    </div>`;
}

async function changeCartQty(productId, qty) {
  if (qty < 1) return removeCartItem(productId);
  try {
    await VaultAPI.cartUpdate(productId, qty);
    loadCartPage();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

async function removeCartItem(productId) {
  try {
    await VaultAPI.cartRemove(productId);
    showToast('✦  Removed from cart');
    loadCartPage();
    updateHeaderBadges();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

async function applyCoupon() {
  const inp = document.getElementById('couponInput');
  if (!inp) return;
  const code = inp.value.trim();
  if (!code) return;
  try {
    const subtotalEl = document.querySelector('#page-cart .cs-row .cs-val');
    const basketTotal = parseFloat((subtotalEl?.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
    const r = await VaultAPI.couponApply(code, basketTotal);
    showToast(`✦  ${r.message || 'Coupon applied'}`);
  } catch (e) {
    showToast(`✖  ${e.message}`, '✖');
  }
}

async function checkout() {
  if (!VaultAuth.isLoggedIn()) { showPage('login'); return; }
  try {
    const cart = await VaultAPI.cart();
    const items = (cart.items || []).filter(i => i.product);
    if (!items.length) { showToast('✖  Your cart is empty', '✖'); return; }
    const user = VaultAuth.getUser() || {};
    const payload = {
      items: items.map(i => ({ productId: i.product._id, quantity: i.quantity })),
      billingAddress: {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        country: 'India',
      },
      paymentMethod: 'upi',
    };
    await VaultAPI.orderCreate(payload);
    showToast('✦  Order placed — check your orders');
    await VaultAPI.cartClear();
    updateHeaderBadges();
    showPage('home');
  } catch (e) {
    showToast(`✖  ${e.message}`, '✖');
  }
}

async function toggleWishlist(productId, el) {
  if (!VaultAuth.isLoggedIn()) {
    showToast('✖  Please sign in first', '✖');
    showPage('login');
    return;
  }
  try {
    const isLiked = el.classList.contains('liked');
    if (isLiked) {
      await VaultAPI.wishlistRemove(productId);
      el.classList.remove('liked');
      el.textContent = '♡';
      showToast('✦  Removed from wishlist');
    } else {
      await VaultAPI.wishlistAdd(productId);
      el.classList.add('liked');
      el.textContent = '♥';
      showToast('✦  Saved to wishlist');
    }
    updateHeaderBadges();
    if (document.getElementById('page-wishlist')?.classList.contains('active')) loadWishlistPage();
  } catch (e) {
    if (e.message.includes('already in wishlist')) {
      el.classList.add('liked');
      el.textContent = '♥';
    } else {
      showToast(`✖  ${e.message}`, '✖');
    }
  }
}

async function loadWishlistPage() {
  const grid = document.querySelector('#page-wishlist .wl-grid');
  if (!grid) return;

  if (!VaultAuth.isLoggedIn()) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:60px 0;text-align:center;color:var(--muted);font-family:'Inter',sans-serif">Please <a onclick="showPage('login')" style="color:var(--gold);cursor:pointer">sign in</a> to view your wishlist.</div>`;
    document.querySelectorAll('[data-wishlist-count]').forEach(el => { el.textContent = '0'; });
    return;
  }
  grid.innerHTML = `<div style="grid-column:1/-1;padding:60px 0;text-align:center;color:var(--muted)">Loading…</div>`;

  try {
    const r = await VaultAPI.wishlist();
    const items = (r.data?.products || []).filter(i => i.product);
    if (!items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:60px 0;text-align:center;color:var(--muted);font-family:'Inter',sans-serif">Your wishlist is empty. <a onclick="showPage('collection')" style="color:var(--gold);cursor:pointer">Browse designs →</a></div>`;
      document.querySelectorAll('[data-wishlist-count]').forEach(el => { el.textContent = '0'; });
      return;
    }
    grid.innerHTML = items.map(it => {
      const p = it.product;
      const theme = CATEGORY_THEME[p.category] || { emoji: '💎', bg: 'linear-gradient(135deg,#120d1a,#1a1226)' };
      const price = p.salePrice || p.price || 0;
      return `<div class="wl-card" onclick="openProduct('${p._id}')">
        <div class="wl-rm" onclick="event.stopPropagation();toggleWishlist('${p._id}',this)">✕</div>
        <div class="wl-img" style="background:${theme.bg};font-size:56px;align-items:center;justify-content:center;display:flex;">
          ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:cover">` : theme.emoji}
        </div>
        <div class="wl-body">
          <div class="wl-cat">${p.category || ''}</div>
          <div class="wl-name">${p.title}${p.subtitle ? ' — ' + p.subtitle : ''}</div>
          <div class="wl-foot">
            <div class="wl-price">$${price}</div>
            <button class="wl-add" onclick="event.stopPropagation();addToCart('${p._id}')">Add to Cart</button>
          </div>
        </div>
      </div>`;
    }).join('');
    document.querySelectorAll('[data-wishlist-count]').forEach(el => {
      el.textContent = items.length;
    });
  } catch (e) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:60px 0;text-align:center;color:var(--muted)">Could not load wishlist.</div>`;
    document.querySelectorAll('[data-wishlist-count]').forEach(el => { el.textContent = '0'; });
  }
}

async function updateHeaderBadges() {
  try {
    if (!VaultAuth.isLoggedIn()) {
      document.querySelectorAll('.hdr-badge').forEach(b => { b.textContent = '0'; b.style.display = 'none'; });
      return;
    }
    const [cart, wish] = await Promise.allSettled([VaultAPI.cart(), VaultAPI.wishlist()]);
    const cartCount = cart.status === 'fulfilled' ? (cart.value.items?.length || 0) : 0;
    const wishCount = wish.status === 'fulfilled' ? (wish.value.data?.products?.length || 0) : 0;
    const badges = document.querySelectorAll('.hdr-badge');
    if (badges[0]) { badges[0].textContent = wishCount; badges[0].style.display = wishCount > 0 ? 'flex' : 'none'; }
    if (badges[1]) { badges[1].textContent = cartCount; badges[1].style.display = cartCount > 0 ? 'flex' : 'none'; }
  } catch (e) { }
}

function updateAuthUI() {
  const user = VaultAuth.getUser();
  const loginBtns = document.querySelectorAll('header .btn-gold');
  loginBtns.forEach(btn => {
    if (user) {
      btn.textContent = user.name?.split(' ')[0] || 'Account';
      btn.onclick = () => showPage('wishlist');
    } else {
      btn.textContent = 'Sign In';
      btn.onclick = () => showPage('login');
    }
  });
}

async function doLogin(e) {
  if (e) e.preventDefault();
  if (__authInFlight) return;
  __authInFlight = true;

  const btn = e?.target || document.querySelector('#page-login button.btn-gold-lg');
  const originalText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const email = document.getElementById('loginEmail')?.value.trim();
    const pass = document.getElementById('loginPassword')?.value;
    if (!email || !pass) {
      showToast('✖  Email and password required', '✖');
      return;
    }
    const r = await VaultAPI.login(email, pass);
    VaultAuth.setSession(r.token, r.user);
    showToast('✦  Welcome back!');
    updateAuthUI();
    updateHeaderBadges();
    showPage('home');
  } catch (err) {
    showToast(`✖  ${err.message}`, '✖');
  } finally {
    __authInFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = originalText; }
  }
}

async function doRegister(e) {
  if (e) e.preventDefault();
  if (__authInFlight) return;
  __authInFlight = true;

  const btn = e?.target || document.querySelector('#page-register button.btn-gold-lg');
  const originalText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  try {
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const pass = document.getElementById('regPassword')?.value;
    if (!name || !email || !pass) {
      showToast('✖  All fields are required', '✖');
      return;
    }
    const r = await VaultAPI.register({ name, email, password: pass });
    VaultAuth.setSession(r.token, r.user);
    showToast('✦  Account created!');
    updateAuthUI();
    updateHeaderBadges();
    showPage('home');
  } catch (err) {
    showToast(`✖  ${err.message}`, '✖');
  } finally {
    __authInFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = originalText; }
  }
}

async function doGoogleLogin() {
  if (__authInFlight) return;
  if (typeof window.FirebaseGoogle === 'undefined') {
    showToast('⚠  Google sign-in still loading — try again in a moment', '⚠');
    return;
  }
  __authInFlight = true;
  try {
    const { idToken } = await window.FirebaseGoogle.signIn();
    const r = await VaultAPI.firebaseGoogleLogin(idToken);
    VaultAuth.setSession(r.token, r.user);
    showToast(r.isNewUser ? '✦  Welcome to The Vault!' : '✦  Welcome back!');
    updateAuthUI();
    updateHeaderBadges();
    showPage('home');
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return;
    if (err.code === 'auth/popup-blocked') {
      showToast('✖  Popup blocked — allow popups for this site', '✖');
      return;
    }
    if (err.code === 'auth/cancelled-popup-request') return;
    showToast(`✖  ${err.message || 'Google login failed'}`, '✖');
  } finally {
    __authInFlight = false;
  }
}

function doLogout() {
  VaultAuth.clear();
  if (window.FirebaseGoogle) window.FirebaseGoogle.signOut().catch(() => { });
  updateAuthUI();
  updateHeaderBadges();
  showToast('✦  Signed out');
  showPage('home');
}

function initSlider(trackId, afterId, divId) {
  const track = document.getElementById(trackId);
  const after = document.getElementById(afterId);
  const div = document.getElementById(divId);
  if (!track || !after || !div) return;
  let dragging = false, autoDir = 1, autoPct = 50, autoRunning = true;
  function setSlider(x) {
    const r = track.getBoundingClientRect();
    const pct = Math.min(Math.max(((x - r.left) / r.width) * 100, 2), 98);
    after.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    div.style.left = pct + '%';
  }
  div.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });
  track.addEventListener('mousedown', e => { dragging = true; setSlider(e.clientX); autoRunning = false; e.preventDefault(); });
  document.addEventListener('mousemove', e => { if (dragging) setSlider(e.clientX); });
  document.addEventListener('mouseup', () => dragging = false);
  track.addEventListener('touchstart', e => { dragging = true; setSlider(e.touches[0].clientX); autoRunning = false; }, { passive: true });
  document.addEventListener('touchmove', e => { if (dragging) setSlider(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchend', () => dragging = false);
  function autoAnim() {
    if (!autoRunning) return;
    autoPct += autoDir * 0.3; if (autoPct > 75) autoDir = -1; if (autoPct < 25) autoDir = 1;
    after.style.clipPath = `inset(0 ${100 - autoPct}% 0 0)`;
    div.style.left = autoPct + '%';
    requestAnimationFrame(autoAnim);
  }
  autoAnim();
}
initSlider('baTrack', 'baAfter', 'baDiv');
initSlider('baTrack2', 'baAfter2', 'baDiv2');

let spinAngle = 0, autoSpinning = true, spinAF = null;
let spinDragging = false, spinStartX = 0, spinStartAngle = 0;
const spinSvg = document.getElementById('spinSvg');
const spinFill = document.getElementById('spinFill');
const spinDeg = document.getElementById('spinDeg');
const spinDisplay = document.getElementById('spinDisplay');

function updateSpin() {
  if (!spinSvg) return;
  const scale = Math.cos((spinAngle * Math.PI) / 180);
  spinSvg.style.transform = `scaleX(${Math.max(scale, 0.12)})`;
  if (spinFill) spinFill.style.width = ((spinAngle % 360) / 360 * 100) + '%';
  if (spinDeg) spinDeg.textContent = Math.round(spinAngle % 360) + '°';
}
function spinStep(d) { spinAngle = (spinAngle + d + 360) % 360; updateSpin(); }
function spinSeek(e) {
  const r = document.getElementById('spinTrack')?.getBoundingClientRect();
  if (!r) return;
  spinAngle = ((e.clientX - r.left) / r.width) * 360;
  updateSpin();
}
function toggleAutoSpin() {
  autoSpinning = !autoSpinning;
  const btn = document.getElementById('spinPlayBtn');
  if (btn) {
    btn.classList.toggle('active', autoSpinning);
    btn.textContent = autoSpinning ? '▶' : '⏸';
  }
  if (autoSpinning) doAutoSpin();
}
function doAutoSpin() {
  if (!autoSpinning) return;
  spinAngle = (spinAngle + 0.5) % 360;
  updateSpin();
  spinAF = requestAnimationFrame(doAutoSpin);
}
doAutoSpin();
if (spinDisplay) {
  spinDisplay.addEventListener('mousedown', e => {
    spinDragging = true; spinStartX = e.clientX; spinStartAngle = spinAngle; autoSpinning = false;
    cancelAnimationFrame(spinAF);
    const b = document.getElementById('spinPlayBtn');
    if (b) { b.classList.remove('active'); b.textContent = '▶'; }
  });
  document.addEventListener('mousemove', e => { if (spinDragging) { spinAngle = (spinStartAngle + (e.clientX - spinStartX) * 0.5 + 360) % 360; updateSpin(); } });
  document.addEventListener('mouseup', () => spinDragging = false);
  spinDisplay.addEventListener('touchstart', e => { spinDragging = true; spinStartX = e.touches[0].clientX; spinStartAngle = spinAngle; autoSpinning = false; cancelAnimationFrame(spinAF); }, { passive: true });
  document.addEventListener('touchmove', e => { if (spinDragging) { spinAngle = (spinStartAngle + (e.touches[0].clientX - spinStartX) * 0.5 + 360) % 360; updateSpin(); } }, { passive: true });
  document.addEventListener('touchend', () => spinDragging = false);
}

function initAboutReveal() {
  if (window.__aboutRevealBound) return;
  window.__aboutRevealBound = true;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('#page-about .reveal, #page-about .reveal-left, #page-about .reveal-right')
    .forEach(el => obs.observe(el));
}

document.querySelectorAll('.thumb').forEach(t => {
  t.addEventListener('click', function () {
    document.querySelectorAll('.thumb').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
  });
});

function openAdminLogin() {
  document.getElementById('adminLoginOverlay').style.display = 'flex';
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
  document.getElementById('adminLoginErr').textContent = '';
  setTimeout(() => document.getElementById('adminUser').focus(), 100);
}
function closeAdminLogin() {
  document.getElementById('adminLoginOverlay').style.display = 'none';
}

async function doAdminLogin() {
  if (__authInFlight) return;
  __authInFlight = true;
  const errEl = document.getElementById('adminLoginErr');
  errEl.textContent = '';
  try {
    const email = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value;
    const r = await VaultAPI.login(email, pass);
    if (r.user?.role !== 'admin') {
      errEl.textContent = '✖ This account does not have admin access.';
      VaultAuth.clear();
      return;
    }
    VaultAuth.setSession(r.token, r.user);
    closeAdminLogin();
    showPage('admin');
  } catch (e) {
    errEl.textContent = `✖ ${e.message || 'Login failed'}`;
  } finally {
    __authInFlight = false;
  }
}

async function doAdminGoogleLogin() {
  if (__authInFlight) return;
  const errEl = document.getElementById('adminLoginErr');
  errEl.textContent = '';
  if (typeof window.FirebaseGoogle === 'undefined') {
    errEl.textContent = 'Google sign-in is loading, try again.';
    return;
  }
  __authInFlight = true;
  try {
    const { idToken } = await window.FirebaseGoogle.signIn();
    const r = await VaultAPI.firebaseGoogleLogin(idToken);
    if (r.user?.role !== 'admin') {
      errEl.textContent = '✖ This account does not have admin access.';
      VaultAuth.clear();
      return;
    }
    VaultAuth.setSession(r.token, r.user);
    closeAdminLogin();
    showPage('admin');
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user') return;
    errEl.textContent = `✖ ${e.message || 'Google login failed'}`;
  } finally {
    __authInFlight = false;
  }
}

function adminLogout() {
  VaultAuth.clear();
  if (window.FirebaseGoogle) window.FirebaseGoogle.signOut().catch(() => { });
  updateAuthUI();
  showPage('home');
}

function switchAdminTab(tab, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('atab-' + tab)?.classList.add('active');
  document.querySelectorAll('.admin-nav-item').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { dashboard: 'Dashboard', products: 'Products', orders: 'Orders', users: 'Users', analytics: 'Analytics', settings: 'Settings' };
  document.getElementById('adminTabTitle').textContent = titles[tab] || tab;
  if (tab === 'analytics') renderAnalytics();
}

async function initAdminPage() {
  if (!VaultAuth.isAdmin()) {
    showToast('✖  Admin access required', '✖');
    showPage('home');
    return;
  }
  await Promise.all([
    loadAdminKPIs(),
    loadAdminOrders(),
    loadAdminProducts(),
    loadAdminUsers(),
  ]);
}

async function loadAdminKPIs() {
  try {
    const r = await VaultAPI.adminStats();
    const s = r.stats || {};
    animateCount('kpiRevenue', s.totalRevenue || 0, '$', '');
    animateCount('kpiOrders', s.totalOrders || 0, '', '');
    animateCount('kpiUsers', s.totalUsers || 0, '', '');
    animateCount('kpiDesigns', s.totalProducts || 0, '', '');
    renderRevenueChart(r.revenueByMonth || []);
    renderOrderTable('dashRecentOrders', r.recentOrders || [], false);
  } catch (e) {
    showToast(`✖  ${e.message}`, '✖');
  }
}

function animateCount(id, target, prefix, suffix) {
  const el = document.getElementById(id);
  if (!el) return;
  let startTime = null;
  const duration = 1200;
  function step(ts) {
    if (!startTime) startTime = ts;
    const prog = Math.min((ts - startTime) / duration, 1);
    const val = Math.round(prog * target);
    el.textContent = prefix + val.toLocaleString() + suffix;
    if (prog < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderRevenueChart(rows) {
  const chart = document.getElementById('revenueChart');
  if (!chart) return;
  if (!rows.length) { chart.innerHTML = `<div style="color:var(--muted);font-family:'Inter',sans-serif;font-size:12px">No revenue data yet.</div>`; return; }
  const max = Math.max(...rows.map(r => r.revenue)) || 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  chart.innerHTML = rows.map(r => {
    const pct = (r.revenue / max * 100).toFixed(1);
    const m = months[(r._id.month || 1) - 1];
    return `<div class="rev-bar-wrap">
      <div class="rev-bar-val">$${(r.revenue / 1000).toFixed(1)}k</div>
      <div class="rev-bar" style="height:${pct}%;min-height:6px" title="${m}: $${r.revenue.toLocaleString()}"></div>
      <div class="rev-bar-lbl">${m}</div>
    </div>`;
  }).join('');
}

function statusClass(s) {
  return { Delivered: 'delivered', Processing: 'processing', Pending: 'pending', Refunded: 'refunded', completed: 'delivered', processing: 'processing', pending: 'pending', refunded: 'refunded', cancelled: 'refunded' }[s] || 'pending';
}

function renderOrderTable(tableId, orders, showActions) {
  const t = document.getElementById(tableId);
  if (!t) return;
  t.innerHTML = `<thead><tr>
    <th>Order ID</th><th>Customer</th><th>Total</th><th>Date</th><th>Status</th>
    ${showActions ? '<th>Action</th>' : ''}
  </tr></thead><tbody>` +
    (orders.length ? orders.map(o => {
      const date = new Date(o.orderDate || o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const customer = o.customer?.name || o.billingAddress?.name || '—';
      const status = (o.status || 'pending').replace(/^./, c => c.toUpperCase());
      return `<tr>
      <td style="color:var(--gold);font-weight:600">${o.orderNumber || o._id}</td>
      <td>${customer}</td>
      <td style="font-weight:600">$${(o.totalAmount || 0).toFixed(2)}</td>
      <td style="color:var(--muted)">${date}</td>
      <td><span class="status-badge status-${statusClass(o.status)}">${status}</span></td>
      ${showActions ? `<td>
        <button class="tbl-action-btn" onclick="cycleOrderStatus('${o._id}','${o.status}')">Change</button>
      </td>` : ''}
    </tr>`;
    }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px 0">No orders yet.</td></tr>`) + '</tbody>';
}

const ORDER_FLOW = ['pending', 'processing', 'completed', 'refunded'];
async function cycleOrderStatus(orderId, currentStatus) {
  const idx = ORDER_FLOW.indexOf(currentStatus);
  const next = ORDER_FLOW[(idx + 1) % ORDER_FLOW.length];
  try {
    await VaultAPI.adminOrderStatus(orderId, next);
    showToast(`✦  Order → ${next}`);
    loadAdminOrders();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

async function loadAdminOrders() {
  try {
    const r = await VaultAPI.adminOrders('?limit=50');
    const orders = r.data || [];
    renderOrderTable('ordersTable', orders, true);
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

function filterOrders() {
  const q = (document.getElementById('orderSearch')?.value || '').toLowerCase();
  const sf = (document.getElementById('orderStatusFilter')?.value || '').toLowerCase();
  const rows = document.querySelectorAll('#ordersTable tbody tr');
  rows.forEach(tr => {
    const text = tr.textContent.toLowerCase();
    tr.style.display = (!q || text.includes(q)) && (!sf || text.includes(sf)) ? '' : 'none';
  });
}

async function loadAdminProducts() {
  try {
    const r = await VaultAPI.adminProducts('?limit=100');
    window.__adminProducts = r.data || [];
    renderProductsTable();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

function renderProductsTable() {
  const t = document.getElementById('productsTable');
  if (!t) return;
  const q = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  const list = (window.__adminProducts || []).filter(p =>
    !q || (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
  );
  t.innerHTML = `<thead><tr>
    <th>Title</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th>
  </tr></thead><tbody>` +
    (list.length ? list.map(p => `<tr>
    <td><strong>${p.title}</strong><div style="font-size:11px;color:var(--muted)">${p.subtitle || ''}</div></td>
    <td style="color:var(--muted)">${p.category || ''}</td>
    <td style="font-weight:600">$${p.salePrice || p.price || 0}</td>
    <td><span class="status-badge ${p.isActive ? 'status-delivered' : 'status-pending'}">${p.isActive ? 'Active' : 'Inactive'}</span></td>
    <td>
      <button class="tbl-action-btn" onclick="editProduct('${p._id}')">Edit</button>
      <button class="tbl-action-btn danger" onclick="deleteProductAdmin('${p._id}')">Delete</button>
    </td>
  </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px 0">No products.</td></tr>`) + '</tbody>';
}

function filterProducts() { renderProductsTable(); }

let editingProductId = null;
function openAddProduct() {
  editingProductId = null;
  document.getElementById('prodModalTitle').textContent = '+ Add Product';
  ['pf-title', 'pf-sub', 'pf-specs', 'pf-price', 'pf-weight'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const fi = document.getElementById('pf-image'); if (fi) fi.value = '';
  document.getElementById('adminProductModal').style.display = 'flex';
}
function editProduct(id) {
  const p = (window.__adminProducts || []).find(x => x._id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('prodModalTitle').textContent = 'Edit Product';
  document.getElementById('pf-title').value = p.title || '';
  document.getElementById('pf-sub').value = p.subtitle || '';
  document.getElementById('pf-cat').value = p.category || 'Engagement Ring';
  document.getElementById('pf-price').value = p.salePrice || p.price || '';
  document.getElementById('pf-specs').value = (p.specs || []).join(', ');
  document.getElementById('pf-weight').value = p.estimatedWeight || '';
  document.getElementById('pf-badge').value = p.badge || '';
  document.getElementById('adminProductModal').style.display = 'flex';
}
function closeProductModal() {
  document.getElementById('adminProductModal').style.display = 'none';
}
async function saveProduct() {
  const title = document.getElementById('pf-title').value.trim();
  if (!title) { showToast('✖  Title required', '✖'); return; }
  const fd = new FormData();
  fd.append('title', title);
  fd.append('subtitle', document.getElementById('pf-sub').value.trim());
  fd.append('category', document.getElementById('pf-cat').value);
  fd.append('price', document.getElementById('pf-price').value || '0');
  fd.append('specs', document.getElementById('pf-specs').value);
  fd.append('estimatedWeight', document.getElementById('pf-weight').value);
  fd.append('badge', document.getElementById('pf-badge').value);
  const fileInput = document.getElementById('pf-image');
  if (fileInput?.files?.[0]) fd.append('image', fileInput.files[0]);

  try {
    if (editingProductId) {
      await VaultAPI.adminProductUpdate(editingProductId, fd);
      showToast('✦  Product updated');
    } else {
      await VaultAPI.adminProductCreate(fd);
      showToast('✦  Product added');
    }
    closeProductModal();
    loadAdminProducts();
    populateDynamicNumbers();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}
async function deleteProductAdmin(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await VaultAPI.adminProductDelete(id);
    showToast('✦  Product deleted');
    loadAdminProducts();
    populateDynamicNumbers();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

async function loadAdminUsers() {
  try {
    const r = await VaultAPI.adminUsers();
    window.__adminUsers = r.users || [];
    renderUsersTable();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

function renderUsersTable() {
  const t = document.getElementById('usersTable');
  if (!t) return;
  const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
  const rf = (document.getElementById('userRoleFilter')?.value || '');
  const list = (window.__adminUsers || []).filter(u =>
    (!q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) &&
    (!rf || u.role === rf)
  );
  t.innerHTML = `<thead><tr>
    <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Actions</th>
  </tr></thead><tbody>` +
    (list.length ? list.map(u => `<tr>
    <td><strong>${u.name || '—'}</strong></td>
    <td style="color:var(--muted)">${u.email || '—'}</td>
    <td style="color:var(--muted)">${u.phone || '—'}</td>
    <td><span class="status-badge ${u.role === 'admin' ? 'status-processing' : 'status-delivered'}">${u.role}</span></td>
    <td style="color:var(--muted)">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
    <td>
      <button class="tbl-action-btn danger" onclick="deleteUserAdmin('${u._id}')">Delete</button>
    </td>
  </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px 0">No users.</td></tr>`) + '</tbody>';
}

function filterUsers() { renderUsersTable(); }

async function deleteUserAdmin(id) {
  if (!confirm('Delete this user?')) return;
  try {
    await VaultAPI.adminUserDelete(id);
    showToast('✦  User deleted');
    loadAdminUsers();
    populateDynamicNumbers();
  } catch (e) { showToast(`✖  ${e.message}`, '✖'); }
}

function renderAnalytics() {
  const tpb = document.getElementById('topProductsBars');
  if (!tpb || tpb.children.length) return;
  const list = (window.__adminProducts || []).slice(0, 6);
  const max = Math.max(...list.map(p => p.downloadCount || 1), 1);
  tpb.innerHTML = list.map(p => `
    <div class="tpb-item">
      <div class="tpb-name">${p.title}</div>
      <div class="tpb-bar-wrap"><div class="tpb-bar" style="width:0%" data-w="${((p.downloadCount || 0) / max * 100).toFixed(1)}"></div></div>
      <div class="tpb-val">${p.downloadCount || 0} downloads</div>
    </div>
  `).join('');
  setTimeout(() => tpb.querySelectorAll('.tpb-bar').forEach(b => b.style.width = b.dataset.w + '%'), 80);
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  updateHeaderBadges();
  populateDynamicNumbers();

  const gBtn = document.getElementById('googleLoginBtn');
  if (gBtn) gBtn.addEventListener('click', doGoogleLogin);
});