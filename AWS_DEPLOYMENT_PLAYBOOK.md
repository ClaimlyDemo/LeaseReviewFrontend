# Simple AWS Deployment Playbook For Claimly Demo

Last updated: April 6, 2026

This version is intentionally simplified.

It assumes:

- you are using **one AWS account**
- you will deploy **everything in that one account**
- you will store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in **Secrets Manager**
- the frontend will go to **Amplify**
- the backend will go to **ECS Express Mode**
- the knowledge base will go to **Amazon RDS for PostgreSQL**

This guide covers the exact order to do things in and tells you where to click in the AWS Console.

## What You Are Building

- **Amplify** hosts the Next.js frontend
- **ECR** stores the backend container image
- **ECS Express Mode** runs the FastAPI backend
- **RDS PostgreSQL** stores your knowledge base
- **Secrets Manager** stores your backend env vars, including AWS keys

## The Exact Order

Do these phases in this order:

1. Pick the AWS region
2. Create the database
3. Restore your existing knowledge base
4. Store backend env vars in Secrets Manager
5. Create the ECR repository
6. Add the backend Dockerfile locally
7. Build and push the backend image
8. Create the ECS role
9. Deploy the backend on ECS Express Mode
10. Test the backend
11. Add `amplify.yml` locally
12. Deploy the frontend in Amplify
13. Test the full flow

## Phase 1: Pick The Region

Use one region for everything. The simplest choice is `us-east-1`.

### Console steps

1. Open [https://console.aws.amazon.com/](https://console.aws.amazon.com/).
2. Sign in to your AWS account.
3. In the top-right corner, open the **Region** dropdown.
4. Select **US East (N. Virginia) `us-east-1`**.
5. Leave the console in that region while doing the rest of the setup.

## Phase 2: Create The Database

You already built the knowledge base locally, so the main goal here is to create a managed PostgreSQL database and then restore your local data into it.

### Create the backend security group

1. In the AWS Console search bar, type `EC2`.
2. Open **EC2**.
3. In the left menu, under **Network & Security**, click **Security Groups**.
4. Click **Create security group**.
5. Set:
   - Security group name: `claimly-backend-sg`
   - Description: `Claimly backend service`
6. For **VPC**, choose the default VPC.
7. Under **Inbound rules**, add:
   - Type: `Custom TCP`
   - Port range: `8000`
   - Source: `Anywhere-IPv4`
8. Click **Create security group**.

### Create the database security group

1. In the AWS Console search bar, type `EC2`.
2. Open **EC2**.
3. In the left menu, under **Network & Security**, click **Security Groups**.
4. Click **Create security group**.
5. Set:
   - Security group name: `claimly-db-sg`
   - Description: `Claimly RDS PostgreSQL access`
6. For **VPC**, choose the default VPC.
7. Under **Inbound rules**, add:
   - Type: `PostgreSQL`
   - Source: `My IP`
8. Add one more inbound rule:
   - Type: `PostgreSQL`
   - Source: `claimly-backend-sg`
9. Click **Create security group**.

This lets your computer connect to the database so you can restore the knowledge base.
It also lets the backend connect to the database later.

### Create the database

1. In the AWS Console search bar, type `RDS`.
2. Open **RDS**.
3. In the left menu, click **Databases**.
4. Click **Create database**.
5. Choose:
   - Creation method: **Standard create**
   - Engine type: **PostgreSQL**
   - Template: **Dev/Test**
6. Under **Settings**, set:
   - DB instance identifier: `claimly-lease-review-db`
   - Master username: `postgres`
   - Master password: choose one and save it
7. Under **Instance configuration**, pick a small instance. `db.t4g.small` is a reasonable start.
8. Under **Storage**, leave the defaults unless you want to change them.
9. Under **Connectivity**, set:
   - VPC: your default VPC
   - Public access: **Yes**
   - VPC security group: **Choose existing**
   - Existing security group: `claimly-db-sg`
   - Port: `5432`
10. Under **Additional configuration**, set:
   - Initial database name: `lease_review_tool`
11. Click **Create database**.
12. Wait until the status becomes **Available**.

## Phase 3: Restore Your Existing Knowledge Base

### Get the database endpoint

1. In **RDS > Databases**, click `claimly-lease-review-db`.
2. Open the **Connectivity & security** tab.
3. Copy the **Endpoint**.
4. Note the port `5432`.

### Enable `pgvector`

Connect to the database from your machine using pgAdmin or `psql`, then run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Dump your local DB

Run this locally, adjusting credentials if needed:

```powershell
pg_dump -Fc -h localhost -p 5432 -U postgres -d lease_review_tool -f C:\Users\Kevin\Documents\ClaimlyDemo\lease_review_tool.dump
```

### Restore into AWS RDS

Run this locally, replacing `<RDS-ENDPOINT>`:

```powershell
pg_restore --no-owner --no-acl -h <RDS-ENDPOINT> -p 5432 -U postgres -d lease_review_tool C:\Users\Kevin\Documents\ClaimlyDemo\lease_review_tool.dump
```

### Quick validation

Connect to the AWS database and run:

```sql
SELECT COUNT(*) FROM reference_documents;
SELECT COUNT(*) FROM reference_clauses;
```

If those counts look correct, your knowledge base is in AWS.

## Phase 4: Store Backend Env Vars In Secrets Manager

This is the easiest setup for your backend.

You will create one secret that contains:

- database URL
- OpenAI key
- AWS keys
- model settings

### Console steps

1. In the AWS Console search bar, type `Secrets Manager`.
2. Open **Secrets Manager**.
3. Click **Store a new secret**.
4. Choose **Other type of secret**.
5. Switch to **Plaintext**.
6. Paste this JSON and replace the placeholder values:

```json
{
  "APP_ENV": "production",
  "DATABASE_URL": "postgresql+psycopg://postgres:YOUR_DB_PASSWORD@YOUR_RDS_ENDPOINT:5432/lease_review_tool",
  "OPENAI_API_KEY": "YOUR_OPENAI_KEY",
  "OPENAI_EXTRACTION_MODEL": "gpt-5.4-mini",
  "OPENAI_REASONING_MODEL": "gpt-5.4",
  "OPENAI_EMBEDDING_MODEL": "text-embedding-3-small",
  "OPENAI_EMBEDDING_DIMENSIONS": "1536",
  "AWS_REGION": "us-east-1",
  "AWS_ACCESS_KEY_ID": "YOUR_AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY": "YOUR_AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN": "",
  "PDF_OCR_QUALITY_THRESHOLD": "0.72",
  "PDF_OCR_RENDER_DPI": "200",
  "REFERENCE_DOCUMENT_DIR": "data/reference"
}
```

7. Click **Next**.
8. For **Secret name**, enter:

```text
claimly/prod/lease-review/app-env
```

9. Click **Next**.
10. Leave rotation off for now.
11. Click **Next**.
12. Click **Store**.

### Notes

- This is the easy static-key setup you asked for.
- It is fine for a demo or a small deployment if you keep track of the keys and rotate them later.
- Do not put these values into Git or into plaintext files in the repo.

## Phase 5: Create The ECR Repository

### Console steps

1. In the AWS Console search bar, type `ECR`.
2. Open **Elastic Container Registry**.
3. In the left menu, click **Repositories**.
4. Click **Create repository**.
5. Choose **Private**.
6. For repository name, enter:

```text
claimly-lease-review-backend
```

7. Click **Create repository**.

## Phase 6: Add The Backend Dockerfile Locally

Create this file:

- `C:\Users\Kevin\Documents\ClaimlyDemo\LeaseReviewDemo\Dockerfile`

Use:

```dockerfile
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src
COPY run_cli.py ./

RUN pip install --upgrade pip && pip install .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "lease_review_tool.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create this file too:

- `C:\Users\Kevin\Documents\ClaimlyDemo\LeaseReviewDemo\.dockerignore`

Use:

```text
.git
.venv
__pycache__
*.pyc
data
```

## Phase 7: Build And Push The Backend Image

### Use the console to get the push commands

1. In **ECR > Repositories**, click `claimly-lease-review-backend`.
2. Click **View push commands**.
3. Keep that panel open.

### Run the commands locally

Run the AWS-provided commands in PowerShell. They will look similar to:

```powershell
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker build -t claimly-lease-review-backend C:\Users\Kevin\Documents\ClaimlyDemo\LeaseReviewDemo
docker tag claimly-lease-review-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/claimly-lease-review-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/claimly-lease-review-backend:latest
```

After the push finishes, confirm the image appears in ECR.

## Phase 8: Create The ECS Role

ECS needs a role so it can:

- pull the image from ECR
- read the secret from Secrets Manager
- write logs

### Create the role

1. In the AWS Console search bar, type `IAM`.
2. Open **IAM**.
3. In the left menu, click **Roles**.
4. Click **Create role**.
5. Choose:
   - Trusted entity type: **AWS service**
   - Use case: **Elastic Container Service**
   - Service or use case: **Elastic Container Service Task**
6. Click **Next**.
7. Attach this managed policy:

```text
AmazonECSTaskExecutionRolePolicy
```

8. Click **Next**.
9. Role name:

```text
claimlyEcsTaskExecutionRole
```

10. Click **Create role**.

### Let the role read the secret

1. Open the new role `claimlyEcsTaskExecutionRole`.
2. Click **Add permissions**.
3. Click **Create inline policy**.
4. Open the **JSON** tab.
5. Paste this, replacing `YOUR_SECRET_ARN` with the ARN of `claimly/prod/lease-review/app-env`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "YOUR_SECRET_ARN"
    }
  ]
}
```

6. Click **Next**.
7. Policy name:

```text
ClaimlyReadBackendSecret
```

8. Click **Create policy**.

## Phase 9: Deploy The Backend On ECS Express Mode

### Start the service

1. In the AWS Console search bar, type `ECS`.
2. Open **Elastic Container Service**.
3. Click **Create service**.
4. Choose **Express Mode** if AWS shows multiple service creation paths.

### Configure the service

Set these values:

- Service name: `claimly-lease-review-api`
- Image URI: your ECR image URI
- Container port: `8000`
- Health check path: `/health`
- Task execution role: `claimlyEcsTaskExecutionRole`

### Add the backend env vars from Secrets Manager

In the environment variable section, add secret-backed variables using the secret `claimly/prod/lease-review/app-env`.

Map these keys:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_EXTRACTION_MODEL`
- `OPENAI_REASONING_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_EMBEDDING_DIMENSIONS`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `PDF_OCR_QUALITY_THRESHOLD`
- `PDF_OCR_RENDER_DPI`
- `REFERENCE_DOCUMENT_DIR`

Also add this normal environment variable:

- `APP_ENV=production`

### Set compute

Use:

- CPU: `1 vCPU`
- Memory: `2 GB`
- Min tasks: `1`

### Set networking

If the screen asks for networking:

- choose the default VPC
- choose the default public subnets
- choose security group `claimly-backend-sg`

For a first simple deploy, that is enough.

### Finish

1. Review the settings.
2. Click **Create** or **Deploy**.
3. Wait for the service to finish deploying.
4. Copy the public backend URL that ECS gives you.

## Phase 10: Test The Backend

Open:

```text
https://YOUR_BACKEND_URL/health
```

You should see:

```json
{"status":"ok"}
```

If you do not:

1. Open the ECS service.
2. Open the task.
3. Open the logs.
4. Read the startup error.

## Phase 11: Add `amplify.yml` Inside `ClaimlyFrontend`

Create this file:

- `C:\Users\Kevin\Documents\ClaimlyDemo\ClaimlyFrontend\amplify.yml`

Use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - env | grep -e LEASE_REVIEW_API_URL >> .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

## Phase 12: Deploy The Frontend In Amplify

### Before starting

You are connecting `ClaimlyFrontend` itself as the repo, so make sure:

- `amplify.yml` is inside `ClaimlyFrontend`
- `package-lock.json` is inside `ClaimlyFrontend`
- you do not need any monorepo settings

### Create the Amplify app

1. In the AWS Console search bar, type `Amplify`.
2. Open **AWS Amplify**.
3. Click **Create new app**.
4. Choose **Host web app**.
5. Connect your Git provider.
6. Select the repository.
7. Select the branch.
8. Do not check **My app is a monorepo**.
9. Click **Next**.

### Add the backend URL

On the Amplify setup screen, add this environment variable:

- Key: `LEASE_REVIEW_API_URL`
- Value: your ECS backend URL, without a trailing slash

### Finish

1. Review the build settings.
2. Make sure Amplify detected the build from the `amplify.yml` file in the repo.
3. Click **Save and deploy**.
4. Wait for the build to finish.

## Phase 13: Test The Full App

1. Open the Amplify app URL.
2. Click **New Lease**.
3. Upload a lease PDF or DOCX.
4. Click **Analyze lease**.

What should happen:

- Amplify serves the Next.js app
- the Next.js route `/api/lease-analysis` receives the file
- the Next.js route forwards the file to your ECS backend
- the backend analyzes the lease against your RDS knowledge base
- the frontend displays the observations

## Very Short Troubleshooting List

### Frontend works, but upload fails

Check:

1. `LEASE_REVIEW_API_URL` in Amplify
2. backend `/health`
3. ECS logs

### Backend is up, but analysis fails

Check:

1. `DATABASE_URL` in Secrets Manager
2. whether the knowledge base actually restored into RDS
3. `OPENAI_API_KEY`
4. `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### Textract fails

Check:

1. the AWS keys are valid
2. the IAM user behind those keys can call `textract:DetectDocumentText`
3. `AWS_REGION` is correct

## The Only Runtime Variable The Frontend Needs

- `LEASE_REVIEW_API_URL`

## The Backend Variables You Need In Secrets Manager

- `APP_ENV`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_EXTRACTION_MODEL`
- `OPENAI_REASONING_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_EMBEDDING_DIMENSIONS`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `PDF_OCR_QUALITY_THRESHOLD`
- `PDF_OCR_RENDER_DPI`
- `REFERENCE_DOCUMENT_DIR`

## Official References

- Amplify Next.js hosting: [https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)
- Amplify monorepo config: [https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html)
- ECS secrets from Secrets Manager: [https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html)
- RDS PostgreSQL getting started: [https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html)
- Textract `DetectDocumentText`: [https://docs.aws.amazon.com/textract/latest/dg/API_DetectDocumentText.html](https://docs.aws.amazon.com/textract/latest/dg/API_DetectDocumentText.html)
