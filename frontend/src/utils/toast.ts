import { toast } from 'react-toastify';

const lastShown = new Map<string, number>();
const shouldShow = (type: string, message: string) => {
  const key = `${type}:${message}`;
  const now = Date.now();
  const prev = lastShown.get(key) || 0;
  if (now - prev < 1200) return false;
  lastShown.set(key, now);
  return true;
};

export const getErrorMessage = (error: any, fallback = 'Something went wrong') => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const notifySuccess = (message: string) => {
  if (shouldShow('success', message)) toast.success(message);
};
export const notifyError = (message: string) => {
  if (shouldShow('error', message)) toast.error(message);
};
export const notifyInfo = (message: string) => {
  if (shouldShow('info', message)) toast.info(message);
};
export const notifyWarning = (message: string) => {
  if (shouldShow('warning', message)) toast.warning(message);
};
