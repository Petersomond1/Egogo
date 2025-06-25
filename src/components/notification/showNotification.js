export const showNotification = (message, type = 'info', duration = 5000) => {
  // Remove any existing notifications of the same type
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    if (notification.classList.contains(`notification-${type}`)) {
      notification.remove();
    }
  });

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Styling
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    z-index: 10000;
    max-width: 350px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
    cursor: pointer;
    background: ${
      type === 'error' ? '#ff4444' : 
      type === 'success' ? '#00c851' : 
      type === 'warning' ? '#ffbb33' : 
      '#007bff'
    };
  `;

  // Add animation keyframes if not already added
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      .notification-exit {
        animation: slideOut 0.3s ease-in forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // Add click to dismiss
  notification.addEventListener('click', () => {
    removeNotification(notification);
  });

  // Add to DOM
  document.body.appendChild(notification);

  // Auto remove after duration
  setTimeout(() => {
    removeNotification(notification);
  }, duration);

  return notification;
};

const removeNotification = (notification) => {
  if (notification && document.body.contains(notification)) {
    notification.classList.add('notification-exit');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }
};


