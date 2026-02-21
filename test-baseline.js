const { getCompatibleVersions } = require('./node_modules/baseline-browser-mapping/dist/index.cjs');

console.log('Testing getCompatibleVersions()...');
try {
    getCompatibleVersions();
} catch (e) {
    console.error(e);
}

console.log('Testing getCompatibleVersions({ targetYear: 2026 })...');
try {
    getCompatibleVersions({ targetYear: 2026 });
} catch (e) {
    console.error(e);
}
