import { getSession } from '../auth/auth-service.js';
import { getSupabase } from '../lib/supabase.js';
import { normalizeInquiry } from '../inquiries/inquiry-domain.js';

function values(form) {
  const data = new FormData(form);
  return {
    checkoutMode: data.get('checkoutMode'),
    type: data.get('type'),
    title: data.get('title'),
    content: data.get('content'),
    pin: data.get('pin'),
    name: data.get('name'),
    phone: data.get('phone'),
    email: data.get('email'),
    consent: data.get('consent') === 'yes',
  };
}

async function submitInquiry(client, inquiry) {
  try {
    const { data, error } = await client.functions.invoke('submit-inquiry', { body: inquiry });
    if (error) throw error;
    return data;
  } catch (functionError) {
    const { data, error } = await client.rpc('submit_inquiry_public', { p_payload: inquiry });
    if (error) {
      const message = /submit_inquiry_public/i.test(error.message || '')
        ? '문의 접수 기능이 아직 Supabase에 적용되지 않았습니다. 관리자에게 설정을 요청해주세요.'
        : error.message;
      throw new Error(message || functionError?.message || '문의를 저장하지 못했습니다.');
    }
    return {
      inquiryId: data?.inquiry_id,
      receiptNumber: data?.receipt_number,
      status: data?.status || 'received',
      source: 'database-rpc',
    };
  }
}

function setRequired(container, required) {
  container?.querySelectorAll('input, select, textarea').forEach((field) => {
    field.required = required;
  });
}

function setInquiryMode(form, session) {
  const loggedIn = Boolean(session?.user?.id);
  const mode = form.elements.checkoutMode.value;
  const memberMode = loggedIn || mode === 'member';
  const guestFields = document.querySelector('[data-guest-fields]');
  const pinField = document.querySelector('[data-pin-field]');
  const pinInput = form.elements.pin;
  const loginPrompt = document.querySelector('[data-member-login-prompt]');
  const memberReady = document.querySelector('[data-member-inquiry-ready]');
  const modeFieldset = document.querySelector('[data-inquiry-mode-fieldset]');
  const submit = document.querySelector('[data-inquiry-submit]');

  if (loggedIn) {
    form.elements.checkoutMode.value = 'member';
    modeFieldset.hidden = false;
    form.querySelector('[name="checkoutMode"][value="member"]').checked = true;
    form.querySelectorAll('[name="checkoutMode"]').forEach((input) => { input.disabled = true; });
  }

  guestFields.hidden = memberMode;
  setRequired(guestFields, !memberMode);
  pinField.hidden = memberMode;
  pinInput.required = !memberMode;
  if (memberMode) pinInput.value = '';
  loginPrompt.hidden = loggedIn || mode !== 'member';
  memberReady.hidden = !loggedIn;
  submit.disabled = !loggedIn && mode === 'member';
}

async function init() {
  const form = document.querySelector('[data-inquiry-form]');
  if (!form) return;
  const status = document.querySelector('[data-inquiry-status]');
  let session = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  setInquiryMode(form, session);

  form.addEventListener('change', () => setInquiryMode(form, session));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = '문의 내용을 저장하고 있습니다…';
    try {
      const input = values(form);
      if (session?.user?.id) {
        input.checkoutMode = 'member';
        input.memberId = session.user.id;
      } else if (input.checkoutMode === 'member') {
        throw new Error('회원 문의는 로그인 후 접수할 수 있습니다.');
      }
      const normalized = normalizeInquiry(input);
      const client = await getSupabase();
      const data = await submitInquiry(client, normalized);
      status.textContent = `문의 접수가 완료되었습니다. 접수번호 ${data.receiptNumber} · 관리자가 확인 후 답변드립니다.`;
      form.reset();
      setInquiryMode(form, session);
    } catch (error) {
      status.textContent = error?.message || '문의를 접수하지 못했습니다.';
    } finally {
      setInquiryMode(form, session);
    }
  });
}

init();
