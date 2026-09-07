// Shared helper: opens WhatsApp with a pre-filled message to a customer's
// phone number. Include this on any page AFTER auth-guard.js.

function openWhatsApp(phone, message) {
  if (!phone) {
    alert('No phone number on file for this customer.');
    return;
  }
  let digits = phone.replace(/\D/g, '');
  // Strip a leading 0 (common local-format mistake) and add India's 91
  // country code if it isn't already a 12-digit number starting with 91.
  digits = digits.replace(/^0+/, '');
  if (!digits.startsWith('91') || digits.length !== 12) {
    digits = '91' + digits;
  }
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
