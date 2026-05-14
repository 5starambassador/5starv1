const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const campusData = [
    { name: "ASM - VILLIANUR", email: "asmlead@achariya.org" },
    { name: "ABSM - THENGAITHITTU", email: "absmtt@achariya.org" },
    { name: "AKLAVYA - THENGAITHITTU", email: "aklavya@achariya.org" },
    { name: "SSV - VILLIANUR", email: "smphead@achariya.org" },
    { name: "ASM - THAVALAKUPPAM", email: "asm.tvm@achariya.org" },
    { name: "ASM - MOOLAKULAM", email: "asm.mkm@achariya.org" },
    { name: "ASM - KARAIKAL", email: "asm.kkl@achariya.org" },
    { name: "AWGI - ETTIMADAI", email: "principal.awgi@achariya.org" },
    { name: "AIIS - ERODE", email: "principal.aiis@achariya.org" },
    { name: "ASM - TRICHY", email: "principal.trichy@achariya.org" },
    { name: "ABSM - TINDIVANAM", email: "absm.tindivanam@achariya.org" },
    { name: "ASM - VILLUPURAM", email: "asm.vpm@achariya.org" },
    { name: "AKLAVYA - REDDIYARPALAYAM", email: "rp.aklavya@achariya.org" },
    { name: "ASM - MUTHIRAPALAYAM", email: "asmmp@achariya.org" },
    { name: "ABSM - GORIMEDU", email: "absmgm@achariya.org" },
    { name: "ABSM - LAWSPET", email: "absmgm@achariya.org" },
    { name: "ABSM - MUTHIYALPET", email: "absm.mlp@achariya.org" },
    { name: "ABSM - KALAPET", email: "absmkp@achariya.org" },
    { name: "ABSM - VENKATA NAGAR", email: "absmvn@achariya.org" },
    { name: "AKLAVYA - ANUGRAHA", email: "aklavya.anugraha@achariya.org" },
    { name: "ABSM - TRICHY", email: "principal.trichy@achariya.org" },
    { name: "ASM CC - ERODE", email: "asm.efc@achariya.org" },
    { name: "ASM - PERUNDURAI", email: "asm.epc@achariya.org" },
    { name: "ASM - ALAPAKKAM", email: "asmprincipal.ch@achariya.org" },
    { name: "ABSM - ADYAR", email: "absmadyar.ch@achariya.org" },
    { name: "ABSM - KK NAGAR", email: "absmkknagar.ch@achariya.org" },
    { name: "ABSM - VARASALAVAKAM", email: "absmvalasaravakkam.ch@achariya.org" },
    { name: "ABSM - PADMANABHANAGAR", email: "absmpadmanabanagar.ch@achariya.org" },
    { name: "ABSM - DASARATHAPURAM", email: "absmvirugambakkam.ch@achariya.org" },
    { name: "ABSM - SALIGRAMAM", email: "absmsaligramam.ch@achariya.org" },
    { name: "ABSM - RK NAGAR", email: "absmrknagar.ch@achariya.org" },
    { name: "ABSM - ALAPAKKAM", email: "absmporur.ch@achariya.org" },
    { name: "ABSM - THIRU NAGAR", email: "absmthirunagar.ch@achariya.org" },
    { name: "ABSM - MADURAVOYAL", email: "absmmaduravoyal.ch@achariya.org" },
    { name: "ABSM - NOLAMBUR", email: "absmnolambur.ch@achariya.org" },
    { name: "ABSM PP - THENGAITHITTU", email: "absmpphead@achariya.org" },
    { name: "SSV HSC- VILLIANUR", email: "asmresidentialprincipal@achariya.org" },
    { name: "ASM HSC - VILLIANUR", email: "asmhead@achariya.org" },
    { name: "ACET", email: "acethead@achariya.org" },
    { name: "AASC", email: "aaschead@achariya.org" },
    { name: "ACCHM", email: "principal.acchm@achariya.org" }
]

async function update() {
    let updatedCount = 0
    for (const item of campusData) {
        try {
            const result = await prisma.campus.updateMany({
                where: { campusName: item.name },
                data: { contactEmail: item.email }
            })
            if (result.count > 0) {
                updatedCount++
                console.log(`✅ Updated: ${item.name} -> ${item.email}`)
            } else {
                console.warn(`⚠️ Not found in DB: ${item.name}`)
            }
        } catch (e) {
            console.error(`❌ Error updating ${item.name}:`, e.message)
        }
    }
    console.log(`\n🎉 FINISHED: Successfully updated ${updatedCount} campuses.`)
    await prisma.$disconnect()
}

update()
