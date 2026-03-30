import prisma from "@/lib/prisma";

/**
 * Knowledge Retrieval for RAG (Retrieval-Augmented Generation)
 * Searches for relevant programs, benefits, and school information based on the user's query.
 */
export async function getRelevantKnowledge(query: string): Promise<string> {
    const term = query.trim().toLowerCase();
    let facts = "";

    // 1. Search Programs
    const programs = await prisma.externalProgram.findMany({
        where: { isActive: true }
    });

    const matchedPrograms = programs.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.description?.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term)
    );

    if (matchedPrograms.length > 0) {
        facts += "PROGRAM INFORMATION FOUND IN RECENT SEARCH:\n";
        matchedPrograms.forEach(p => {
            facts += `- Program: ${p.title}\n`;
            facts += `  Description: ${p.description || "N/A"}\n`;
            facts += `  Commission: ₹${p.commissionAmount} per confirmed referral\n`;
            if (p.targetUrl) facts += `  Registration Link: ${p.targetUrl}\n`;
        });
    }

    // 2. Search Benefits (Slabs)
    if (term.includes("benefit") || term.includes("money") || term.includes("earn") || term.includes("payout") || term.includes("slab")) {
        const slabs = await prisma.benefitSlab.findMany({
            orderBy: { referralCount: "asc" }
        });
        facts += "AMBASSADOR REWARD TIERS (Current Facts):\n";
        slabs.forEach(s => {
            facts += `- Tier ${s.tierName || s.slabId}: ${s.referralCount}+ Referrals = ${s.yearFeeBenefitPercent}% Fee Benefit\n`;
        });
    }

    // 3. Campus Information (General Facts)
    if (term.includes("location") || term.includes("campus") || term.includes("where")) {
        const campuses = await prisma.campus.findMany({
            where: { isActive: true }
        });
        facts += "CAMPUS LOCATIONS & CONTACTS:\n";
        campuses.forEach(c => {
            facts += `- ${c.campusName} (${c.campusCode}): ${c.location}. Contact: ${c.contactEmail || "info@achariya.in"}\n`;
        });
    }

    return facts || "No specific program data found. Provide general helpful ambassador knowledge.";
}
