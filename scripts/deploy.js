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
  console.log('[1/2] Deploying Frontend to Vercel (veridex-frontend)...');
  if (vercelToken) {
    try {
      const output = execSync(
        `pnpm dlx vercel --name veridex-frontend --prod --yes --token ${vercelToken}`,
        { stdio: 'pipe' }
      );
      console.log('  ✅ Vercel Deployment Completed Successfully!');
      const raw = output.toString();
      const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('https://'));
      for (const line of lines) {
        console.log(`     🔗 Live Production URL: ${line}`);
      }
    } catch (err) {
      console.warn('  ⚠️ Vercel Notice:', err.stdout?.toString() || err.message);
    }
  } else {
    console.log('  ⚠️ VERCEL_TOKEN missing in .env');
  }

  // 2. Connect / Check Render API
  console.log('\n[2/2] Connecting to Render API...');
  if (renderKey) {
    try {
      const res = await fetch('https://api.render.com/v1/services?limit=20', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${renderKey}`,
        },
      });

      if (res.ok) {
        const services = await res.json();
        const veridexService = services.find((s) => s.service?.name?.toLowerCase().includes('veridex'));

        console.log(`  ✅ Render API Authenticated!`);
        if (veridexService) {
          console.log(`     • Found Veridex Service: ${veridexService.service?.name}`);
          console.log(`     🔗 Live Backend API URL: https://${veridexService.service?.slug}.onrender.com`);
        } else {
          console.log(`     • Repo is synced with GitHub: https://github.com/Dami904/Veridex.git`);
          console.log(`     👉 Ready for 1-Click Render Web Service Blueprint from repo!`);
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
