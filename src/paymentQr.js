const env = import.meta.env || {};

export const NEKO_QR_BANK = {
  bankId: env.VITE_NEKO_BANK_ID || "MB",
  accountNumber: env.VITE_NEKO_BANK_ACCOUNT || "0000000000",
  accountName: env.VITE_NEKO_BANK_NAME || "NEKO PET CARE",
};

export function getQrPaymentInfo(schedule) {
  const fallbackAmount = Number(schedule?.price || 0) + Number(schedule?.shipping?.totalFee || 0);
  const rawAmount = Number(schedule?.payment?.amount ?? fallbackAmount);
  const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? Math.round(rawAmount) : 0;
  const scheduleId = schedule?.id === undefined || schedule?.id === null
    ? ""
    : String(schedule.id).trim();

  return {
    bankId: NEKO_QR_BANK.bankId,
    accountNumber: NEKO_QR_BANK.accountNumber,
    accountName: NEKO_QR_BANK.accountName,
    amount,
    transferContent: scheduleId ? `NEKO LICH ${scheduleId}` : "NEKO THANH TOAN",
  };
}

export function buildQrPaymentUrl(schedule) {
  const info = getQrPaymentInfo(schedule);
  const params = new URLSearchParams();
  if (info.amount > 0) params.set("amount", String(info.amount));
  params.set("addInfo", info.transferContent);
  params.set("accountName", info.accountName);

  return `https://img.vietqr.io/image/${encodeURIComponent(info.bankId)}-${encodeURIComponent(info.accountNumber)}-compact2.png?${params.toString()}`;
}
