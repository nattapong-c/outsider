# Outsider Deployment Guide

This guide covers deploying the Outsider application to Vercel (frontend) and Render (backend).

## 📋 Project Structure

```
outsider/
├── app/           # Next.js Frontend → Deploy to Vercel
├── service/       # ElysiaJS Backend → Deploy to Render
├── vercel.json    # Vercel configuration
└── README.md
```

---

## 🚀 Frontend Deployment (Vercel)

### Step 1: Prepare Vercel Project

1. **Go to [Vercel](https://vercel.com)**
2. **Click "Add New Project"**
3. **Import your Git repository**

### Step 2: Configure Build Settings

**Option A: Using vercel.json (Recommended)**

The `vercel.json` file in the root directory handles configuration:

```json
{
  "version": 2,
  "buildCommand": "cd app && bun run build",
  "outputDirectory": "app/.next",
  "devCommand": "cd app && bun run dev",
  "installCommand": "cd app && bun install"
}
```

**Option B: Manual Configuration**

In Vercel project settings:
- **Root Directory:** `./app`
- **Build Command:** `bun run build`
- **Output Directory:** `.next`
- **Install Command:** `cd app && bun install`

### Step 3: Set Environment Variables

In Vercel project settings, add:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend-url.onrender.com
```

### Step 4: Deploy

Click **"Deploy"** and Vercel will build and deploy your frontend.

---

## 🔧 Backend Deployment (Render)

### Step 1: Prepare Render Service

1. **Go to [Render](https://render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your Git repository**

### Step 2: Configure Service

- **Name:** `outsider-backend` (or your choice)
- **Root Directory:** `./service`
- **Runtime:** `Node`
- **Build Command:** `bun install`
- **Start Command:** `bun run start`

### Step 3: Set Environment Variables

In Render dashboard, add:

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/outsider
PORT=3001
CORS_ORIGIN=https://your-frontend.vercel.app
NODE_ENV=production
```

### Step 4: Deploy

Click **"Create Web Service"** and Render will deploy your backend.

---

## 🔗 Connect Frontend & Backend

### Update Vercel Environment Variables

After backend is deployed on Render:

1. **Copy your Render backend URL** (e.g., `https://outsider-backend.onrender.com`)
2. **Update Vercel environment variables:**
   ```bash
   NEXT_PUBLIC_API_URL=https://outsider-backend.onrender.com
   NEXT_PUBLIC_WS_URL=wss://outsider-backend.onrender.com
   ```
3. **Redeploy frontend** on Vercel

### Update Render Environment Variables

After frontend is deployed on Vercel:

1. **Copy your Vercel frontend URL** (e.g., `https://outsider.vercel.app`)
2. **Update Render CORS_ORIGIN:**
   ```bash
   CORS_ORIGIN=https://outsider.vercel.app
   ```
3. **Redeploy backend** on Render

---

## 🧪 Testing Deployment

### Frontend Tests

1. **Visit your Vercel URL**
2. **Create a room**
3. **Join with multiple browsers**
4. **Test game flow**

### Backend Tests

```bash
# Test API endpoint
curl https://your-backend-url.onrender.com/

# Test word API
curl https://your-backend-url.onrender.com/api/words/stats

# Test WebSocket connection
# Use browser console or WebSocket client
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Cannot find module 'elysia'"

**Cause:** Vercel is trying to install backend dependencies in the frontend folder.

**Solution:** 
- Ensure Root Directory is set to `./app` in Vercel
- Or use the `vercel.json` configuration file

### Issue: CORS Errors

**Cause:** Backend CORS_ORIGIN doesn't match frontend URL.

**Solution:**
- Update `CORS_ORIGIN` in Render environment variables
- Use the exact Vercel URL (including `https://`)
- Redeploy backend after changing CORS_ORIGIN

### Issue: WebSocket Connection Fails

**Cause:** WebSocket URL is incorrect or using `ws://` instead of `wss://`.

**Solution:**
- Use `wss://` (secure WebSocket) for production
- Update `NEXT_PUBLIC_WS_URL` in Vercel environment variables
- Ensure Render service is running (not sleeping)

### Issue: MongoDB Connection Fails

**Cause:** MongoDB Atlas IP whitelist doesn't include Render.

**Solution:**
- Add `0.0.0.0/0` to MongoDB Atlas IP whitelist (allow all IPs)
- Or add Render's IP addresses specifically
- Restart Render service after updating whitelist

### Issue: Backend Sleeps on Render (Free Tier)

**Cause:** Render free tier services sleep after 15 minutes of inactivity.

**Solution:**
- Upgrade to Render paid plan
- Or use a service like [UptimeRobot](https://uptimerobot.com) to ping the backend every 10 minutes

---

## 📊 Monitoring & Logs

### Vercel Frontend

- **Deployment Logs:** Vercel Dashboard → Deployments → Click deployment
- **Runtime Logs:** Not available (static hosting)
- **Errors:** Check browser console and Vercel Functions logs

### Render Backend

- **Service Logs:** Render Dashboard → Select Service → Logs
- **Real-time Logs:** Click "Live" tab in Logs section
- **Errors:** Search for "ERROR" in logs

---

## 🔄 Continuous Deployment

Both Vercel and Render support **automatic deployments**:

- **Vercel:** Automatically deploys on every push to `main` branch
- **Render:** Automatically deploys on every push to `main` branch

No additional configuration needed! Just push to Git and both services will redeploy.

---

## 📝 Environment Variables Reference

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend REST API URL | `https://backend.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL | `wss://backend.onrender.com` |

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | Frontend URL for CORS | `https://frontend.vercel.app` |
| `NODE_ENV` | Environment | `production` |

---

## 🎯 Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Render
- [ ] MongoDB Atlas configured (IP whitelist, connection string)
- [ ] Environment variables set on both platforms
- [ ] CORS_ORIGIN matches frontend URL
- [ ] WebSocket URL uses `wss://`
- [ ] Test game creation and joining
- [ ] Test word selection (difficulty & language)
- [ ] Test voting system
- [ ] Monitor logs for errors

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs** on both Vercel and Render
2. **Verify environment variables** are set correctly
3. **Test backend API** directly using curl or Postman
4. **Check browser console** for frontend errors
5. **Review CORS settings** if getting network errors

---

**Good luck with your deployment!** 🚀
