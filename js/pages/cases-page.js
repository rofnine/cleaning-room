import { getSupabase } from '../lib/supabase.js';
import { BLOG_CASES, classifyBlogCase, normalizeBlogPost } from '../content/blog-cases.js';

const CATEGORY_LABELS = Object.freeze({ move_in: '입주청소', move_out: '이사청소', occupied: '거주청소', special: '특수케어' });

function text(value, fallback = '') { return String(value || fallback); }
function dateLabel(value) { return value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value)) : ''; }

export function classifyCase(post) {
  return classifyBlogCase(post)[0] || 'move_in';
}

function createPhotoPlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.className = 'case-card-placeholder';
  placeholder.innerHTML = '<span>두껍아 두껍아</span><b>현장사진 준비 중</b>';
  return placeholder;
}

function mergeLiveCases(rows = []) {
  const fallbackByUrl = new Map(BLOG_CASES.map((item) => [item.url, item]));
  const live = rows.map((row) => {
    const fallback = fallbackByUrl.get(row.url);
    fallbackByUrl.delete(row.url);
    return normalizeBlogPost({
      ...fallback,
      id: row.external_id || fallback?.id,
      title: row.title,
      url: row.url,
      summary: row.summary,
      image: row.image_url || fallback?.image,
      publishedAt: row.published_at,
      categories: fallback?.categories,
      location: fallback?.location,
      property: fallback?.property,
      areaLabel: fallback?.areaLabel,
    });
  });
  return [...live, ...fallbackByUrl.values()].sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt));
}

function renderPosts(container, posts) {
  container.replaceChildren(...posts.map((post, index) => {
    const card = document.createElement('a');
    card.className = `case-card${index === 0 ? ' case-card-featured' : ''}`;
    card.href = post.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.dataset.caseCategory = post.categories[0];
    card.dataset.caseCategories = post.categories.join(' ');

    const media = document.createElement('div');
    media.className = 'case-card-media';
    if (post.image) {
      const image = document.createElement('img');
      image.src = post.image;
      image.alt = `${text(post.property, '청소 현장')} 대표사진`;
      image.loading = 'lazy';
      image.addEventListener('error', () => media.replaceChildren(createPhotoPlaceholder()), { once: true });
      media.append(image);
    } else media.append(createPhotoPlaceholder());
    const chip = document.createElement('span');
    chip.className = 'case-category-chip';
    chip.textContent = post.categories.map((category) => CATEGORY_LABELS[category]).join(' · ');
    media.append(chip);

    const meta = document.createElement('div');
    meta.className = 'case-card-meta';
    const location = document.createElement('span');
    location.textContent = `${post.location} · ${post.property}`;
    const area = document.createElement('b');
    area.textContent = post.areaLabel;
    meta.append(location, area);
    const time = document.createElement('time');
    time.textContent = dateLabel(post.publishedAt) || '현장 기록';
    const title = document.createElement('h3');
    title.textContent = text(post.title, '두껍아 두껍아 현장 기록');
    const summary = document.createElement('p');
    summary.textContent = text(post.summary, '청소 전후 과정과 현장 이야기를 확인하세요.');
    const link = document.createElement('span');
    link.className = 'case-link';
    link.textContent = '블로그 원문 보기 →';
    card.append(media, meta, time, title, summary, link);
    return card;
  }));
}

function initCaseFilters(container) {
  const buttons = [...document.querySelectorAll('[data-case-filter]')];
  const empty = document.querySelector('[data-case-empty]');
  buttons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.caseFilter;
    buttons.forEach((item) => item.classList.toggle('is-active', item === button));
    let visibleCount = 0;
    container.querySelectorAll('[data-case-categories]').forEach((card) => {
      const visible = filter === 'all' || card.dataset.caseCategories.split(' ').includes(filter);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (empty) empty.hidden = visibleCount !== 0;
  }));
}

async function init() {
  const blogContainer = document.querySelector('[data-blog-cases]');
  if (!blogContainer) return;
  renderPosts(blogContainer, BLOG_CASES);
  initCaseFilters(blogContainer);
  try {
    const client = await getSupabase();
    const blogResult = await client.from('blog_posts').select('external_id,title,url,summary,image_url,published_at').eq('active', true).order('published_at', { ascending: false }).limit(20);
    if (!blogResult.error) renderPosts(blogContainer, mergeLiveCases(blogResult.data || []));
    initCaseFilters(blogContainer);
  } catch {
    initCaseFilters(blogContainer);
  }
}

init();
