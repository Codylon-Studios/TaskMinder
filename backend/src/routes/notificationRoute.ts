import express from 'express';
import { PushSubscription } from '../models/pushSubscriberModel';

const router = express.Router();

router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;

  try {
    await PushSubscription.upsert({ endpoint, keys });
    res.status(201).send("subscribed!");
  } catch (err) {
    console.error('Subscription save error:', err);
    res.status(500).send("save sub error");
  }
});

router.post('/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;
  
    try {
      await PushSubscription.destroy({ where: { endpoint } });
      res.status(200).send("unsubscribed!");
    } catch (err) {
      console.error('Unsubscribe error:', err);
      res.status(500).send("delete sub error");
    }
  });

export default router;
