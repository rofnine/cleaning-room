(function showLocalPreviewNotice() {
  if (window.location.protocol !== 'file:') return;
  document.querySelectorAll('[data-local-preview-notice]').forEach((notice) => {
    notice.hidden = false;
  });
}());
