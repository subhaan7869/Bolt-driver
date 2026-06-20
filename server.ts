import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import firebaseAdmin from 'firebase-admin';
import fs from 'fs';

const admin = firebaseAdmin as any;

dotenv.config();

// Initialize Firebase Admin SDK safely
if (!admin.apps.length) {
  try {
    let serviceAccount: any = null;
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      serviceAccount = JSON.parse(serviceAccountVar);
    } else {
      const localPath = path.join(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(localPath)) {
        console.log('Using local firebase-service-account.json fallback.');
        const fileContent = fs.readFileSync(localPath, 'utf8');
        serviceAccount = JSON.parse(fileContent);
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT and local backup config file are both missing.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

// Lazy initialize Gemini API client to prevent startup failure if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route - Support Agent / Drive Coach powered by Gemini API
  app.post('/api/chat-coach', async (req, res) => {
    const { messages, driverStats } = req.body;
    const userMessage = messages[messages.length - 1]?.text || 'Hello';

    const client = getGeminiClient();

    if (!client) {
      // Local fallback with rule-based driver advisory responses
      setTimeout(() => {
        let reply = '';
        const msgLower = userMessage.toLowerCase();

        if (msgLower.includes('surge') || msgLower.includes('hot') || msgLower.includes('peak')) {
          reply = "💡 Dispatch Tip: The Downtown District and Grand Airport Hub currently show highest surges. Keep your driver status set to 'Online' in those designated radiuses to receive double rates (up to 2.2x multiplier)!";
        } else if (msgLower.includes('cash') || msgLower.includes('money') || msgLower.includes('payout') || msgLower.includes('balance')) {
          reply = `💰 Earnings Coach: Your current cashable balance is €${(driverStats?.balance || 0).toFixed(2)}. You can tap the 'Cash Out' button on the Earnings drawer at any time. Direct transfers usually clear within 5-10 minutes.`;
        } else if (msgLower.includes('rating') || msgLower.includes('star')) {
          reply = `⭐ Rating Assist: Your active rating is ${driverStats?.rating || 4.95} stars. Passenger ratings are calculated on the last 100 trips. To keep it high, greet passengers warmly, offer clean seating, and maintain standard navigation routes.`;
        } else if (msgLower.includes('cancellation') || msgLower.includes('acceptance')) {
          reply = `📊 Drive Performance: Your Acceptance Rate is ${driverStats?.acceptanceRate || 95}% and Cancellation is ${driverStats?.cancellationRate || 2}%. Avoid declining too many consecutive rides to maintain early priority booking.`;
        } else {
          reply = "👋 Welcome to Swift Support Pilot! Ask me quick tips, e.g., 'where are the hot zones?', 'how do I cash out?', or 'how to improve ratings?'. To unlock unlimited real-world AI reasoning, make sure to add your GEMINI_API_KEY in the Secrets panel!";
        }

        res.json({
          text: reply,
          sender: 'support',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }, 500);
      return;
    }

    try {
      const statsContext = driverStats ? `
      The driver's current Swift statistics are:
      - Star Rating: ${driverStats.rating} / 5
      - Acceptance Rate: ${driverStats.acceptanceRate}%
      - Cancellation Rate: ${driverStats.cancellationRate}%
      - Balance: €${driverStats.balance.toFixed(2)}
      - Today's Earnings: €${driverStats.todayEarnings.toFixed(2)}
      - Trips completed today: ${driverStats.completedTripsCount}
      ` : '';

      const prompt = `
      You are the official "Swift Driver AI Co-host & Dispatch Assistant". 
      Your job is to provide cheerful, highly practical, and motivating answers to Swift taxi drivers who are simulating or carrying out client rides. 
      Speak in a friendly, supportive tone like an expert dispatcher or driver coach.
      
      ${statsContext}

      Active conversation:
      ${messages.map((m: any) => `${m.sender === 'driver' ? 'Driver' : 'Coach'}: ${m.text}`).join('\n')}
      
      Respond to the driver's last query concisely in 2-3 sentences. Do not offer unsolicited code or markdown tables.
      Last Query: "${userMessage}"
      `;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const textReply = response.text || "I'm on it! Drive safely and check your dispatch rules.";

      res.json({
        text: textReply,
        sender: 'support',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (error: any) {
      console.error('Gemini API call failed, using fallback:', error);
      res.json({
        text: "🚨 (Connection Timeout fallback) Hey driver, Swift dispatch servers are busy right now. Make sure to drive safely and check your current heat coordinates on the surge map overlay!",
        sender: 'support',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  });

  // API Route - FCM background push gateway
  app.post('/api/send-push', async (req, res) => {
    const { token, title, body, orderId } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Missing destination fcmToken (token).' });
    }

    const notificationTitle = title || 'New Delivery Available 🍔';
    const notificationBody = body || 'McBurger • £8.50 • 2.3 miles away';

    try {
      if (!admin.apps.length || !process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Safe simulated response when FIREBASE_SERVICE_ACCOUNT is unset
        console.log('[Push Simulation] FIREBASE_SERVICE_ACCOUNT not configured. Simulating dispatch match:', {
          token, title: notificationTitle, body: notificationBody, orderId
        });
        return res.status(200).json({
          success: true,
          simulated: true,
          messageId: 'simulated_fcm_message_id_' + Math.random().toString(36).substring(2, 10),
          data: { title: notificationTitle, body: notificationBody, orderId }
        });
      }

      // Construct high-priority message payloads for Mobile & Web Applications
      const message: any = {
        token: token,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          title: notificationTitle,
          body: notificationBody,
          orderId: orderId || '',
          click_action: `/?action=view&orderId=${orderId || ''}`,
          url: `/?action=view&orderId=${orderId || ''}`
        },
        android: {
          priority: 'high',
          notification: {
            icon: 'icon',
            color: '#090a0f',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            notificationCount: 1,
          },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title: notificationTitle,
            body: notificationBody,
            icon: 'https://img.icons8.com/color/512/taxi.png',
            badge: 'https://img.icons8.com/color/512/taxi.png',
            vibrate: [200, 100, 200, 100, 200],
            actions: [
              { action: 'accept', title: 'Accept ✅' },
              { action: 'decline', title: 'Decline ❌' }
            ] as any
          },
          fcmOptions: {
            link: `/?action=view&orderId=${orderId || ''}`
          }
        }
      };

      const response = await admin.messaging().send(message);
      return res.status(200).json({
        success: true,
        messageId: response
      });
    } catch (error: any) {
      console.error('FCM Dispatch failure:', error);
      return res.status(500).json({
        error: 'Failed to send FCM push notification',
        details: error.message
      });
    }
  });

  // Vite development middleware vs Static Production setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Swift Simulator Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
