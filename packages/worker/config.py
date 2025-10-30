from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Worker configuration settings"""
    
    # Redis configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # Queue configuration
    queue_name: str = "mokuro:processing"
    progress_channel: str = "mokuro:progress"
    
    # Storage paths
    uploads_dir: str = "/data/uploads"
    temp_dir: str = "/data/temp"
    
    # Mokuro configuration
    mokuro_model: str = "kha-white/manga-ocr-base"
    force_cpu: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

