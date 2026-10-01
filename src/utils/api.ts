export const messages: Record<string, string> = {
  unauthorized: 'اطلاعات ورود صحیح نیست یا نشست شما پایان یافته است.',
  invalid_input: 'اطلاعات فرم را کامل و صحیح وارد کنید.',
  invalid_invite: 'کد دعوت نامعتبر، منقضی یا مصرف‌شده است.',
  username_taken: 'این نام کاربری قبلاً ثبت شده است.',
  invalid_school: 'مدرسه را از فهرست انتخاب کنید.',
  invalid_origin: 'درخواست معتبر نیست. صفحه را دوباره باز کنید.',
  out_of_order:
    'این بازی در صفحه دیگری تغییر کرده است. برای دریافت آخرین پیشرفت صفحه را تازه کنید.',
  invalid_action: 'پیشرفت این بازی با سرور هماهنگ نیست. صفحه را تازه کنید.',
  server_error: 'سرویس موقتاً در دسترس نیست. دوباره تلاش کنید.',
  invalid_date_range: 'بازهٔ تاریخ معتبر نیست.',
  child_not_found: 'پروفایل کودک در دسترس نیست.',
  run_not_found: 'این نوبت بازی در دسترس نیست.',
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const data = (await response
      .json()
      .catch(() => ({ error: 'server_error' }))) as { error: string };
    throw Object.assign(
      new Error(messages[data.error] ?? 'درخواست انجام نشد. دوباره تلاش کنید.'),
      { code: data.error, status: response.status },
    );
  }
  return response.json() as Promise<T>;
}
export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
