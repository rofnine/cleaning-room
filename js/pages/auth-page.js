import * as authService from '../auth/auth-service.js';
import { isPublicConfigReady } from '../lib/config.js?v=20260623-ux6';

const MESSAGES = {
  signup: '인증 메일을 확인해주세요.',
  reset: '비밀번호 재설정 메일을 보냈습니다.',
};

export function normalizeNextPath(nextPath) {
  const normalized = String(nextPath || '').replace(/^\.\//, '');
  return ['mypage.html', 'admin.html', 'order.html'].includes(normalized) ? normalized : 'mypage.html';
}

export async function submitAuthAction(mode, values, service = authService, nextPath = 'mypage.html', config = globalThis.CLEANING_CONFIG) {
  if (mode === 'signup') {
    if (!isPublicConfigReady(config)) {
      return {
        message: '현재 회원가입 서버를 준비 중입니다. 전화 상담 또는 문의를 이용해주세요.',
        redirectTo: null,
        unavailable: true,
      };
    }
    await service.signUp(values);
    return { message: MESSAGES.signup, redirectTo: null };
  }
  if (mode === 'login') {
    await service.signIn(values);
    return { message: '로그인되었습니다.', redirectTo: normalizeNextPath(nextPath) };
  }
  if (mode === 'reset') {
    await service.requestPasswordReset(values.email);
    return { message: MESSAGES.reset, redirectTo: null };
  }
  throw new Error('지원하지 않는 인증 요청입니다.');
}

export function initAuthPage(doc = document) {
  const form = doc.querySelector('[data-auth-form]');
  if (!form) return;

  const status = doc.getElementById('auth-status');
  const displayNameField = doc.querySelector('[data-display-name-field]');
  const passwordField = doc.querySelector('[data-password-field]');
  const title = doc.querySelector('[data-auth-title]');
  const copyOutput = doc.querySelector('[data-auth-copy]');
  const eyebrow = doc.querySelector('[data-auth-eyebrow]');
  const submitButton = form.querySelector('button[type="submit"]');
  const unavailableActions = doc.querySelector('[data-auth-unavailable-actions]');
  const query = new URLSearchParams(globalThis.location?.search || '');
  const nextPath = normalizeNextPath(query.get('next'));
  const isAdminLogin = nextPath === 'admin.html';
  let mode = query.get('mode') || 'login';

  function renderMode() {
    const copy = {
      login: ['로그인', '로그인하기'],
      signup: ['회원가입', '회원가입하기'],
      reset: ['비밀번호 찾기', '재설정 메일 받기'],
    }[mode];
    title.textContent = isAdminLogin && mode === 'login' ? '관리자 로그인' : copy[0];
    submitButton.textContent = copy[1];
    eyebrow.textContent = isAdminLogin ? 'ADMIN CONSOLE' : 'MY CLEANING';
    copyOutput.textContent = isAdminLogin
      ? '관리자 권한이 등록된 계정으로 로그인해주세요.'
      : mode === 'signup'
        ? '회원가입 후 마이페이지에서 주문내역과 문의를 확인할 수 있습니다.'
        : '예약과 결제, 문의, 후기를 한곳에서 확인하세요.';
    displayNameField.hidden = mode !== 'signup';
    passwordField.hidden = mode === 'reset';
    form.querySelector('#auth-password').required = mode !== 'reset';
    doc.querySelectorAll('[data-auth-mode]').forEach((button) => {
      if (isAdminLogin && button.dataset.authMode === 'signup') button.hidden = true;
      button.setAttribute('aria-pressed', String(button.dataset.authMode === mode));
    });
  }

  doc.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.authMode;
      status.textContent = '';
      unavailableActions.hidden = true;
      renderMode();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '처리 중입니다.';
    submitButton.disabled = true;
    try {
      const values = {
        email: form.elements.email.value,
        password: form.elements.password.value,
        displayName: form.elements.displayName.value,
      };
      const result = await submitAuthAction(mode, values, authService, nextPath);
      status.textContent = result.message;
      unavailableActions.hidden = !result.unavailable;
      if (result.redirectTo) globalThis.location.assign(result.redirectTo);
    } catch (error) {
      status.textContent = error?.message || '요청을 처리하지 못했습니다.';
    } finally {
      submitButton.disabled = false;
    }
  });

  renderMode();
}

if (typeof document !== 'undefined') initAuthPage();
