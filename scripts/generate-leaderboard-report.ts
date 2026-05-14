
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const today = new Date('2026-04-22T00:00:00Z');
  const endOfDay = new Date('2026-04-22T23:59:59Z');

  console.log(`Generating report for: ${today.toISOString()} to ${endOfDay.toISOString()}`);

  // 1. Fetch all campuses
  const campuses = await prisma.campus.findMany({
    where: { isActive: true },
    include: {
      targets: {
        where: {
          month: today.getUTCMonth() + 1,
          year: today.getUTCFullYear(),
        }
      }
    }
  });

  // 2. Fetch all ReferralLeads created today
  const referralsToday = await prisma.referralLead.findMany({
    where: {
      createdAt: {
        gte: today,
        lte: endOfDay
      }
    },
    include: {
      user: {
        select: {
          fullName: true,
          role: true,
          assignedCampus: true
        }
      }
    }
  });

  // 3. Fetch Summer Camp 2026 referrals
  const summerCampPrograms = await prisma.externalProgram.findMany({
    where: {
      title: { contains: 'Summer Camp' },
      isActive: true
    }
  });

  const summerCampLeads = await prisma.programLead.findMany({
    where: {
      programId: { in: summerCampPrograms.map(p => p.id) },
      clickedAt: {
        gte: today,
        lte: endOfDay
      }
    }
  });

  // 4. Group data by campus
  const branchStats = campuses.map(campus => {
    const campusReferrals = referralsToday.filter(r => r.campusId === campus.id || r.campus === campus.campusName);
    const admissions = campusReferrals.filter(r => r.leadStatus === 'Admitted' || r.leadStatus === 'Confirmed').length;
    const referrals = campusReferrals.length;
    const conversion = referrals > 0 ? (admissions / referrals) * 100 : 0;
    const target = campus.targets[0]?.admissionTarget || 5;

    // Growth calculation: Referrals in the last 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const recentReferrals = campusReferrals.filter(r => r.createdAt >= fourHoursAgo).length;

    return {
      name: campus.campusName,
      referrals,
      admissions,
      conversion,
      target,
      recentReferrals,
      belowTarget: referrals < target
    };
  });

  // Sort by referrals for leaderboard
  const leaderboard = [...branchStats].sort((a, b) => b.referrals - a.referrals);

  // 5. Star Performers (Top contributors today)
  const contributorMap: Record<number, { name: string, branch: string, referrals: number }> = {};
  referralsToday.forEach(r => {
    if (!contributorMap[r.userId]) {
      contributorMap[r.userId] = {
        name: r.user.fullName,
        branch: r.user.assignedCampus || 'N/A',
        referrals: 0
      };
    }
    contributorMap[r.userId].referrals++;
  });

  const starPerformers = Object.values(contributorMap).sort((a, b) => b.referrals - a.referrals).slice(0, 5);

  // 6. Power Metrics
  const highestReferralsBranch = leaderboard[0];
  const bestConversionBranch = branchStats.filter(b => b.referrals > 0).sort((a, b) => b.conversion - a.conversion)[0];
  const fastestGrowthBranch = [...branchStats].sort((a, b) => b.recentReferrals - a.recentReferrals)[0];

  const reportContent = `
# 🏆 HOC APP DRIVE – DAILY LEADERBOARD WAR ROOM
**Date: 22nd April 2026**

*Dear Heads 👋*
Today is not just reporting—it’s a competition between branches.

## 🔥 LIVE LEADERBOARD – TOP PERFORMING BRANCHES
${leaderboard.slice(0, 3).map((b, i) => {
    const medal = i === 0 ? '🥇 Rank 1' : i === 1 ? '🥈 Rank 2' : '🥉 Rank 3';
    return `* **${medal}**: ${b.name} | Referrals: ${b.referrals} | Admissions: ${b.admissions} | Conversion: ${b.conversion.toFixed(1)}%`;
  }).join('\n')}

### 🏅 4th – 6th Position:
${leaderboard.slice(3, 6).map((b, i) => `* ${i + 4}. ${b.name} | ${b.referrals}`).join('\n')}

## ⚡ POWER METRICS (DRIVES WINNERS)
* 🚀 **Highest Referrals (Today)**: ${highestReferralsBranch?.name || 'N/A'} (${highestReferralsBranch?.referrals || 0})
* 🎯 **Best Conversion %**: ${bestConversionBranch ? `${bestConversionBranch.name} (${bestConversionBranch.conversion.toFixed(1)}%)` : 'N/A'}
* 🔥 **Fastest Growth (Last 4h)**: ${fastestGrowthBranch?.name || 'N/A'} (+${fastestGrowthBranch?.recentReferrals || 0} leads)
* 👑 **Star Ambassador Branch**: ${highestReferralsBranch?.name || 'N/A'}

## 🎖️ STAR PERFORMERS (MANDATORY)
*Top Parent/Staff Contributors Across Branches:*
${starPerformers.map((p, i) => `${i + 1}. **${p.name}** (Branch: ${p.branch} | Referrals: ${p.referrals})`).join('\n')}

## 🚨 RED ZONE ALERT (IMMEDIATE ACTION REQUIRED)
⚠️ **Branches below target:**
${branchStats.filter(b => b.referrals < 2).slice(0, 10).map(b => `* ${b.name} (${b.referrals} referrals)`).join('\n')}
${branchStats.filter(b => b.referrals < 2).length > 10 ? `* ...and ${branchStats.filter(b => b.referrals < 2).length - 10} more branches` : ''}

👉 *Less than expected referrals = Immediate activation required*
*(Call parents, push ambassadors, drive teacher follow-ups NOW)*

## 🎯 DAILY TARGET TRACKER
* **Minimum 5 Referrals per Active Parent**
* **Split Focus:**
  * APP Referrals: ${referralsToday.length}
  * Summer Camp 2026 Referrals: ${summerCampLeads.length}

## 🏁 DAILY CHALLENGE (COMPETITION TRIGGER)
🔥 **Today’s Challenge:**
* First branch to cross 100 referrals gets *“Rapid Fire Champion”* title
* Highest (min 25) conversion branch gets *“Closing Master”* title
* Overall winner gets *“Branch of the Day 🏆”*

---
👉 **What you do in the next 3–4 hours will decide your rank.**
👉 **Every call, every parent conversation, every follow-up counts.**
***No passive reporting. Only active execution wins.***
`;

  console.log(reportContent);
  fs.writeFileSync('DAILY_LEADERBOARD_REPORT.md', reportContent);
  console.log('\nReport saved to DAILY_LEADERBOARD_REPORT.md');
}

main().catch(console.error).finally(() => prisma.$disconnect());
