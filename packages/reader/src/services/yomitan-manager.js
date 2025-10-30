"use strict";
/**
 * Yomitan Manager
 *
 * Handles Yomitan extension installation and management for the Electron app.
 * This provides functionality to:
 * - Check if Yomitan is installed
 * - Download and install Yomitan
 * - Manage Yomitan configuration
 * - Enable/disable Yomitan integration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YomitanManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const electron_1 = require("electron");
const adm_zip_1 = __importDefault(require("adm-zip"));
const YOMITAN_GITHUB_RELEASE_URL = 'https://api.github.com/repos/themoeway/yomitan/releases/latest';
const YOMITAN_EXTENSION_ID = 'yomitan';
class YomitanManager {
    constructor() {
        const userDataPath = electron_1.app.getPath('userData');
        this.extensionsPath = path.join(userDataPath, 'extensions');
        this.yomitanPath = path.join(this.extensionsPath, YOMITAN_EXTENSION_ID);
    }
    /**
     * Check if Yomitan is installed
     */
    async isInstalled() {
        try {
            const manifestPath = path.join(this.yomitanPath, 'manifest.json');
            return fs.existsSync(manifestPath);
        }
        catch (error) {
            console.error('Error checking Yomitan installation:', error);
            return false;
        }
    }
    /**
     * Get Yomitan version if installed
     */
    async getVersion() {
        try {
            if (!(await this.isInstalled())) {
                return null;
            }
            const manifestPath = path.join(this.yomitanPath, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            return manifest.version || null;
        }
        catch (error) {
            console.error('Error getting Yomitan version:', error);
            return null;
        }
    }
    /**
     * Download Yomitan from GitHub releases
     */
    async downloadYomitan(url, outputPath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(outputPath);
            https
                .get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Follow redirect
                    https
                        .get(response.headers.location, (redirectResponse) => {
                        redirectResponse.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            resolve();
                        });
                    })
                        .on('error', (err) => {
                        fs.unlink(outputPath, () => { });
                        reject(err);
                    });
                }
                else {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }
            })
                .on('error', (err) => {
                fs.unlink(outputPath, () => { });
                reject(err);
            });
        });
    }
    /**
     * Get latest release download URL from GitHub
     */
    async getLatestReleaseUrl() {
        return new Promise((resolve, reject) => {
            https
                .get(YOMITAN_GITHUB_RELEASE_URL, {
                headers: {
                    'User-Agent': 'Mokuro-Enhanced-Reader',
                },
            }, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    try {
                        const release = JSON.parse(data);
                        const chromeAsset = release.assets.find((asset) => asset.name.includes('chrome'));
                        if (chromeAsset) {
                            resolve(chromeAsset.browser_download_url);
                        }
                        else {
                            reject(new Error('Chrome extension not found in release'));
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            })
                .on('error', reject);
        });
    }
    /**
     * Install Yomitan extension
     */
    async install() {
        try {
            // Create extensions directory if it doesn't exist
            await fs.promises.mkdir(this.extensionsPath, { recursive: true });
            // Get download URL
            const downloadUrl = await this.getLatestReleaseUrl();
            // Download extension
            const zipPath = path.join(this.extensionsPath, 'yomitan.zip');
            await this.downloadYomitan(downloadUrl, zipPath);
            // Extract extension
            const zip = new adm_zip_1.default(zipPath);
            zip.extractAllTo(this.yomitanPath, true);
            // Clean up zip file
            await fs.promises.unlink(zipPath);
            return {
                success: true,
                message: 'Yomitan installed successfully',
            };
        }
        catch (error) {
            console.error('Error installing Yomitan:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Uninstall Yomitan extension
     */
    async uninstall() {
        try {
            if (!(await this.isInstalled())) {
                return {
                    success: false,
                    message: 'Yomitan is not installed',
                };
            }
            await fs.promises.rm(this.yomitanPath, { recursive: true, force: true });
            return {
                success: true,
                message: 'Yomitan uninstalled successfully',
            };
        }
        catch (error) {
            console.error('Error uninstalling Yomitan:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get Yomitan extension path for loading in Electron
     */
    getExtensionPath() {
        return this.yomitanPath;
    }
}
exports.YomitanManager = YomitanManager;
exports.default = YomitanManager;
