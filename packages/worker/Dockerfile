FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and other image processing
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
# Note: mokuro will be installed from PyPI
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker code
COPY . .

# Create directories for data
RUN mkdir -p /data/uploads /data/temp

CMD ["python", "-u", "worker.py"]

