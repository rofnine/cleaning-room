import { getSession, signOut } from '../auth/auth-service.js';

function show(element, visible) {
  if (element) element.hidden = !visible;
}

export async function updateAccountLink() {
  const login = document.querySelector('[data-account-link]');
  const signup = document.querySelector('[data-signup-link]');
  const logout = document.querySelector('[data-logout-link]');
  const mypage = document.querySelector('[data-mypage-link]');
  if (!login) return;
  try {
    const session = await getSession();
    const loggedIn = Boolean(session);
    show(signup, !loggedIn);
    show(login, !loggedIn);
    show(logout, loggedIn);
    show(mypage, loggedIn);
    login.href = './auth.html';
    login.textContent = '로그인';
  } catch {
    show(signup, true);
    show(login, true);
    show(logout, false);
    show(mypage, false);
    login.href = './auth.html';
    login.textContent = '로그인';
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest?.('[data-logout-link]');
  if (!button) return;
  event.preventDefault();
  button.disabled = true;
  try {
    await signOut();
    await updateAccountLink();
    if (location.pathname.endsWith('/mypage.html') || location.pathname.endsWith('/admin.html')) {
      location.assign('./index.html');
    }
  } catch (error) {
    button.textContent = error?.message || '로그아웃 실패';
  } finally {
    button.disabled = false;
  }
});

updateAccountLink();
document.addEventListener('site-header-rendered', updateAccountLink);
