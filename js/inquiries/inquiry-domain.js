import { validateEmail } from '../auth/auth-validation.js';

const TYPES = new Set(['service','estimate_booking','payment_refund','schedule_change','work_as','account','other']);
function text(value,name,min,max){const result=String(value||'').trim();if(result.length<min||result.length>max)throw new Error(`${name} is required`);return result;}

export function normalizeInquiry(input){
  const checkoutMode=String(input?.checkoutMode||'');
  if(!['guest','member'].includes(checkoutMode))throw new Error('Choose guest or member inquiry');
  if(!TYPES.has(input.type))throw new Error('Choose an inquiry type');
  if(input.consent!==true)throw new Error('Privacy consent is required');
  const result={checkoutMode,type:input.type,title:text(input.title,'Title',2,100),content:text(input.content,'Content',5,5000),consent:true};
  if(checkoutMode==='guest'){
    const pin=String(input.pin||'');if(!/^\d{4}$/.test(pin))throw new Error('Enter a four digit PIN');
    result.pin=pin;
    result.name=text(input.name,'Name',1,80);
    result.phone=String(input.phone||'').replace(/\D/g,'');if(!/^01\d{8,9}$/.test(result.phone))throw new Error('A valid phone is required');
    result.email=validateEmail(input.email);
  }else if(!String(input.memberId||'').trim())throw new Error('Login is required for member inquiry');
  else result.memberId=String(input.memberId);
  return result;
}
