import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface MokuroJob {
  jobId: string;
  volumeId: string;
  cbzPath: string;
  outputPath: string;
  userId: string;
  mangaTitle?: string;
  volumeNumber?: number;
}

export interface ProgressUpdate {
  jobId: string;
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
  timestamp: number;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private redisClient: Redis;
  private redisSubscriber: Redis;
  private readonly queueName = 'mokuro:processing';
  private readonly progressChannel = 'mokuro:progress';

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    // Initialize Redis clients
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
    };

    this.redisClient = new Redis(redisConfig);
    this.redisSubscriber = new Redis(redisConfig);
  }

  async onModuleInit() {
    this.logger.log('Initializing Queue Service...');
    
    // Subscribe to progress updates
    await this.redisSubscriber.subscribe(this.progressChannel);
    
    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === this.progressChannel) {
        try {
          const update: ProgressUpdate = JSON.parse(message);
          this.logger.debug(`Progress update: ${update.jobId} - ${update.progress}%`);
          
          // Emit event for other services to listen to
          this.eventEmitter.emit('mokuro.progress', update);
        } catch (error) {
          this.logger.error('Failed to parse progress message:', error);
        }
      }
    });

    this.logger.log('Queue Service initialized');
  }

  /**
   * Add a job to the mokuro processing queue
   */
  async addJob(job: MokuroJob): Promise<void> {
    this.logger.log(`Adding job to queue: ${job.jobId}`);
    
    try {
      await this.redisClient.rpush(this.queueName, JSON.stringify(job));
      this.logger.log(`Job ${job.jobId} added to queue successfully`);
    } catch (error) {
      this.logger.error(`Failed to add job to queue: ${error}`);
      throw error;
    }
  }

  /**
   * Get job result from Redis
   */
  async getJobResult(jobId: string): Promise<any> {
    const resultKey = `mokuro:result:${jobId}`;
    const result = await this.redisClient.get(resultKey);
    
    if (!result) {
      return null;
    }
    
    return JSON.parse(result);
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    return await this.redisClient.llen(this.queueName);
  }

  /**
   * Check if worker is alive
   */
  async checkWorkerHealth(): Promise<boolean> {
    try {
      await this.redisClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

