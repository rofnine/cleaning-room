import { getSupabase } from '../lib/supabase.js';
import { BLOG_CASES } from '../content/blog-cases.js';

function safe(value, fallback = '') { return String(value || fallback); }
function dateLabel(value) { return value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value)) : ''; }
function stars(rating) { return '★'.repeat(Number(rating || 0)) + '☆'.repeat(Math.max(0, 5 - Number(rating || 0))); }

function renderReview(review) {
  const card = document.createElement('article');
  card.className = 'review-card-public';
  const score = document.createElement('div'); score.className = 'stars'; score.textContent = stars(review.rating);
  const quote = document.createElement('blockquote'); quote.textContent = safe(review.content, '청소 후기가 등록되었습니다.');
  const footer = document.createElement('footer'); footer.textContent = `${safe(review.author_display, '고객')} · ${dateLabel(review.created_at)}`;
  card.append(score, quote, footer);
  const reply = Array.isArray(review.review_replies) ? review.review_replies[0] : review.review_replies;
  if (reply?.content) { const replyBox = document.createElement('div'); replyBox.className = 'review-reply'; replyBox.textContent = `관리자 답변 · ${reply.content}`; card.append(replyBox); }
  return card;
}

function renderEmptyReview(container, state) {
  container.innerHTML = '<article class="review-card-public review-empty"><h3>아직 공개된 고객 후기가 없습니다.</h3><p>청소 완료 후 관리자가 후기 작성 요청을 보낸 고객만 별점과 후기를 남길 수 있습니다.</p></article>';
  state.textContent = '';
}

function renderFieldNotes() {
  const container = document.querySelector('[data-field-note-list]');
  if (!container) return;
  container.replaceChildren(...BLOG_CASES.slice(0, 6).map((item) => {
    const card = document.createElement('a'); card.className = 'field-note-card'; card.href = item.url; card.target = '_blank'; card.rel = 'noopener noreferrer';
    card.innerHTML = `<img src="${item.image}" alt="${item.property} 대표사진" loading="lazy"><div><span>${item.location} · ${item.areaLabel}</span><h3>${item.property}</h3><p>${item.summary}</p><b>현장 기록 보기 →</b></div>`;
    return card;
  }));
}

async function initReviews() {
  const container = document.querySelector('[data-review-list]');
  const state = document.querySelector('[data-review-state]');
  if (!container || !state) return;
  renderFieldNotes();
  try {
    const client = await getSupabase();
    const { data, error } = await client.from('reviews')
      .select('rating,content,author_display,created_at,review_replies(content,created_at)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    const reviews = data || [];
    if (!reviews.length) { renderEmptyReview(container, state); return; }
    container.replaceChildren(...reviews.map(renderReview));
    state.textContent = '';
  } catch {
    renderEmptyReview(container, state);
  }
}

initReviews();
