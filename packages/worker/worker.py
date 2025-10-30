#!/usr/bin/env python3
"""
Mokuro Worker - Processes CBZ files and generates mokuro OCR data
"""
import os
import sys
import json
import time
import shutil
import zipfile
from pathlib import Path
from typing import Dict, Any, Optional
import redis
from loguru import logger

# Import mokuro from installed package
from mokuro import MokuroGenerator
from mokuro.volume import Volume, VolumeCollection

from config import settings

logger.info(f"Mokuro imported successfully from: {MokuroGenerator.__module__}")


class MokuroWorker:
    """Worker that processes manga CBZ files using mokuro"""
    
    def __init__(self):
        logger.info("Initializing Mokuro Worker...")
        
        # Connect to Redis
        self.redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            decode_responses=True
        )
        
        # Test connection
        try:
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {settings.redis_host}:{settings.redis_port}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
        
        # Create storage directories
        os.makedirs(settings.uploads_dir, exist_ok=True)
        os.makedirs(settings.temp_dir, exist_ok=True)
        
        # Initialize mokuro generator (lazy load to save memory)
        self.mokuro_generator: Optional[MokuroGenerator] = None
        
        logger.info("Worker initialized successfully")
    
    def get_mokuro_generator(self) -> MokuroGenerator:
        """Lazy load mokuro generator"""
        if self.mokuro_generator is None:
            logger.info(f"Loading mokuro model: {settings.mokuro_model}")
            self.mokuro_generator = MokuroGenerator(
                pretrained_model_name_or_path=settings.mokuro_model,
                force_cpu=settings.force_cpu,
                disable_ocr=False
            )
        return self.mokuro_generator
    
    def publish_progress(self, job_id: str, progress: int, status: str, message: str = ""):
        """Publish progress update to Redis"""
        data = {
            "jobId": job_id,
            "progress": progress,
            "status": status,
            "message": message,
            "timestamp": time.time()
        }
        try:
            self.redis_client.publish(settings.progress_channel, json.dumps(data))
            logger.debug(f"Published progress: {job_id} - {progress}% - {status}")
        except Exception as e:
            logger.error(f"Failed to publish progress: {e}")
    
    def extract_cbz(self, cbz_path: str, extract_dir: str) -> Path:
        """Extract CBZ file to directory"""
        logger.info(f"Extracting CBZ: {cbz_path}")
        
        with zipfile.ZipFile(cbz_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        
        # Find the main image directory
        extract_path = Path(extract_dir)
        
        # Look for image files in the extracted directory
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
        image_files = []
        
        for root, dirs, files in os.walk(extract_dir):
            for file in files:
                if Path(file).suffix.lower() in image_extensions:
                    image_files.append(Path(root) / file)
        
        if not image_files:
            raise ValueError("No image files found in CBZ")
        
        logger.info(f"Found {len(image_files)} images in CBZ")
        return extract_path
    
    def process_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single CBZ file job"""
        job_id = job_data.get("jobId")
        volume_id = job_data.get("volumeId")
        cbz_path = job_data.get("cbzPath")
        output_path = job_data.get("outputPath")
        
        logger.info(f"Processing job {job_id}: volume {volume_id}")
        self.publish_progress(job_id, 0, "processing", "Starting CBZ extraction...")
        
        temp_dir = None
        try:
            # Create temporary directory for processing
            temp_dir = Path(settings.temp_dir) / f"job_{job_id}_{int(time.time())}"
            temp_dir.mkdir(parents=True, exist_ok=True)
            
            # Extract CBZ
            self.publish_progress(job_id, 10, "processing", "Extracting CBZ file...")
            extract_dir = temp_dir / "extracted"
            extract_dir.mkdir(exist_ok=True)
            volume_path = self.extract_cbz(cbz_path, str(extract_dir))
            
            # Create Volume object for mokuro
            self.publish_progress(job_id, 20, "processing", "Preparing for OCR...")
            
            # Create a volume collection and add the path
            vc = VolumeCollection()
            vc.add_path_in(volume_path)
            
            if len(vc) == 0:
                raise ValueError("Failed to create volume from extracted CBZ")
            
            volume = list(vc)[0]
            volume.set_uuid()
            
            # Set output path for mokuro file
            mokuro_output_dir = Path(output_path).parent
            mokuro_output_dir.mkdir(parents=True, exist_ok=True)
            volume.path_mokuro = Path(output_path)
            
            # Process with mokuro
            self.publish_progress(job_id, 30, "processing", "Running OCR (this may take a while)...")
            
            mg = self.get_mokuro_generator()
            mg.process_volume(volume, ignore_errors=False, no_cache=True)
            
            self.publish_progress(job_id, 90, "processing", "Finalizing...")
            
            # Read the generated mokuro file
            if not volume.path_mokuro.exists():
                raise ValueError(f"Mokuro file was not generated: {volume.path_mokuro}")
            
            with open(volume.path_mokuro, 'r', encoding='utf-8') as f:
                mokuro_data = json.load(f)
            
            logger.info(f"Successfully processed job {job_id}")
            self.publish_progress(job_id, 100, "completed", "Processing complete!")
            
            return {
                "success": True,
                "jobId": job_id,
                "volumeId": volume_id,
                "mokuroPath": str(volume.path_mokuro),
                "pageCount": len(mokuro_data.get("pages", [])),
                "mokuroData": mokuro_data
            }
            
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
            self.publish_progress(job_id, 0, "failed", f"Error: {str(e)}")
            
            return {
                "success": False,
                "jobId": job_id,
                "volumeId": volume_id,
                "error": str(e)
            }
        
        finally:
            # Cleanup temp directory
            if temp_dir and temp_dir.exists():
                try:
                    shutil.rmtree(temp_dir)
                    logger.debug(f"Cleaned up temp directory: {temp_dir}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory: {e}")
    
    def listen_for_jobs(self):
        """Listen for jobs from Redis queue"""
        logger.info(f"Listening for jobs on queue: {settings.queue_name}")
        
        while True:
            try:
                # Blocking pop from Redis list (queue)
                result = self.redis_client.blpop(settings.queue_name, timeout=5)
                
                if result:
                    queue_name, job_data_str = result
                    job_data = json.loads(job_data_str)
                    
                    logger.info(f"Received job: {job_data.get('jobId')}")
                    
                    # Process the job
                    result = self.process_job(job_data)
                    
                    # Store result in Redis with expiration
                    result_key = f"mokuro:result:{job_data['jobId']}"
                    self.redis_client.setex(
                        result_key,
                        3600,  # Expire after 1 hour
                        json.dumps(result)
                    )
                    
            except KeyboardInterrupt:
                logger.info("Shutting down worker...")
                break
            except Exception as e:
                logger.error(f"Error in job loop: {e}", exc_info=True)
                time.sleep(1)  # Wait before retrying


def main():
    """Main worker entry point"""
    logger.info("=" * 60)
    logger.info("Mokuro Worker Starting")
    logger.info("=" * 60)
    
    worker = MokuroWorker()
    worker.listen_for_jobs()


if __name__ == "__main__":
    main()

