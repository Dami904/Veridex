import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

async function deploy() {
  console.log('\n======================================================');
  console.log('  🚀 VERIDEX PRODUCTION DEPLOYMENT (OPTION B)');
  console.log('======================================================\n');

  const renderKey = process.env.RENDER_API_KEY;
  const vercelToken = process.env.VERCEL_TOKEN;

  // 1. Deploy Frontend to Vercel
  console.log('[1/2] Deploying Frontend to Vercel...');
  if (vercelToken) {
    try {
      const output = execSync(
        `pnpm dlx vercel --prod --yes --token ${vercelToken}`,
        { stdio: 'pipe' }
      );
      console.log('  ✅ Vercel Deployment Triggered Successfully!');
      const lines = output.toString().split('\n').filter((l) => l.includes('https://'));
      if (lines.length > 0) {
        console.log(`     Live URL: ${lines[lines.length - 1].trim()}`);
      }
    } catch (err) {
      console.warn('  ⚠️ Vercel Notice:', err.stdout?.toString() || err.message);
    }
  } else {
    console.log('  ⚠️ VERCEL_TOKEN missing in .env');
  }

  // 2. Deploy Backend to Render
  console.log('\n[2/2] Connecting to Render API...');
  if (renderKey) {
    try {
      const res = await fetch('https://api.render.com/v1/services?limit=10', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${renderKey}`,
        },
      });

      if (res.ok) {
        const services = await res.json();
        console.log(`  ✅ Render API Authenticated! (Found ${services.length} existing service(s))`);
        for (const s of services) {
          console.log(`     • [${s.service?.type}] ${s.service?.name} -> https://${s.service?.slug}.onrender.com`);
        }
      } else {
        const errText = await res.text();
        console.warn('  ⚠️ Render API Response:', errText);
      }
    } catch (err) {
      console.warn('  ⚠️ Render API Notice:', err.message);
    }
  } else {
    console.log('  ⚠️ RENDER_API_KEY missing in .env');
  }

  console.log('\n======================================================\n');
}

deploy();
