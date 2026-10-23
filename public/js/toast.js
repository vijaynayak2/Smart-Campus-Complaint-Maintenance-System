/**
 * Toast Notification Helper for AJIET CampusFix
 */
(function() {
  let container = document.querySelector('.toast-container-custom');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container-custom';
    document.body.appendChild(container);
  }

  window.showToast = function(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;

    let icon = 'bi-info-circle-fill';
    if (type === 'success') icon = 'bi-check-circle-fill';
    else if (type === 'error') icon = 'bi-exclamation-octagon-fill';
    else if (type === 'warning') icon = 'bi-exclamation-triangle-fill';

    toast.innerHTML = `
      <i class="bi ${icon} fs-5"></i>
      <div class="flex-grow-1" style="font-size: 0.88rem; line-height: 1.35;">${message}</div>
      <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.65rem;" aria-label="Close"></button>
    `;

    const closeBtn = toast.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    container.appendChild(toast);

    const timer = setTimeout(() => {
      removeToast(toast);
    }, duration);

    function removeToast(el) {
      clearTimeout(timer);
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }
  };
})();
