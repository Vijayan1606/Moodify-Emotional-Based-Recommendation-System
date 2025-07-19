# Use an official Python base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory inside the container
WORKDIR /app

# Copy all files from your project directory into the container
COPY . .

# Upgrade pip and install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Expose the port your app runs on (optional, used by Render)
EXPOSE 10000

# Run your app with gunicorn
CMD ["gunicorn", "backend.notebooks.app:app", "--bind", "0.0.0.0:10000"]
