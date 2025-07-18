#!/usr/bin/env node
"use strict";
/**
 * Automated migration script for WebBuddy to Semantest rebranding
 *
 * Features:
 * - Dry run mode to preview changes
 * - Selective replacement with pattern filtering
 * - Rollback capability with backup creation
 * - Security exclusion handling
 *
 * Usage:
 *   npm run migrate -- --dry-run
 *   npm run migrate -- --pattern simple
 *   npm run migrate -- --rollback
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var util_1 = require("util");
var glob = require("glob");
var yargs_1 = require("yargs");
var helpers_1 = require("yargs/helpers");
// Load replacement mapping
var MAPPING_FILE = path.join(__dirname, 'replacement-mapping.json');
var mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
// Parse command line arguments
var argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .options({
    'dry-run': {
        type: 'boolean',
        description: 'Preview changes without modifying files',
        default: false
    },
    'pattern': {
        type: 'string',
        description: 'Filter patterns (simple, contextAware, all)',
        default: 'all'
    },
    'rollback': {
        type: 'boolean',
        description: 'Rollback to previous state',
        default: false
    },
    'verbose': {
        type: 'boolean',
        description: 'Show detailed output',
        default: false
    },
    'backup': {
        type: 'boolean',
        description: 'Create backup before migration',
        default: true
    }
})
    .parseSync();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var patterns, securityExclusions, files, totalReplacements, filesModified, _i, files_1, file, replacements;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚀 Semantest Migration Script');
                    console.log('============================\n');
                    if (!argv.rollback) return [3 /*break*/, 2];
                    return [4 /*yield*/, performRollback()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2:
                    if (!(argv.backup && !argv.dryRun)) return [3 /*break*/, 4];
                    return [4 /*yield*/, createBackup()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    patterns = getPatterns(argv.pattern || 'all');
                    securityExclusions = mapping.securityExclusions || [];
                    console.log("\uD83D\uDCCB Migration Configuration:");
                    console.log("  - Mode: ".concat(argv.dryRun ? 'DRY RUN' : 'LIVE'));
                    console.log("  - Pattern Set: ".concat(argv.pattern));
                    console.log("  - Total Patterns: ".concat(patterns.length));
                    console.log("  - Security Exclusions: ".concat(securityExclusions.length, "\n"));
                    if (argv.dryRun) {
                        console.log('⚠️  DRY RUN MODE - No files will be modified\n');
                    }
                    return [4 /*yield*/, getFilesToProcess()];
                case 5:
                    files = _a.sent();
                    console.log("\uD83D\uDCC1 Found ".concat(files.length, " files to process\n"));
                    totalReplacements = 0;
                    filesModified = 0;
                    _i = 0, files_1 = files;
                    _a.label = 6;
                case 6:
                    if (!(_i < files_1.length)) return [3 /*break*/, 9];
                    file = files_1[_i];
                    return [4 /*yield*/, processFile(file, patterns, securityExclusions, argv.dryRun)];
                case 7:
                    replacements = _a.sent();
                    if (replacements > 0) {
                        filesModified++;
                        totalReplacements += replacements;
                        if (argv.verbose) {
                            console.log("  \u2713 ".concat(file, ": ").concat(replacements, " replacements"));
                        }
                    }
                    _a.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 6];
                case 9:
                    console.log("\n\uD83D\uDCCA Summary:");
                    console.log("  - Files scanned: ".concat(files.length));
                    console.log("  - Files modified: ".concat(filesModified));
                    console.log("  - Total replacements: ".concat(totalReplacements));
                    console.log('\n✅ Migration complete!');
                    return [2 /*return*/];
            }
        });
    });
}
function getPatterns(patternType) {
    var patterns = [];
    if (patternType === 'all' || patternType === 'simple') {
        patterns.push.apply(patterns, mapping.simple || []);
    }
    if (patternType === 'all' || patternType === 'contextAware') {
        patterns.push.apply(patterns, mapping.contextAware || []);
    }
    return patterns;
}
function getFilesToProcess() {
    return __awaiter(this, void 0, void 0, function () {
        var globAsync, patterns, ignorePatterns, files, _i, patterns_1, pattern, matches;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    globAsync = (0, util_1.promisify)(glob.glob);
                    patterns = [
                        '**/*.ts',
                        '**/*.js',
                        '**/*.json',
                        '**/*.md',
                        '**/*.yml',
                        '**/*.yaml',
                        '**/Dockerfile',
                        '**/.env*'
                    ];
                    ignorePatterns = [
                        '**/node_modules/**',
                        '**/.git/**',
                        '**/dist/**',
                        '**/build/**',
                        '**/coverage/**',
                        '**/*.min.js',
                        '**/backup-*/**'
                    ];
                    files = [];
                    _i = 0, patterns_1 = patterns;
                    _a.label = 1;
                case 1:
                    if (!(_i < patterns_1.length)) return [3 /*break*/, 4];
                    pattern = patterns_1[_i];
                    return [4 /*yield*/, globAsync(pattern, { ignore: ignorePatterns })];
                case 2:
                    matches = _a.sent();
                    files.push.apply(files, matches);
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, __spreadArray([], new Set(files), true)]; // Remove duplicates
            }
        });
    });
}
function processFile(filePath, patterns, securityExclusions, dryRun) {
    return __awaiter(this, void 0, void 0, function () {
        var normalizedPath, content, newContent, replacementCount, _i, securityExclusions_1, exclusion, _a, patterns_2, pattern, regex, matches;
        return __generator(this, function (_b) {
            normalizedPath = path.normalize(filePath);
            if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
                throw new Error("Invalid file path: ".concat(filePath));
            }
            content = fs.readFileSync(filePath, 'utf-8');
            newContent = content;
            replacementCount = 0;
            // Check security exclusions first
            for (_i = 0, securityExclusions_1 = securityExclusions; _i < securityExclusions_1.length; _i++) {
                exclusion = securityExclusions_1[_i];
                if (content.includes(exclusion.pattern)) {
                    if (argv.verbose) {
                        console.log("  \u26A0\uFE0F  Skipping ".concat(filePath, ": Contains security pattern [REDACTED]"));
                    }
                    return [2 /*return*/, 0];
                }
            }
            // Apply replacements
            for (_a = 0, patterns_2 = patterns; _a < patterns_2.length; _a++) {
                pattern = patterns_2[_a];
                if (!pattern.replacement)
                    continue;
                regex = new RegExp(pattern.pattern, 'g');
                matches = content.match(regex);
                if (matches) {
                    replacementCount += matches.length;
                    newContent = newContent.replace(regex, pattern.replacement);
                }
            }
            if (replacementCount > 0 && !dryRun) {
                fs.writeFileSync(filePath, newContent, 'utf-8');
            }
            return [2 /*return*/, replacementCount];
        });
    });
}
function createBackup() {
    return __awaiter(this, void 0, void 0, function () {
        var timestamp, backupDir, files, _i, files_2, file, backupPath, dir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('📦 Creating backup...');
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    backupDir = "backup-".concat(timestamp);
                    // Create backup directory
                    fs.mkdirSync(backupDir, { recursive: true });
                    return [4 /*yield*/, getFilesToProcess()];
                case 1:
                    files = _a.sent();
                    for (_i = 0, files_2 = files; _i < files_2.length; _i++) {
                        file = files_2[_i];
                        backupPath = path.join(backupDir, file);
                        dir = path.dirname(backupPath);
                        fs.mkdirSync(dir, { recursive: true });
                        fs.copyFileSync(file, backupPath);
                    }
                    console.log("  \u2713 Backup created in ".concat(backupDir, "\n"));
                    return [2 /*return*/];
            }
        });
    });
}
function performRollback() {
    return __awaiter(this, void 0, void 0, function () {
        var backups, latestBackup, backupFiles, _i, backupFiles_1, backupFile, originalPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('⏮️  Performing rollback...');
                    backups = glob.sync('backup-*').sort().reverse();
                    if (backups.length === 0) {
                        throw new Error('No backup found for rollback');
                    }
                    latestBackup = backups[0];
                    console.log("  Using backup: ".concat(latestBackup));
                    return [4 /*yield*/, (0, util_1.promisify)(glob.glob)("".concat(latestBackup, "/**/*"), { nodir: true })];
                case 1:
                    backupFiles = _a.sent();
                    for (_i = 0, backupFiles_1 = backupFiles; _i < backupFiles_1.length; _i++) {
                        backupFile = backupFiles_1[_i];
                        originalPath = backupFile.replace("".concat(latestBackup, "/"), '');
                        fs.copyFileSync(backupFile, originalPath);
                    }
                    console.log("  \u2713 Rollback complete from ".concat(latestBackup));
                    return [2 /*return*/];
            }
        });
    });
}
// Run the migration
main().catch(function (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
