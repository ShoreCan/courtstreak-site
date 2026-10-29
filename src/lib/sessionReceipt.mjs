export function confirmedSessionReceipt(data) {
  const receipt = Array.isArray(data) ? data[0] : data;
  if (!receipt?.session_id) throw new Error('Your save could not be confirmed. Keep this screen open and retry.');
  return receipt;
}
