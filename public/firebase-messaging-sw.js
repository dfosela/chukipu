importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDyORcCnsnmrNcwDrB79bF8fzUFobcj5Ao',
  authDomain: 'chukipu-e3d05.firebaseapp.com',
  databaseURL: 'https://chukipu-e3d05-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'chukipu-e3d05',
  storageBucket: 'chukipu-e3d05.firebasestorage.app',
  messagingSenderId: '848366529631',
  appId: '1:848366529631:web:464600d928a8015e493fea',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Chukipu';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/logos/chukipuPWA_Android.png',
    badge: '/logos/chukipuPWA_Android.png',
    tag: payload.data?.type || 'chukipu',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/application');
    })
  );
});
