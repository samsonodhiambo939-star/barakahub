import { v4 as uuidv4 } from 'uuid';

export function generateMemberNo(count: number): string {
  return `CHC-${String(count + 1).padStart(4, '0')}`;
}

export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  return cleaned;
}

export function generateUUID(): string {
  return uuidv4();
}

export function formatCurrency(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}
