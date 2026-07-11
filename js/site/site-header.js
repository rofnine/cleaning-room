const NAV_ITEMS = Object.freeze([
  { id: 'services', label: '청소 서비스', href: './index.html#services' },
  { id: 'pricing', label: '가격 안내', href: './pricing.html' },
  { id: 'cases', label: '작업사례', href: './cases.html' },
]);

const COMMUNITY_ITEMS = Object.freeze([
  { id: 'notice', label: '공지사항', href: './notice.html' },
  { id: 'faq', label: '자주 묻는 질문', href: './faq.html' },
  { id: 'inquiry', label: '문의', href: './inquiry.html' },
]);

function currentAttribute(active, id) {
  return active === id ? ' aria-current="page"' : '';
}

function pageFromPath(pathname) {
  const name = String(pathname || '').split('/').pop() || 'index.html';
  return ({
    'pricing.html': 'pricing',
    'order.html': 'booking',
    'cases.html': 'cases',
    'inquiry.html': 'inquiry',
    'notice.html': 'notice',
    'faq.html': 'faq',
    'mypage.html': 'mypage',
  })[name] || 'home';
}

function renderHeader(header) {
  const active = header.dataset.currentPage || pageFromPath(location.pathname);
  const communityActive = COMMUNITY_ITEMS.some((item) => item.id === active);
  const primaryLinks = NAV_ITEMS.map((item) => (
    `<a class="site-nav-link" href="${item.href}"${currentAttribute(active, item.id)}>${item.label}</a>`
  )).join('');
  const communityLinks = COMMUNITY_ITEMS.map((item) => (
    `<a href="${item.href}"${currentAttribute(active, item.id)}>${item.label}<span aria-hidden="true"></span></a>`
  )).join('');

  header.innerHTML = `
    <div class="container header-container">
      <a href="./index.html" class="logo site-logo" aria-label="두껍아 두껍아 홈으로 이동">
        <img class="site-logo-image" src="./logo-mark.png" alt="두껍아 두껍아 입주청소 로고">
        <span class="logo-text">두껍아 두껍아</span>
      </a>
      <nav class="nav" aria-label="주요 메뉴" data-mobile-nav>
        <div class="nav-primary">
          ${primaryLinks}
          <div class="community-nav">
            <button type="button" class="site-nav-link community-trigger" data-community-trigger aria-expanded="false"${communityActive ? ' aria-current="page"' : ''}>
              COMMUNITY <span class="community-caret" aria-hidden="true"></span>
            </button>
            <div class="community-menu" data-community-menu hidden>${communityLinks}</div>
          </div>
        </div>
        <div class="nav-actions">
          <div class="nav-utilities" aria-label="회원 메뉴">
            <a class="nav-quiet-link" href="./auth.html?mode=signup" data-signup-link>회원가입</a>
            <a class="nav-quiet-link" href="./auth.html" data-account-link>로그인</a>
            <button class="nav-quiet-link nav-logout-button" type="button" data-logout-link hidden>로그아웃</button>
            <a class="nav-quiet-link" href="./mypage.html" data-mypage-link hidden>마이페이지</a>
          </div>
          <div class="header-actions">
            <a class="header-phone-action" href="tel:010-8246-1832">지금 바로 상담</a>
            <a class="header-booking-action" href="./order.html?kind=booking">희망일정 예약</a>
          </div>
        </div>
      </nav>
      <button class="mobile-menu-btn" type="button" aria-label="메뉴 열기" aria-expanded="false" data-mobile-menu>
        <span></span><span></span><span></span>
      </button>
    </div>`;
}

function initHeader(header) {
  renderHeader(header);
  document.dispatchEvent(new CustomEvent('site-header-rendered'));
  const menuButton = header.querySelector('[data-mobile-menu]');
  const mobileNav = header.querySelector('[data-mobile-nav]');
  const communityTrigger = header.querySelector('[data-community-trigger]');
  const communityMenu = header.querySelector('[data-community-menu]');
  const communityNav = communityTrigger.closest('.community-nav');
  const isOverlayHeader = header.dataset.overlayHeader !== undefined;

  const setMobileOpen = (open) => {
    mobileNav.classList.toggle('is-open', open);
    menuButton.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  };
  const setCommunityOpen = (open) => {
    communityMenu.hidden = !open;
    communityTrigger.setAttribute('aria-expanded', String(open));
    communityNav.classList.toggle('is-open', open);
  };
  const updateHeaderTone = () => {
    if (isOverlayHeader) header.classList.toggle('scrolled', window.scrollY > 24);
  };

  menuButton.addEventListener('click', () => setMobileOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMobileOpen(false)));
  communityTrigger.addEventListener('click', () => {
    const desktop = window.matchMedia('(min-width: 901px)').matches;
    setCommunityOpen(desktop ? true : communityTrigger.getAttribute('aria-expanded') !== 'true');
  });
  communityNav.addEventListener('pointerenter', () => {
    if (window.matchMedia('(min-width: 901px)').matches) setCommunityOpen(true);
  });
  communityNav.addEventListener('pointerleave', () => {
    if (window.matchMedia('(min-width: 901px)').matches) setCommunityOpen(false);
  });
  communityNav.addEventListener('focusin', () => setCommunityOpen(true));
  communityNav.addEventListener('focusout', (event) => {
    if (!communityNav.contains(event.relatedTarget)) setCommunityOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!communityNav.contains(event.target)) setCommunityOpen(false);
    if (!header.contains(event.target)) setMobileOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setCommunityOpen(false);
      setMobileOpen(false);
    }
  });

  updateHeaderTone();
  if (isOverlayHeader) window.addEventListener('scroll', updateHeaderTone, { passive: true });
}

document.querySelectorAll('[data-site-header]').forEach(initHeader);
