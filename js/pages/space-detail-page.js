export const ROOM_CONTENT = Object.freeze({
  living: {
    title: '거실 청소 관리',
    intro: '거실이 가장 오래 머무는 공간인 만큼 창틀, 문틀, 바닥, 수납장까지 꼼꼼히 관리해 쾌적한 환경을 만듭니다.',
    image: './b1.png',
    imageAlt: '밝은 거실 바닥과 창가 청소 관리 이미지',
    tags: ['청결', '안전', '위생', '쾌적'],
    contamination: ['창틀 레일과 청소 틈의 공사 분진', '문틀·스위치·콘센트 위쪽 먼지', '바닥 모서리와 걸레받이 잔여 오염', '수납장 안쪽의 미세먼지'],
    scope: ['천장과 벽면의 가벼운 먼지 제거', '창틀·문틀·몰딩 세척', '수납장 내부와 외부 닦음', '바닥 오염 제거와 최종 마감'],
    order: ['위쪽 먼지와 벽면 상태를 먼저 확인합니다.', '창틀과 수납장 안쪽부터 바깥쪽 순서로 닦습니다.', '문틀·콘센트·스위치 주변을 세부 정리합니다.', '마지막으로 바닥을 세척하고 잔여물을 검수합니다.'],
    checklist: ['창틀 레일에 분진이 남지 않았는지', '수납장 문과 선반 안쪽이 마른 상태인지', '바닥 모서리에 얼룩과 물기가 없는지', '완료 사진과 현장 특이사항이 기록됐는지'],
    sources: [
      { label: '대전 도안리슈빌 5단지 34평 현장', url: 'https://blog.naver.com/rofnine/224308432441' },
      { label: '천안 시티프라디움 4차 24평 현장', url: 'https://blog.naver.com/rofnine/224303183230' },
    ],
  },
  kitchen: {
    title: '주방 청소 관리',
    intro: '주방은 싱크대 하부장, 서랍 내부, 후드와 배수구처럼 생활이 시작되면 다시 닦기 어려운 안쪽을 우선 확인합니다.',
    image: './b2.png',
    imageAlt: '주방 싱크대와 수납장 청소 관리 이미지',
    tags: ['청결', '안전', '위생', '쾌적'],
    contamination: ['싱크대 하부장과 바닥 주변 공사 분진', '후드와 조리대 주변의 기름성 오염', '싱크볼·수전의 물때와 시공 자국', '서랍 레일과 수납장 모서리 먼지'],
    scope: ['상·하부장 내부와 외부 닦음', '싱크볼·수전·배수구 세척', '후드 겉면과 조리대 기본 세척', '서랍과 레일의 잔여 분진 제거'],
    order: ['수납공간 서랍을 모두 열어 오염 상태를 확인합니다.', '상부장부터 하부장까지 위에서 아래로 작업합니다.', '싱크볼·수전·배수구를 분리 가능한 범위에서 세척합니다.', '조리대와 바닥은 마감 단계에서 냄새와 물기를 점검합니다.'],
    checklist: ['하부장 바닥 주변에 분진이 남지 않았는지', '서랍 레일과 손잡이가 끈적이지 않은지', '배수구에 이물질과 냄새가 없는지', '상판과 수전 표면에 잔여 세제가 없는지'],
    sources: [
      { label: '새집 주방 악취와 싱크대 하부장 청소', url: 'https://blog.naver.com/rofnine/224288007420' },
      { label: '아산 탕정 더리치오 더 그린 현장', url: 'https://blog.naver.com/rofnine/224314989117' },
    ],
  },
  bathroom: {
    title: '욕실 청소 관리',
    intro: '신축 욕실은 타일과 줄눈의 백시멘트 가루, 배수구 분진, 수전의 시공 흔적이 남아 있을 수 있어 구역별로 확인합니다.',
    image: './b3.png',
    imageAlt: '밝은 욕실 세면대와 샤워부스 청소 관리 이미지',
    tags: ['청결', '안전', '위생', '쾌적'],
    contamination: ['타일과 줄눈 주변의 백시멘트 가루', '세면대·수전·거울의 물때와 시공 자국', '배수구 안쪽의 분진과 이물질', '환풍구와 천장 모서리 먼지'],
    scope: ['타일·줄눈·바닥 가벼운 세척', '세면대·수전·거울 닦음', '변기 안쪽과 배수구 세척', '환풍구 주변과 문틀 닦음'],
    order: ['환풍구와 벽면의 마른 먼지를 먼저 제거합니다.', '타일과 줄눈의 잔여 가루를 상태에 맞게 세척합니다.', '세면대·수전·변기·배수구를 구역별로 작업합니다.', '물기를 제거하고 표면과 바닥 상태를 최종 확인합니다.'],
    checklist: ['타일을 구석진 곳 하얀 가루가 다시 묻지 않는지', '배수구가 막힘 없이 내려가는지', '수전과 거울에 물때 자국이 남지 않았는지', '바닥과 문틀에 물기가 남지 않았는지'],
    sources: [
      { label: '새 아파트 욕실의 백시멘트 가루', url: 'https://blog.naver.com/rofnine/224284993692' },
      { label: '천안 불당동 24평 욕실 작업', url: 'https://blog.naver.com/rofnine/224303183230' },
    ],
  },
});

function renderList(selector, values, ordered = false) {
  const list = document.querySelector(selector);
  if (!list) return;
  list.replaceChildren(...values.map((value, index) => {
    const item = document.createElement('li');
    item.textContent = ordered ? `${index + 1}. ${value}` : value;
    return item;
  }));
}

function init() {
  const key = new URLSearchParams(location.search).get('room');
  const content = ROOM_CONTENT[key] || ROOM_CONTENT.living;
  document.title = `${content.title} | 두껍아 두껍아`;
  document.querySelector('[data-space-title]').textContent = content.title;
  document.querySelector('[data-space-intro]').textContent = content.intro;

  const image = document.querySelector('[data-space-image]');
  image.src = content.image;
  image.alt = content.imageAlt;

  const tags = document.querySelector('[data-space-tags]');
  tags.replaceChildren(...content.tags.map((tag) => {
    const item = document.createElement('span');
    item.textContent = tag;
    return item;
  }));

  renderList('[data-space-contamination]', content.contamination);
  renderList('[data-space-scope]', content.scope);
  renderList('[data-space-order]', content.order, true);
  renderList('[data-space-checklist]', content.checklist);

  const sources = document.querySelector('[data-space-sources]');
  sources.replaceChildren(...content.sources.map((source) => {
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${source.label} 보기`;
    return link;
  }));
}

if (typeof document !== 'undefined') init();
