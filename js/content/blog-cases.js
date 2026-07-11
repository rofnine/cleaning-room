const CATEGORY_ORDER = Object.freeze(['move_in', 'move_out', 'occupied', 'special']);

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyBlogCase(post) {
  const value = cleanText(`${post?.title || ''} ${post?.summary || ''} ${post?.tags || post?.tag || ''}`);
  const categories = [];
  if (/입주|새집|신축|준공|리모델링/.test(value)) categories.push('move_in');
  if (/이사|퇴거|원상복구/.test(value)) categories.push('move_out');
  if (/거주|주거|생활오염|짐이|이삿짐/.test(value)) categories.push('occupied');
  if (/특수|곰팡이|피톤치드|살균|소독|가전|세탁기|냉장고|에어컨|백시멘트|유리막|수전코팅|폐기물|진드기/.test(value)) categories.push('special');
  return CATEGORY_ORDER.filter((category) => categories.includes(category));
}

export function normalizeBlogPost(post) {
  const title = cleanText(post?.title);
  const summary = cleanText(post?.summary || post?.description);
  const areaMatch = title.match(/(\d+)\s*평/);
  const areaPyeong = areaMatch ? Number(areaMatch[1]) : null;
  const categories = Array.isArray(post?.categories) && post.categories.length
    ? CATEGORY_ORDER.filter((category) => post.categories.includes(category))
    : classifyBlogCase({ ...post, title, summary });
  return {
    id: String(post?.id || post?.external_id || post?.url || ''),
    title,
    url: String(post?.url || ''),
    summary,
    image: String(post?.image || post?.image_url || ''),
    publishedAt: post?.publishedAt || post?.published_at || '',
    location: cleanText(post?.location) || '충남·인근 지역',
    property: cleanText(post?.property) || '현장명 확인 필요',
    areaPyeong,
    areaLabel: cleanText(post?.areaLabel) || (areaPyeong ? `${areaPyeong}평` : '공급면적 확인 필요'),
    categories: categories.length ? categories : ['move_in'],
  };
}

const cases = [
  {
    id: '224325783450', categories: ['move_in', 'occupied'], location: '충남 태안', property: '태안 전원주택', areaLabel: '공급면적 확인 필요',
    title: '태안 입주청소｜이삿짐이 먼저 들어온 전원주택 현장',
    url: 'https://blog.naver.com/rofnine/224325783450', publishedAt: '2026-06-24T15:01:07+09:00', image: './assets/blog/taean-country-house.jpg',
    summary: '침구와 가전, 생활용품이 먼저 들어온 전원주택에서 동선을 나누어 창틀·주방·욕실·바닥을 정리한 현장입니다.',
  },
  {
    id: '224319732113', categories: ['move_in', 'occupied'], location: '충북 진천', property: '충북혁신리슈빌 · 동일하이빌', areaLabel: '34평 · 34평',
    title: '진천 충북혁신리슈빌 34평 + 동일하이빌 34평',
    url: 'https://blog.naver.com/rofnine/224319732113', publishedAt: '2026-06-18T12:43:19+09:00', image: './assets/blog/jincheon-34.jpg',
    summary: '신축 공사 분진이 남은 입주 현장과 생활 오염이 쌓인 주거 현장을 하루 동선으로 작업한 기록입니다.',
  },
  {
    id: '224314989117', categories: ['move_in', 'move_out', 'special'], location: '충남 예산', property: '세광엔리치 · 오성그린임대', areaLabel: '33평 · 16평',
    title: '예산 세광엔리치 33평 & 오성그린임대 16평',
    url: 'https://blog.naver.com/rofnine/224314989117', publishedAt: '2026-06-13T20:38:14+09:00', image: './assets/blog/yesan-33-16.jpg',
    summary: '리모델링 뒤 미세 분진과 샷시 곰팡이를 다룬 33평 현장, 주방·욕실 생활 오염을 정리한 16평 현장입니다.',
  },
  {
    id: '224308432441', categories: ['move_in'], location: '대전 유성구', property: '도안트리플시티 5단지', areaPyeong: 34,
    title: '대전 도안트리플시티 5단지 34평 입주청소',
    url: 'https://blog.naver.com/rofnine/224308432441', publishedAt: '2026-06-07T12:46:06+09:00', image: './assets/blog/daejeon-doan-34.jpg',
    summary: '방 3개와 욕실 2개 구조에서 창틀 레일, 수납장 안쪽, 베란다 모서리까지 순서대로 밝힌 현장입니다.',
  },
  {
    id: '224303236041', categories: ['move_in', 'move_out', 'special'], location: '원주 · 단양', property: '동문디이스트 · 단양 일반주택', areaLabel: '31평 · 투룸',
    title: '원주 동문디이스트 31평 + 단양 일반주택 투룸',
    url: 'https://blog.naver.com/rofnine/224303236041', publishedAt: '2026-06-01T23:30:43+09:00', image: './assets/blog/wonju-danyang.jpg',
    summary: '아파트와 일반주택의 구조 차이에 맞춰 청소 포인트를 달리하고 가전·살균 케어까지 진행한 기록입니다.',
  },
  {
    id: '224303183230', categories: ['move_in'], location: '천안 불당동', property: '시티프라디움 4차', areaPyeong: 24,
    title: '천안 불당동 시티프라디움 4차 24평',
    url: 'https://blog.naver.com/rofnine/224303183230', publishedAt: '2026-06-01T22:31:04+09:00', image: './assets/blog/cheonan-citypradium-24.gif',
    summary: '입주 전 빈집에서 주방 서랍, 욕실 배수구, 창틀, 베란다와 수납장 내부를 집중적으로 정리했습니다.',
  },
  {
    id: '224302006841', categories: ['move_in', 'move_out'], location: '당진 · 천안', property: '호반써밋시그니처 · 청당코오롱하늘채', areaLabel: '34평 · 24평',
    title: '당진 호반써밋 34평 + 천안 코오롱하늘채 24평',
    url: 'https://blog.naver.com/rofnine/224302006841', publishedAt: '2026-05-31T22:16:48+09:00', image: './assets/blog/dangjin-cheonan.jpg',
    summary: '두 입주 현장의 창틀, 주방, 욕실, 수납장에 남은 공사 먼지와 분진을 비교하며 작업한 기록입니다.',
  },
  {
    id: '224288007420', categories: ['special'], location: '천안·아산', property: '주방 하부장 케어', areaLabel: '공간별 케어',
    title: '새집 주방 냄새와 싱크대 하부장 청소',
    url: 'https://blog.naver.com/rofnine/224288007420', publishedAt: '2026-05-17T12:08:26+09:00', image: './assets/blog/kitchen-lower-cabinet.png',
    summary: '싱크대 하부장 공사 분진, 배수구, 서랍 레일과 후드 주변처럼 놓치기 쉬운 주방 오염을 설명합니다.',
  },
  {
    id: '224284993692', categories: ['special'], location: '천안·아산', property: '신축 욕실 케어', areaLabel: '공간별 케어',
    title: '새 아파트 욕실의 백시멘트 가루 제거',
    url: 'https://blog.naver.com/rofnine/224284993692', publishedAt: '2026-05-14T09:45:56+09:00', image: './assets/blog/bathroom-white-cement.png',
    summary: '신축 욕실 타일과 줄눈 주변에 남는 백시멘트 가루의 원인과 확인해야 할 청소 범위를 다룹니다.',
  },
];

export const BLOG_CASES = Object.freeze(cases.map((item) => Object.freeze(normalizeBlogPost(item))));
