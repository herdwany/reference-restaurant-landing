#!/usr/bin/env node

/**
 * importClientData.mjs
 * 
 * Safe import/restore script for client data exports.
 * 
 * Features:
 * - Dry-run by default (no actual writes)
 * - Shows what would be imported
 * - Validates data structure before import
 * - Does not import secrets
 * - Does not upload images
 * 
 * Usage:
 * - Dry-run: npm run import:client
 * - Apply: npm run import:client -- --apply
 * - Specific export: node scripts/importClientData.mjs /path/to/export --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const customPath = args.find(arg => !arg.startsWith('--'));
const exportPath = customPath || path.join(projectRoot, 'exports');
const dryRun = !isApply;

console.log('📋 Client Data Import Utility');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Mode: ${dryRun ? '🔍 DRY-RUN (no changes)' : '✅ APPLY (changes will be made)'}`);
console.log(`Export path: ${exportPath}`);
console.log('');

// Helper: recursively find export-summary.json
const findExportSummary = (dir, depth = 0, maxDepth = 3) => {
    if (depth > maxDepth) return null;

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        // Check for export-summary.json in current directory
        const summary = entries.find(e => e.name === 'export-summary.json');
        if (summary) {
            return path.join(dir, 'export-summary.json');
        }

        // Sort subdirectories by name (ISO dates work well when sorted reverse)
        const subdirs = entries
            .filter(e => e.isDirectory())
            .sort((a, b) => b.name.localeCompare(a.name));

        // Recursively search subdirectories
        for (const subdir of subdirs) {
            const result = findExportSummary(path.join(dir, subdir.name), depth + 1, maxDepth);
            if (result) return result;
        }
    } catch (err) {
        // Silently skip directories we can't read
    }

    return null;
};

// Main import logic
const importClientData = async () => {
    try {
        // Check if export path exists
        if (!fs.existsSync(exportPath)) {
            console.error(`❌ Export path not found: ${exportPath}`);
            process.exit(1);
        }

        const stats = fs.statSync(exportPath);

        // Find export-summary.json
        let summaryPath = null;

        if (stats.isDirectory()) {
            summaryPath = findExportSummary(exportPath);
            if (!summaryPath) {
                console.error(`❌ No export-summary.json found in: ${exportPath}`);
                process.exit(1);
            }
        } else if (stats.isFile()) {
            // Direct file path
            summaryPath = exportPath;
        }

        // Read export summary
        console.log(`📖 Reading export file: ${path.basename(summaryPath)}`);
        const summaryDataRaw = fs.readFileSync(summaryPath, 'utf-8');
        const summaryData = JSON.parse(summaryDataRaw);

        // Validate export structure
        if (!summaryData.exportedAt) {
            console.error('❌ Invalid export: missing exportedAt timestamp');
            process.exit(1);
        }

        if (!summaryData.slug) {
            console.error('❌ Invalid export: missing slug');
            process.exit(1);
        }

        console.log(`✅ Export structure valid`);
        console.log(`📅 Exported at: ${new Date(summaryData.exportedAt).toISOString()}`);
        console.log(`🍽️  Restaurant: ${summaryData.slug} (${summaryData.restaurantName})`);
        console.log(`📊 Data counts:`, summaryData.counts);
        console.log('');

        // Show summary
        console.log('📊 Import Summary:');
        console.log(`  Restaurant: ${summaryData.slug}`);
        console.log(`  Owner: ${summaryData.restaurantId}`);
        console.log(`  Project: ${summaryData.appwriteProjectId}`);
        console.log('');

        console.log('✅ Restaurant ready for import:');
        console.log(`  • ${summaryData.slug} (${summaryData.restaurantName})`);
        console.log(`    - Project: ${summaryData.appwriteProjectId}`);
        console.log(`    - Database: ${summaryData.databaseId}`);

        console.log('');

        if (dryRun) {
            console.log('🔍 DRY-RUN: No changes made.');
            console.log('');
            console.log('To apply this import, run:');
            console.log(`  node scripts/importClientData.mjs ${exportPath} --apply`);
            console.log('');
            process.exit(0);
        } else {
            // Apply mode (currently stub - would connect to Appwrite)
            console.log('✅ APPLY mode - data validated successfully.');
            console.log('');
            console.log('Next steps:');
            console.log('  1. Verify the data above');
            console.log('  2. Integrate with Appwrite SDK in this script');
            console.log('  3. Use updateClientControlsViaFunction for sensitive updates');
            console.log('  4. Handle images separately (not in this script)');
            console.log('');
            console.log('⚠️  This is a foundation - actual import not yet implemented');
            process.exit(0);
        }
    } catch (error) {
        console.error('❌ Import failed:');
        console.error(`  ${error.message}`);
        if (error.code) {
            console.error(`  Code: ${error.code}`);
        }
        process.exit(1);
    }
};

// Run
importClientData();
