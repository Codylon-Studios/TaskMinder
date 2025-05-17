import webpush from 'web-push';
import { PushSubscription as SubscriptionModel } from '../models/pushSubscriberModel';
import logger from './logger';

export async function sendPushNotification(data: { title: string; body: string }) {
  const subscriptions = await SubscriptionModel.findAll();

  const payload = JSON.stringify(data);

  const sendAll = subscriptions.map(async sub => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.keys.auth,
            p256dh: sub.keys.p256dh
          }
        },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        logger.info("error at sending")
        console.log('Deleting expired subscription', sub.endpoint);
        await sub.destroy();
      } else {
        console.error('Push error:', err);
      }
    }
  });

  await Promise.allSettled(sendAll);
}
