/**
 * Docker Manager - Manages Docker Compose stack for standalone mode
 */
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { app } from 'electron';

const execAsync = promisify(exec);

export interface DockerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
}

export interface ContainerStatus {
  name: string;
  state: 'running' | 'stopped' | 'starting' | 'error';
  health?: 'healthy' | 'unhealthy' | 'starting';
}

export interface ServerStackStatus {
  isRunning: boolean;
  containers: ContainerStatus[];
  serverUrl?: string;
  error?: string;
}

export class DockerManager {
  private composeFilePath: string;
  private isDevMode: boolean;

  constructor() {
    this.isDevMode = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    // Path to the standalone docker-compose file
    this.composeFilePath = this.isDevMode
      ? path.join(__dirname, '../../docker-compose.standalone.yml')
      : path.join(process.resourcesPath, 'docker-compose.standalone.yml');
  }

  /**
   * Check if Docker is installed and running
   */
  async checkDockerStatus(): Promise<DockerStatus> {
    try {
      // Check if Docker is installed
      const { stdout: versionOutput } = await execAsync('docker --version');
      const version = versionOutput.trim();

      // Check if Docker daemon is running
      try {
        await execAsync('docker ps');
        return {
          installed: true,
          running: true,
          version,
        };
      } catch (error) {
        return {
          installed: true,
          running: false,
          version,
          error: 'Docker daemon is not running. Please start Docker Desktop.',
        };
      }
    } catch (error) {
      return {
        installed: false,
        running: false,
        error: 'Docker is not installed. Please install Docker Desktop.',
      };
    }
  }

  /**
   * Check if Docker Compose is available
   */
  async checkDockerCompose(): Promise<boolean> {
    try {
      await execAsync('docker compose version');
      return true;
    } catch (error) {
      try {
        // Try legacy docker-compose command
        await execAsync('docker-compose --version');
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  /**
   * Get the appropriate docker compose command
   */
  private async getComposeCommand(): Promise<string> {
    try {
      await execAsync('docker compose version');
      return 'docker compose';
    } catch (error) {
      return 'docker-compose';
    }
  }

  /**
   * Check if the standalone server stack is running
   */
  async getStackStatus(): Promise<ServerStackStatus> {
    try {
      const composeCmd = await this.getComposeCommand();
      const { stdout } = await execAsync(
        `${composeCmd} -f "${this.composeFilePath}" ps --format json`
      );

      if (!stdout.trim()) {
        return {
          isRunning: false,
          containers: [],
        };
      }

      // Parse container status
      const containers: ContainerStatus[] = [];
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        try {
          const container = JSON.parse(line);
          const name = container.Service || container.Name;
          const state = container.State?.toLowerCase() || 'stopped';
          const health = container.Health || undefined;

          containers.push({
            name,
            state: state === 'running' ? 'running' : 'stopped',
            health,
          });
        } catch (e) {
          console.error('Failed to parse container status:', e);
        }
      }

      const isRunning = containers.some(c => c.name === 'server' && c.state === 'running');
      
      return {
        isRunning,
        containers,
        serverUrl: isRunning ? 'http://localhost:3000' : undefined,
      };
    } catch (error) {
      return {
        isRunning: false,
        containers: [],
        error: String(error),
      };
    }
  }

  /**
   * Start the standalone server stack
   */
  async startStack(): Promise<{ success: boolean; error?: string }> {
    try {
      const dockerStatus = await this.checkDockerStatus();
      if (!dockerStatus.installed) {
        return {
          success: false,
          error: 'Docker is not installed. Please install Docker Desktop.',
        };
      }

      if (!dockerStatus.running) {
        return {
          success: false,
          error: 'Docker daemon is not running. Please start Docker Desktop.',
        };
      }

      // Check if compose file exists
      if (!fs.existsSync(this.composeFilePath)) {
        return {
          success: false,
          error: `Docker Compose file not found: ${this.composeFilePath}`,
        };
      }

      const composeCmd = await this.getComposeCommand();
      
      // Pull images first (if using pre-built images)
      console.log('Pulling Docker images...');
      try {
        await execAsync(
          `${composeCmd} -f "${this.composeFilePath}" pull`,
          { timeout: 300000 } // 5 minutes timeout
        );
      } catch (pullError) {
        console.warn('Failed to pull some images, will try to start anyway:', pullError);
      }

      // Start the stack
      console.log('Starting Docker Compose stack...');
      await execAsync(
        `${composeCmd} -f "${this.composeFilePath}" up -d`,
        { timeout: 180000 } // 3 minutes timeout
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to start Docker stack:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop the standalone server stack
   */
  async stopStack(): Promise<{ success: boolean; error?: string }> {
    try {
      const composeCmd = await this.getComposeCommand();
      
      console.log('Stopping Docker Compose stack...');
      await execAsync(
        `${composeCmd} -f "${this.composeFilePath}" down`,
        { timeout: 60000 } // 1 minute timeout
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to stop Docker stack:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Restart the standalone server stack
   */
  async restartStack(): Promise<{ success: boolean; error?: string }> {
    const stopResult = await this.stopStack();
    if (!stopResult.success) {
      return stopResult;
    }

    // Wait a bit before starting
    await new Promise(resolve => setTimeout(resolve, 2000));

    return await this.startStack();
  }

  /**
   * View logs from the stack
   */
  async getStackLogs(service?: string): Promise<string> {
    try {
      const composeCmd = await this.getComposeCommand();
      const serviceArg = service ? ` ${service}` : '';
      
      const { stdout } = await execAsync(
        `${composeCmd} -f "${this.composeFilePath}" logs --tail=100${serviceArg}`,
        { timeout: 10000, maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
      );

      return stdout;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return `Error fetching logs: ${error}`;
    }
  }

  /**
   * Check if server is healthy and responding
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const http = require('http');
      
      return new Promise((resolve) => {
        const req = http.get('http://localhost:3000/api/health', (res: any) => {
          resolve(res.statusCode === 200);
        });

        req.on('error', () => {
          resolve(false);
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Get network information for sharing with mobile devices
   */
  async getNetworkInfo(): Promise<{ localIp: string; serverUrl: string }[]> {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const addresses: { localIp: string; serverUrl: string }[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({
            localIp: iface.address,
            serverUrl: `http://${iface.address}:3000`,
          });
        }
      }
    }

    return addresses;
  }

  /**
   * Create default admin user if database is empty
   */
  async createDefaultUser(): Promise<{ success: boolean; username?: string; password?: string; error?: string }> {
    try {
      // Wait for server to be healthy
      let attempts = 0;
      while (attempts < 30) {
        const healthy = await this.checkServerHealth();
        if (healthy) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (attempts >= 30) {
        return {
          success: false,
          error: 'Server did not become healthy in time',
        };
      }

      // Try to create a default admin user
      const axios = require('axios');
      const username = 'admin';
      const password = this.generateRandomPassword();

      try {
        await axios.post('http://localhost:3000/api/auth/register', {
          username,
          password,
        });

        return {
          success: true,
          username,
          password,
        };
      } catch (error: any) {
        // User might already exist, which is fine
        if (error.response?.status === 409 || error.response?.status === 400) {
          return {
            success: true,
            error: 'User already exists',
          };
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to create default user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

