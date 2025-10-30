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

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { app } from 'electron';
import AdmZip from 'adm-zip';

const YOMITAN_GITHUB_RELEASE_URL =
  'https://api.github.com/repos/themoeway/yomitan/releases/latest';
const YOMITAN_EXTENSION_ID = 'yomitan';

export class YomitanManager {
  private extensionsPath: string;
  private yomitanPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.extensionsPath = path.join(userDataPath, 'extensions');
    this.yomitanPath = path.join(this.extensionsPath, YOMITAN_EXTENSION_ID);
  }

  /**
   * Check if Yomitan is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      const manifestPath = path.join(this.yomitanPath, 'manifest.json');
      return fs.existsSync(manifestPath);
    } catch (error) {
      console.error('Error checking Yomitan installation:', error);
      return false;
    }
  }

  /**
   * Get Yomitan version if installed
   */
  async getVersion(): Promise<string | null> {
    try {
      if (!(await this.isInstalled())) {
        return null;
      }

      const manifestPath = path.join(this.yomitanPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return manifest.version || null;
    } catch (error) {
      console.error('Error getting Yomitan version:', error);
      return null;
    }
  }

  /**
   * Download Yomitan from GitHub releases
   */
  private async downloadYomitan(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      https
        .get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            // Follow redirect
            https
              .get(response.headers.location!, (redirectResponse) => {
                redirectResponse.pipe(file);
                file.on('finish', () => {
                  file.close();
                  resolve();
                });
              })
              .on('error', (err) => {
                fs.unlink(outputPath, () => {});
                reject(err);
              });
          } else {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }
        })
        .on('error', (err) => {
          fs.unlink(outputPath, () => {});
          reject(err);
        });
    });
  }

  /**
   * Get latest release download URL from GitHub
   */
  private async getLatestReleaseUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      https
        .get(
          YOMITAN_GITHUB_RELEASE_URL,
          {
            headers: {
              'User-Agent': 'Mokuro-Enhanced-Reader',
            },
          },
          (response) => {
            let data = '';

            response.on('data', (chunk) => {
              data += chunk;
            });

            response.on('end', () => {
              try {
                const release = JSON.parse(data);
                const chromeAsset = release.assets.find((asset: any) =>
                  asset.name.includes('chrome')
                );

                if (chromeAsset) {
                  resolve(chromeAsset.browser_download_url);
                } else {
                  reject(new Error('Chrome extension not found in release'));
                }
              } catch (error) {
                reject(error);
              }
            });
          }
        )
        .on('error', reject);
    });
  }

  /**
   * Install Yomitan extension
   */
  async install(): Promise<{ success: boolean; message: string }> {
    try {
      // Create extensions directory if it doesn't exist
      await fs.promises.mkdir(this.extensionsPath, { recursive: true });

      // Get download URL
      const downloadUrl = await this.getLatestReleaseUrl();

      // Download extension
      const zipPath = path.join(this.extensionsPath, 'yomitan.zip');
      await this.downloadYomitan(downloadUrl, zipPath);

      // Extract extension
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(this.yomitanPath, true);

      // Clean up zip file
      await fs.promises.unlink(zipPath);

      return {
        success: true,
        message: 'Yomitan installed successfully',
      };
    } catch (error) {
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
  async uninstall(): Promise<{ success: boolean; message: string }> {
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
    } catch (error) {
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
  getExtensionPath(): string {
    return this.yomitanPath;
  }
}

export default YomitanManager;

