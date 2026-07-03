import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import firebaseAdmin from 'firebase-admin';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { initializeApp as initClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc as clientDoc, setDoc as clientSetDoc, getDoc as clientGetDoc, deleteDoc as clientDeleteDoc } from 'firebase/firestore';

const admin = firebaseAdmin as any;

dotenv.config();

const inMemoryOtps = new Map<string, { email: string; code: string; expiresAt: string; verified: boolean }>();

let serverFirestore: any = null;

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

// Try Admin Firestore first if initialized
if (admin.apps.length > 0) {
  try {
    serverFirestore = admin.firestore();
    console.log('Server initialized with Firebase Admin Firestore');
  } catch (err) {
    console.error('Failed to get Admin Firestore:', err);
  }
}

// Fallback to standard client SDK on backend if admin Firestore is not available
if (!serverFirestore) {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const clientApp = initClientApp(config);
      serverFirestore = getClientFirestore(clientApp, config.firestoreDatabaseId);
      console.log('Server initialized with standard Client-side Firestore SDK fallback');
    }
  } catch (err) {
    console.error('Failed to initialize fallback Client-side Firestore SDK on backend:', err);
  }
}

async function saveVerificationCode(email: string, code: string, expiresAt: string) {
  const payload = {
    email,
    code,
    expiresAt,
    verified: false
  };

  if (serverFirestore) {
    try {
      if (typeof serverFirestore.collection === 'function') {
        // Admin SDK
        await serverFirestore.collection('verification_codes').doc(email).set(payload);
      } else {
        // Client SDK
        await clientSetDoc(clientDoc(serverFirestore, 'verification_codes', email), payload);
      }
      console.log(`Saved OTP ${code} to Firestore for ${email}`);
    } catch (e) {
      console.error('Failed to write to Firestore verification_codes, falling back to in-memory:', e);
      inMemoryOtps.set(email, payload);
    }
  } else {
    // In-memory backup
    inMemoryOtps.set(email, payload);
    console.log('Saved OTP to in-memory backup:', payload);
  }
}

async function getVerificationCode(email: string) {
  if (serverFirestore) {
    try {
      if (typeof serverFirestore.collection === 'function') {
        // Admin SDK
        const snap = await serverFirestore.collection('verification_codes').doc(email).get();
        return snap.exists ? snap.data() : null;
      } else {
        // Client SDK
        const snap = await clientGetDoc(clientDoc(serverFirestore, 'verification_codes', email));
        return snap.exists() ? snap.data() : null;
      }
    } catch (e) {
      console.error('Failed to read from Firestore verification_codes, falling back to in-memory:', e);
      return inMemoryOtps.get(email) || null;
    }
  } else {
    // In-memory backup
    return inMemoryOtps.get(email) || null;
  }
}

async function removeVerificationCode(email: string) {
  if (serverFirestore) {
    try {
      if (typeof serverFirestore.collection === 'function') {
        // Admin SDK
        await serverFirestore.collection('verification_codes').doc(email).delete();
      } else {
        // Client SDK
        await clientDeleteDoc(clientDoc(serverFirestore, 'verification_codes', email));
      }
    } catch (e) {
      console.error('Failed to delete from Firestore verification_codes:', e);
      inMemoryOtps.delete(email);
    }
  } else {
    // In-memory backup
    inMemoryOtps.delete(email);
  }
}

async function sendVerificationEmail(email: string, otp: string) {
  // Try to read SMTP credentials from process.env
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"Swift Operator Security" <${smtpUser}>`,
        to: email,
        subject: `🔒 Swift Driver Security Pass OTP: ${otp}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 800; color: #13AA52; letter-spacing: -0.5px;">SWIFT</span>
            </div>
            <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">Verify Daily Driver Pass</h2>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 20px;">
              Standard security compliance requires active Swift operators to verify their email identity and complete biometric scans daily.
            </p>
            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #111827; font-family: monospace;">${otp}</span>
            </div>
            <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 24px;">
              This security code was requested for <strong>${email}</strong>. It will expire in 5 minutes. If you did not make this request, please contact support.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Real verification email successfully sent to ${email}`);
      return { success: true, realSent: true };
    } catch (err) {
      console.error('SMTP / Gmail transport send failed:', err);
      return { success: true, realSent: false };
    }
  } else {
    console.warn('SMTP / Gmail credentials not configured. Falling back to log-delivery.');
    return { success: true, realSent: false };
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

  // API Route - Request OTP Verification Code
  app.post('/api/request-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Generate 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiration

    try {
      // Save code to Firestore (or in-memory fallback)
      await saveVerificationCode(email, otp, expiresAt);

      // Attempt to send email
      const emailResult = await sendVerificationEmail(email, otp);

      return res.status(200).json({
        success: true,
        message: emailResult.realSent 
          ? `🔒 Security pass code sent successfully to ${email}.` 
          : `🔒 OTP Generated. Note: SMTP credentials not set, code: ${otp} (displayed for simulator testing).`,
        otp: emailResult.realSent ? undefined : otp, // Expose only for testing when real email is not configured!
        realSent: emailResult.realSent
      });
    } catch (err: any) {
      console.error('Request OTP failure:', err);
      return res.status(500).json({
        error: 'Failed to request security code',
        details: err.message
      });
    }
  });

  // API Route - Verify OTP Code
  app.post('/api/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Missing email or verification code.' });
    }

    try {
      const saved = await getVerificationCode(email);
      if (!saved) {
        return res.status(404).json({ error: 'No active security code found for this email. Please request a new one.' });
      }

      // Check expiry
      const expiresAt = new Date(saved.expiresAt);
      if (Date.now() > expiresAt.getTime()) {
        await removeVerificationCode(email);
        return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      }

      // Check code
      if (saved.code !== code.trim()) {
        return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      }

      // Successful verification! Delete code on completion
      await removeVerificationCode(email);

      return res.status(200).json({
        success: true,
        message: '✓ Email identity verified successfully. Security pass granted!'
      });
    } catch (err: any) {
      console.error('Verify OTP failure:', err);
      return res.status(500).json({
        error: 'Verification process failed',
        details: err.message
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
