import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

async function syncVercelEnv() {
  console.log('\n======================================================');
  console.log('  ⚡ VERCEL ENVIRONMENT SYNC & PRODUCTION DEPLOY');
  console.log('======================================================\n');

  const token = process.env.VERCEL_TOKEN;
  const renderUrl = process.env.VITE_API_URL || 'https://veridex-consensus-engine.onrender.com';

  if (!token) {
    console.error('❌ VERCEL_TOKEN missing in .env');
    return;
  }

  // 1. Add / Update VITE_API_URL on Vercel project
  console.log(`[1/2] Configuring VITE_API_URL = "${renderUrl}" on Vercel...`);
  try {
    const res = await fetch('https://api.vercel.com/v10/projects/veridex-frontend/env', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'VITE_API_URL',
        value: renderUrl,
        type: 'plain',
        target: ['production', 'preview', 'development'],
      }),
    });

    if (res.ok || res.status === 409) {
      console.log('  ✅ VITE_API_URL configured on Vercel project!');
    } else {
      const err = await res.text();
      console.log('  ℹ️ Vercel API status:', res.status, err);
    }
  } catch (err) {
    console.warn('  ⚠️ Vercel Env API Notice:', err.message);
  }

  // 2. Trigger Production Deployment with Build Env
  console.log('\n[2/2] Triggering Vercel Production Build with live Render backend...');
  try {
    const deployCmd = `pnpm dlx vercel --prod --yes --token ${token} --build-env VITE_API_URL=${renderUrl}`;
    const output = execSync(deployCmd, { stdio: 'pipe' });
    console.log('  ✅ Vercel Production Deployment Succeeded!');
    console.log(`     🔗 Live Frontend URL : https://veridex-frontend.vercel.app`);
    console.log(`     🔗 Live Backend API  : ${renderUrl}`);
  } catch (err) {
    console.warn('  ⚠️ Vercel Build Notice:', err.stdout?.toString() || err.message);
  }

  console.log('\n======================================================\n');
}

syncVercelEnv();
