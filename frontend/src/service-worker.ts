/// <reference lib="webworker" />
// @ts-ignore
declare var self: ServiceWorkerGlobalScope;
// @ts-ignore
self.addEventListener('push', (event: PushEvent) => {
    const data = event.data?.json() as {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      url?: string;
    } || {
      title: 'Neue Benachrichtigung',
      body: 'Du hast eine neue Nachricht erhalten.'
    };
  
    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || './assets/TaskMinderAppIcon1024.png',
      badge: data.badge || './assets/favicon.svg',
      data: data.url || '/'
    };
  
    event.waitUntil(
      // @ts-ignore
      self.registration.showNotification(data.title, options)
    );
  });

// @ts-ignore
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    // @ts-ignore
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      for (const client of clientsArr) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // @ts-ignore
      if (self.clients.openWindow) {
        // @ts-ignore
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
