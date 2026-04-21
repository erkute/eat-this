// firebase-messaging-sw.js — handles background push notifications
// Must live at the root. Firebase registers this automatically via getMessaging().

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDs0361Db_lwHGW9WZfT5ivj-WIB4fyUw0',
  authDomain:        'eat-this-8a13b.firebaseapp.com',
  projectId:         'eat-this-8a13b',
  storageBucket:     'eat-this-8a13b.firebasestorage.app',
  messagingSenderId: '768781457409',
  appId:             '1:768781457409:web:607ff46bfa4599d6b08800',
});

const messaging = firebase.messaging();

// Show notification when app is in the background
messaging.onBackgroundMessage((payload) => {
  const title   = payload.notification?.title ?? 'EAT THIS';
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/pics/eat-email.png',
    badge: '/pics/favicon-192.png',
    data: { url: payload.data?.url ?? 'https://www.eatthisdot.com' },
  };
  self.registration.showNotification(title, options);
});

// Open the app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? 'https://www.eatthisdot.com';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find(c => c.url.startsWith('https://www.eatthisdot.com'));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
