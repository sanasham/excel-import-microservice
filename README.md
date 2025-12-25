Excel Import Microservice
A production-ready, high-performance microservice for bulk importing Excel files (40,000+ records) into SQL Server database using Node.js, Express.js, and TypeScript.

🚀 Features
High Performance: Processes 40,000+ records in under 2 minutes
Streaming Architecture: Memory-efficient file processing
Batch Processing: Configurable batch sizes (500-2000 records)
Background Jobs: Non-blocking API with job queue (BullMQ)
Real-time Progress: Track import progress with job status endpoints
Production Ready: Docker support, health checks, logging, monitoring
Type Safe: Full TypeScript implementation
Scalable: Horizontal scaling with connection pooling
Reliable: Transaction management with automatic rollback
📋 Prerequisites
Node.js 18+ or 20+ LTS
SQL Server 2017+ (or Docker)
Redis (for job queue)
Docker & Docker Compose (optional, for containerized deployment)
🛠️ Installation
Local Development
bash

# Clone repository

git clone <repository-url>
cd excel-import-microservice

# Install dependencies

npm install

# Copy environment variables

cp .env.example .env

# Edit .env with your configuration

nano .env

# Build TypeScript

npm run build

# Run database migrations

# Connect to SQL Server and run sql/schema.sql

# Start development server

npm run dev
Docker Deployment
bash

# Start all services (SQL Server, Redis, App)

docker-compose up -d

# View logs

docker-compose logs -f app

# Stop services

docker-compose down

# Stop and remove volumes

docker-compose down -v
📁 Project Structure
excel-import-microservice/
├── src/
│ ├── config/ # Configuration files
│ ├── controllers/ # Request handlers
│ ├── services/ # Business logic
│ ├── repositories/ # Database access layer
│ ├── middleware/ # Express middlewares
│ ├── routes/ # API routes
│ ├── workers/ # Background job workers
│ ├── validators/ # Input validation
│ ├── types/ # TypeScript types
│ ├── utils/ # Utility functions
│ ├── app.ts # Express app setup
│ └── server.ts # Server entry point
├── sql/ # Database scripts
├── tests/ # Unit & integration tests
├── Dockerfile # Docker configuration
├── docker-compose.yml # Docker Compose setup
└── package.json # Dependencies
🔧 Configuration
Environment Variables
Variable Description Default
NODE_ENV Environment (development/production) development
PORT Server port 3000
DB_HOST SQL Server host sqlserver
DB_PORT SQL Server port 1433
DB_USER Database username sa
DB_PASSWORD Database password -
DB_NAME Database name ImportDB
REDIS_HOST Redis host redis
REDIS_PORT Redis port 6379
BATCH_SIZE Records per batch 1000
MAX_FILE_SIZE Max upload size (bytes) 52428800 (50MB)
MAX_CONCURRENT_JOBS Worker concurrency 5
📡 API Endpoints
Upload Excel File
http
POST /api/upload
Content-Type: multipart/form-data

Body:

- file: Excel file (.xlsx)
- tableName: Target SQL Server table name
- sheetName: (optional) Excel sheet name
- columnMapping: (optional) JSON object for column mapping
- skipRows: (optional) Number of rows to skip
- validateOnly: (optional) Boolean to only validate
  Response:

json
{
"success": true,
"data": {
"jobId": "uuid-v4",
"message": "File uploaded successfully. Processing started.",
"fileName": "data.xlsx",
"totalRecords": 40000
},
"correlationId": "uuid-v4",
"timestamp": "2025-01-15T10:30:00.000Z"
}
Get Job Status
http
GET /api/jobs/:jobId
Response:

json
{
"success": true,
"data": {
"jobId": "uuid-v4",
"status": "processing",
"progress": {
"total": 40000,
"processed": 15000,
"failed": 10,
"percentage": 37
},
"startedAt": "2025-01-15T10:30:00.000Z"
},
"correlationId": "uuid-v4",
"timestamp": "2025-01-15T10:35:00.000Z"
}
Get All Jobs
http
GET /api/jobs?status=completed
Query Parameters:

status: Filter by status (pending, active, completed, failed)
Cancel Job
http
DELETE /api/jobs/:jobId
Health Check
http
GET /health
GET /health/ready # Kubernetes readiness probe
GET /health/live # Kubernetes liveness probe
🎯 Usage Examples
Using cURL
bash

# Upload Excel file

curl -X POST http://localhost:3000/api/upload \
 -F "file=@data.xlsx" \
 -F "tableName=SampleData"

# Get job status

curl http://localhost:3000/api/jobs/{jobId}

# Validate without importing

curl -X POST http://localhost:3000/api/upload \
 -F "file=@data.xlsx" \
 -F "tableName=SampleData" \
 -F "validateOnly=true"
Using Postman
Set request to POST http://localhost:3000/api/upload
Select Body → form-data
Add key file (type: File) and select your Excel file
Add key tableName (type: Text) with your table name
Send request and copy the jobId from response
Use GET http://localhost:3000/api/jobs/{jobId} to track progress
Using JavaScript/TypeScript
typescript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function uploadExcel() {
const form = new FormData();
form.append('file', fs.createReadStream('data.xlsx'));
form.append('tableName', 'SampleData');

const response = await axios.post('http://localhost:3000/api/upload', form, {
headers: form.getHeaders()
});

const jobId = response.data.data.jobId;
console.log('Job ID:', jobId);

// Poll for status
const checkStatus = setInterval(async () => {
const status = await axios.get(`http://localhost:3000/api/jobs/${jobId}`);
console.log('Progress:', status.data.data.progress.percentage + '%');

    if (status.data.data.status === 'completed') {
      clearInterval(checkStatus);
      console.log('Import completed!');
    }

}, 2000);
}
🎨 Column Mapping
If your Excel columns don't match database columns, use columnMapping:

json
{
"firstName": "FirstName",
"email_address": "Email",
"phone": "PhoneNumber"
}
Example request:

bash
curl -X POST http://localhost:3000/api/upload \
 -F "file=@data.xlsx" \
 -F "tableName=Employees" \
 -F 'columnMapping={"firstName":"FirstName","email_address":"Email"}'
🧪 Testing
bash

# Run unit tests

npm test

# Run tests in watch mode

npm run test:watch

# Run integration tests

npm run test:integration
📊 Performance Optimization
Database Optimization
Indexes: Create indexes on frequently queried columns
sql
CREATE NONCLUSTERED INDEX IX_Table_Column ON TableName(ColumnName);
Connection Pooling: Adjust pool settings in .env
DB_POOL_MIN=2
DB_POOL_MAX=10
Batch Size: Tune based on your data
BATCH_SIZE=1000 # Increase for simpler data, decrease for complex data
Application Optimization
Worker Concurrency: Adjust based on server resources
MAX_CONCURRENT_JOBS=5 # Increase on more powerful servers
Memory Limits: Set in docker-compose.yml
yaml
deploy:
resources:
limits:
memory: 2G
🔍 Monitoring & Logging
Viewing Logs
bash

# Docker logs

docker-compose logs -f app

# Local logs

tail -f logs/combined.log
tail -f logs/error.log
Log Levels
error: Critical errors
warn: Warning messages
info: General information
debug: Detailed debugging
Set log level in .env:

LOG_LEVEL=info
Correlation IDs
Every request gets a unique correlation ID for tracing:

Automatically generated
Returned in response headers: X-Correlation-ID
Included in all logs
🚨 Error Handling
The service handles:

Invalid file types
Missing required columns
Database connection failures
Transaction rollbacks on errors
File size limits
Rate limiting
All errors return consistent format:

json
{
"success": false,
"error": "Error message",
"correlationId": "uuid-v4",
"timestamp": "2025-01-15T10:30:00.000Z"
}
🔒 Security
Helmet.js: Security headers
Rate Limiting: Prevent abuse
Input Validation: Joi schema validation
SQL Injection Protection: Parameterized queries
File Type Validation: Only .xlsx allowed
File Size Limits: Configurable max size
CORS: Configurable origins
🌐 Deployment
Cloud Deployment (AWS/Azure/GCP)
Build Docker image:
bash
docker build -t excel-import-microservice:latest .
Push to container registry:
bash
docker tag excel-import-microservice:latest registry.example.com/excel-import-microservice:latest
docker push registry.example.com/excel-import-microservice:latest
Deploy using Kubernetes/ECS/Cloud Run
Kubernetes Example
yaml
apiVersion: apps/v1
kind: Deployment
metadata:
name: excel-import
spec:
replicas: 3
selector:
matchLabels:
app: excel-import
template:
metadata:
labels:
app: excel-import
spec:
containers: - name: app
image: excel-import-microservice:latest
ports: - containerPort: 3000
env: - name: NODE_ENV
value: "production"
livenessProbe:
httpGet:
path: /health/live
port: 3000
readinessProbe:
httpGet:
path: /health/ready
port: 3000
🤝 Contributing
Fork the repository
Create feature branch: git checkout -b feature/amazing-feature
Commit changes: git commit -m 'Add amazing feature'
Push to branch: git push origin feature/amazing-feature
Open Pull Request
📝 License
MIT License - see LICENSE file for details

🆘 Troubleshooting
Common Issues

1. Database connection fails

Check SQL Server is running
Verify credentials in .env
Ensure network connectivity 2. Redis connection fails

Verify Redis is running
Check Redis host and port 3. File upload fails

Check file size limits
Verify file is .xlsx format
Ensure temp directory is writable 4. Memory issues

Reduce BATCH_SIZE
Increase Docker memory limits
Check for memory leaks in logs
📞 Support
For issues and questions:

Create GitHub issue
Check existing documentation
Review logs for error details
Built with ❤️ using Node.js, TypeScript, and Express.js
