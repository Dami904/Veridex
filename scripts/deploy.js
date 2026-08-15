import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

async function deploy() {
  console.log('\n======================================================');
  console.log('  🚀 VERIDEX PRODUCTION DEPLOYMENT (OPTION B)');
  console.log('======================================================\n');

  const renderKey = process.env.RENDER_API_KEY;
  const vercelToken = process.env.VERCEL_TOKEN;

  // 1. Connect to Render API
  console.log('[1/2] Checking Render Cloud Services...');
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
          console.log(`     • Service Name : ${veridexService.service?.name}`);
          console.log(`     🔗 Live Backend API URL : https://${veridexService.service?.slug}.onrender.com`);
        } else {
          console.log(`     • Synced GitHub Repo : https://github.com/Dami904/Veridex.git`);
          console.log(`     👉 Deploy Backend on Render: Click "New > Blueprint" and select Dami904/Veridex!`);
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

  // 2. Deploy Frontend to Vercel
  console.log('\n[2/2] Triggering Vercel Deployment for Frontend...');
  if (vercelToken) {
    try {
      const deployCmd = `pnpm dlx vercel --name veridex-frontend --prod --yes --token ${vercelToken}`;
      const child = exec(deployCmd);

      child.stdout?.on('data', (data) => {
        const str = data.toString();
        const urls = str.split('\n').filter((l) => l.includes('https://'));
        if (urls.length > 0) {
          console.log(`  🔗 Vercel Live Deployment: ${urls[urls.length - 1].trim()}`);
        }
      });

      child.stderr?.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('https://')) {
          console.log(`  🔗 Vercel URL: ${msg.trim()}`);
        }
      });

      await new Promise((resolve) => {
        child.on('close', resolve);
        // Timeout after 30 seconds
        setTimeout(() => {
          child.kill();
          resolve();
        }, 30000);
      });
      console.log('  ✅ Vercel deploy command dispatched!');
    } catch (err) {
      console.warn('  ⚠️ Vercel Notice:', err.message);
    }
  } else {
    console.log('  ⚠️ VERCEL_TOKEN missing in .env');
  }

  console.log('\n======================================================\n');
}

deploy();
