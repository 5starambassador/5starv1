const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Images to optimize - the 4 critical large PNG files
const imagesToOptimize = [
    { input: 'public/images/ambassador-badge.png', output: 'public/images/ambassador-badge.webp' },
    { input: 'public/bg-pattern.png', output: 'public/bg-pattern.webp' },
    { input: 'public/images/ambassador-badge-cutout.png', output: 'public/images/ambassador-badge-cutout.webp' },
    { input: 'public/images/badge-chroma.png', output: 'public/images/badge-chroma.webp' }
];

async function optimizeImages() {
    console.log('🖼️  Starting image optimization...\n');

    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    for (const { input, output } of imagesToOptimize) {
        const inputPath = path.join(__dirname, '..', input);
        const outputPath = path.join(__dirname, '..', output);

        try {
            // Check if input file exists
            if (!fs.existsSync(inputPath)) {
                console.log(`⚠️  Skipping ${input} - file not found`);
                continue;
            }

            // Get original file size
            const originalStats = fs.statSync(inputPath);
            const originalSizeKB = (originalStats.size / 1024).toFixed(2);
            totalOriginalSize += originalStats.size;

            // Convert to WebP with quality 85 (good balance of quality/size)
            await sharp(inputPath)
                .webp({ quality: 85, effort: 6 })
                .toFile(outputPath);

            // Get optimized file size
            const optimizedStats = fs.statSync(outputPath);
            const optimizedSizeKB = (optimizedStats.size / 1024).toFixed(2);
            totalOptimizedSize += optimizedStats.size;

            const reduction = ((1 - optimizedStats.size / originalStats.size) * 100).toFixed(1);

            console.log(`✅ ${path.basename(input)}`);
            console.log(`   Original: ${originalSizeKB} KB`);
            console.log(`   Optimized: ${optimizedSizeKB} KB`);
            console.log(`   Reduction: ${reduction}% 🎉\n`);

        } catch (error) {
            console.error(`❌ Error processing ${input}:`, error.message);
        }
    }

    const totalReduction = ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1);
    console.log('='.repeat(50));
    console.log(`📊 TOTAL RESULTS:`);
    console.log(`   Original: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
    console.log(`   Optimized: ${(totalOptimizedSize / 1024).toFixed(2)} KB`);
    console.log(`   Total Reduction: ${totalReduction}% 🚀`);
    console.log('='.repeat(50));
}

optimizeImages().catch(console.error);
