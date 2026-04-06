# AWS Deployment Playbook For Claimly Demo

Last updated: April 6, 2026

This guide is written for your current local project layout:

- Frontend: `C:\Users\Kevin\Documents\ClaimlyDemo\ClaimlyFrontend`
- Backend: `C:\Users\Kevin\Documents\ClaimlyDemo\LeaseReviewDemo`

It is intentionally very explicit and assumes you want the easiest path that still stays reasonably safe.

For this guide, I am assuming:

- The frontend will be deployed with **AWS Amplify Hosting**
- The backend will run in a **container on Amazon ECS Express Mode**
- The knowledge base will live in **Amazon RDS for PostgreSQL**
- You want to store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in **AWS Secrets Manager**
- You may deploy the infrastructure in one AWS account while using AWS keys from a different AWS account

Important note about your credential choice:

- Storing `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Secrets Manager and injecting them into ECS is **acceptable for a demo or a small production deployment** if you keep the IAM user permissions narrow, disable console access, and rotate the keys on a schedule.
- It is **not as safe as using an ECS task role** because static access keys remain valid until you rotate them.
- The easiest secure-ish version of your plan is:
  - create a very limited IAM user in the credential account
  - give it only the AWS permissions your app truly needs
  - store those keys in Secrets Manager in the infrastructure account
  - inject those keys into the ECS container as environment variables from Secrets Manager

## The Architecture We Are Building

- **AWS Account B**: hosts the deployed infrastructure
  - Amplify Hosting
  - ECR
  - ECS Express Mode
  - RDS PostgreSQL
  - Secrets Manager
  - CloudWatch
- **AWS Account A**: optional, only used if you want the application to call AWS services with a different AWS account's access keys
  - contains the IAM user whose `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` will be stored in Secrets Manager in Account B

If you are not forced to split accounts, the simplest version is to use one AWS account for everything.

## Resource Names To Use

Use these exact names unless you have a reason to change them:

- Region: `us-east-1`
- VPC security group for backend: `claimly-backend-sg`
- VPC security group for database: `claimly-db-sg`
- RDS database identifier: `claimly-lease-review-db`
- Secrets Manager secret name: `claimly/prod/lease-review/app-env`
- ECR repository name: `claimly-lease-review-backend`
- ECS service name: `claimly-lease-review-api`
- Amplify app name: `claimly-frontend`

## Before You Touch AWS

You will need three things outside the console before the AWS deployment works:

1. A Git repository that Amplify can connect to for the frontend.
2. A Dockerfile for the backend container.
3. A way to restore your existing local PostgreSQL knowledge base into AWS RDS.

This guide still focuses on the AWS Console steps first, but do not skip the small local prep items later in the guide.

## Phase 1: Decide Which Account Does What

This is the order to think about it:

1. Decide which account will host the infrastructure.
2. Decide whether your AWS access keys will come from the same account or a different one.

### Recommended choice

- **Infrastructure account**: Account B
- **Static AWS access key account**: either Account B also, or Account A if you truly need that split

### If you use different accounts

- Account B stores the secret in Secrets Manager
- The secret value contains the access key pair from Account A
- ECS in Account B reads the secret and exposes it to the container
- The Python app uses those credentials through `boto3`

That works because the container only cares about the values of the environment variables, not which account physically stored the secret.

## Phase 2: Sign In And Set The Correct AWS Region

Do this first in the AWS Console before creating anything.

1. Open [https://console.aws.amazon.com/](https://console.aws.amazon.com/).
2. Sign in to the AWS account that will host the infrastructure. This is Account B in this guide.
3. In the top-right corner of the console, find the **Region selector**.
4. Choose **US East (N. Virginia) `us-east-1`**.
5. Leave the region there for the rest of the setup unless you intentionally choose a different region.

Do not mix regions across Amplify, ECR, ECS, RDS, and Secrets Manager unless you deliberately want cross-region architecture.

## Phase 3: Create The AWS Access Keys IAM User In The Credentials Account

Only do this if you are truly using static keys.

If you are using a separate credentials account, do this in **Account A**.

If you are using the same account for everything, do this in **Account B** instead.

### Goal

Create a dedicated IAM user with:

- no console access
- only the AWS permissions your app actually needs
- an access key and secret key

### The minimum AWS permission your current backend clearly needs

Your backend uses AWS Textract OCR fallback. The minimal useful AWS permission is:

- `textract:DetectDocumentText`

If later you add S3 or other AWS services, expand the policy later.

### Console steps to create the policy

1. In the AWS Console search bar at the top, type `IAM`.
2. Choose **IAM** from the results.
3. In the left navigation pane, choose **Policies**.
4. Click **Create policy**.
5. Click the **JSON** tab.
6. Replace the existing JSON with this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowTextractDetectDocumentText",
      "Effect": "Allow",
      "Action": [
        "textract:DetectDocumentText"
      ],
      "Resource": "*"
    }
  ]
}
```

7. Click **Next**.
8. For **Policy name**, enter `ClaimlyTextractDetectOnly`.
9. For **Description**, enter `Allows Claimly backend to call Textract DetectDocumentText only`.
10. Click **Create policy**.

### Console steps to create the IAM user

1. Still in IAM, choose **Users** in the left navigation pane.
2. Click **Create user**.
3. For **User name**, enter `claimly-textract-user`.
4. Do **not** enable AWS Management Console access.
5. Click **Next**.
6. On the permissions screen, choose **Attach policies directly**.
7. Search for `ClaimlyTextractDetectOnly`.
8. Check the box next to `ClaimlyTextractDetectOnly`.
9. Click **Next**.
10. Review the settings.
11. Click **Create user**.

### Console steps to create the access key

1. Click the new user name `claimly-textract-user`.
2. Click the **Security credentials** tab.
3. Scroll down to **Access keys**.
4. Click **Create access key**.
5. Choose the use case that best matches application access. If the console asks you to confirm that this is for an external or local workload, continue.
6. Optionally add a description such as `Claimly backend container`.
7. Click **Create access key**.
8. Copy the **Access key ID** and **Secret access key** immediately.
9. Save them somewhere temporary for the next phase.

Important:

- You will not be able to see the secret access key again after leaving the screen.
- This IAM user should not be used by a human. It is only for the backend container.

## Phase 4: Check Whether Your AWS Account Still Has A Default VPC

This guide uses the easiest VPC path: the default VPC in the infrastructure account.

### Console steps

1. Switch back to the infrastructure account if needed. This is Account B.
2. In the console search bar, type `VPC`.
3. Choose **VPC**.
4. In the left navigation pane, choose **Your VPCs**.
5. Look for a VPC where the **Default VPC** column says **Yes**.

### If a default VPC exists

Use it.

### If there is no default VPC

Create one now:

1. In the VPC left navigation pane, choose **Your VPCs**.
2. Click **Actions** near the top.
3. Choose **Create default VPC** if that option exists.
4. If it does not exist, use **Create VPC** and choose the simple VPC wizard option that creates a VPC with public subnets.

For this first deployment, the default VPC is the easiest path.

## Phase 5: Create The Security Groups

Create the database security group first, then the backend security group.

### Create `claimly-db-sg`

1. In the console search bar, type `EC2`.
2. Choose **EC2**.
3. In the left navigation pane, scroll to **Network & Security**.
4. Choose **Security Groups**.
5. Click **Create security group**.
6. For **Security group name**, enter `claimly-db-sg`.
7. For **Description**, enter `Security group for Claimly RDS PostgreSQL`.
8. For **VPC**, choose the default VPC you identified earlier.
9. Under **Inbound rules**, click **Add rule**.
10. Set:
    - Type: `PostgreSQL`
    - Source: `My IP`
11. Under **Outbound rules**, leave the default rule that allows all outbound traffic.
12. Click **Create security group**.

Why this temporary `My IP` rule exists:

- You will use it one time to restore your existing local knowledge base into RDS.
- Later, after ECS is wired up, you should remove the `My IP` rule and only allow the backend security group.

### Create `claimly-backend-sg`

1. Still on **Security Groups**, click **Create security group** again.
2. For **Security group name**, enter `claimly-backend-sg`.
3. For **Description**, enter `Security group for Claimly ECS backend`.
4. For **VPC**, choose the same default VPC.
5. Under **Inbound rules**, click **Add rule**.
6. Set:
    - Type: `Custom TCP`
    - Port range: `8000`
    - Source: `Anywhere-IPv4`
7. Leave outbound as **All traffic**.
8. Click **Create security group**.

Why this is loose:

- It is the easiest starting point for a first deployment.
- Later, you can tighten it after the ECS service is stable.

## Phase 6: Create The RDS PostgreSQL Database

This guide uses standard **Amazon RDS for PostgreSQL** because it is the simplest managed PostgreSQL path for this app.

Amazon RDS for PostgreSQL supports `pgvector` in current versions.

### Console steps to create the DB

1. In the console search bar, type `RDS`.
2. Choose **RDS**.
3. In the left navigation pane, choose **Databases**.
4. Click **Create database**.
5. Under **Choose a database creation method**, choose **Standard create**.
6. Under **Engine type**, choose **PostgreSQL**.
7. Under **Templates**, choose **Dev/Test** unless you intentionally want production HA from day one.
8. Under **Availability and durability**, keep the default single-instance option for simplicity.
9. Under **Settings**:
   - DB instance identifier: `claimly-lease-review-db`
   - Master username: `postgres`
10. Under **Credentials management**, choose **Self managed** for the easiest setup.
11. Enter a strong master password and save it securely.
12. Under **Instance configuration**, choose a small instance class that is large enough for PostgreSQL plus vectors. A safe starting point is:
   - `db.t4g.small`
13. Under **Storage**:
   - Storage type: General Purpose SSD
   - Allocated storage: `20 GiB` is a simple starting point
14. Under **Connectivity**:
   - Compute resource: leave default
   - VPC: choose your default VPC
   - Public access: choose **Yes** for now if you want the absolute easiest one-time local restore
   - VPC security group: choose **Choose existing**
   - Existing VPC security groups: choose `claimly-db-sg`
   - Database port: `5432`
15. Under **Database authentication**, leave password authentication selected.
16. Expand **Additional configuration**.
17. For **Initial database name**, enter `lease_review_tool`.
18. Leave the rest as defaults unless you know you need something else.
19. Click **Create database**.

### Wait for the database to finish

1. Stay on the **Databases** list page.
2. Watch the status for `claimly-lease-review-db`.
3. Wait until the status becomes **Available**.

## Phase 7: Find The Database Endpoint And Enable `pgvector`

### Find the endpoint

1. In **RDS > Databases**, click the database `claimly-lease-review-db`.
2. Click the **Connectivity & security** tab.
3. Copy the **Endpoint**.
4. Note the **Port**, which should be `5432`.

### Connect from your machine

Use either `psql` or pgAdmin.

The easiest UI route is pgAdmin.

### If you use pgAdmin

1. Open pgAdmin on your computer.
2. Click **Add New Server**.
3. Under the **General** tab:
   - Name: `Claimly AWS RDS`
4. Under the **Connection** tab:
   - Host: the RDS endpoint from the console
   - Port: `5432`
   - Maintenance database: `lease_review_tool`
   - Username: `postgres`
   - Password: the password you set when creating RDS
5. Click **Save**.

### Enable `pgvector`

In pgAdmin Query Tool or `psql`, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Optionally verify:

```sql
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

## Phase 8: Restore Your Existing Local Knowledge Base Into RDS

Because you already built the knowledge base locally, restoring it is easier than rebuilding it.

### Option A: Recommended easiest path

Use `pg_dump` from your local machine and `pg_restore` into RDS.

### Create the local dump

From your local machine, run a command like this against your existing local database:

```powershell
pg_dump -Fc -h localhost -p 5432 -U postgres -d lease_review_tool -f C:\Users\Kevin\Documents\ClaimlyDemo\lease_review_tool.dump
```

### Restore into AWS RDS

```powershell
pg_restore --no-owner --no-acl -h <RDS-ENDPOINT> -p 5432 -U postgres -d lease_review_tool C:\Users\Kevin\Documents\ClaimlyDemo\lease_review_tool.dump
```

### If restore fails because the target DB already contains schema

Either:

- restore into a fresh database, or
- drop and recreate the target schema manually before restoring

### After restore, validate the KB

Connect to RDS and check:

```sql
SELECT COUNT(*) FROM reference_documents;
SELECT COUNT(*) FROM reference_clauses;
```

If those counts look right, your KB migration worked.

## Phase 9: Tighten The Database Security Group After Restore

After the restore is complete, remove the broad access.

### Console steps

1. Open **EC2**.
2. In the left navigation pane, choose **Security Groups**.
3. Click `claimly-db-sg`.
4. Open the **Inbound rules** tab.
5. Click **Edit inbound rules**.
6. Remove the `My IP` PostgreSQL rule.
7. Click **Add rule**.
8. Set:
   - Type: `PostgreSQL`
   - Source: `Custom`
   - Security group source: `claimly-backend-sg`
9. Click **Save rules**.

From this point on, the DB should only accept Postgres traffic from the backend security group.

## Phase 10: Create The Secrets Manager Secret In The Infrastructure Account

Do this in the infrastructure account, Account B.

The easiest setup is one JSON secret that holds all app env vars.

### Console steps

1. In the console search bar, type `Secrets Manager`.
2. Choose **Secrets Manager**.
3. Click **Store a new secret**.
4. Under **Secret type**, choose **Other type of secret**.
5. In the key/value editor, switch to **Plaintext** if that is easier for you.
6. Paste a JSON object in this exact shape:

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
  "AWS_ACCESS_KEY_ID": "YOUR_STATIC_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY": "YOUR_STATIC_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN": "",
  "PDF_OCR_QUALITY_THRESHOLD": "0.72",
  "PDF_OCR_RENDER_DPI": "200",
  "REFERENCE_DOCUMENT_DIR": "data/reference"
}
```

Replace:

- `YOUR_DB_PASSWORD`
- `YOUR_RDS_ENDPOINT`
- `YOUR_OPENAI_KEY`
- `YOUR_STATIC_ACCESS_KEY_ID`
- `YOUR_STATIC_SECRET_ACCESS_KEY`

### Finish the secret

1. Click **Next**.
2. For **Secret name**, enter:

```text
claimly/prod/lease-review/app-env
```

3. For **Description**, enter something like:

```text
Runtime environment variables for Claimly lease review backend
```

4. Leave **Encryption key** as `aws/secretsmanager` unless you specifically need your own KMS key.
5. Click **Next**.
6. On rotation, choose **Disable automatic rotation** for now.
7. Click **Next**.
8. Review the values carefully.
9. Click **Store**.

### Important safety note

This setup is mostly safe if:

- the IAM user behind those static keys is narrow-scoped
- only the ECS execution role can read this secret
- you rotate the keys later

This setup is less safe than task roles because:

- the secret contains long-lived credentials
- once injected, your app process sees them as environment variables

## Phase 11: Create The ECR Repository

### Console steps

1. In the console search bar, type `ECR`.
2. Choose **Elastic Container Registry**.
3. In the left navigation pane, choose **Repositories**.
4. Click **Create repository**.
5. Choose **Private** repository.
6. For **Repository name**, enter:

```text
claimly-lease-review-backend
```

7. Leave the rest as defaults unless you want scan-on-push.
8. Click **Create repository**.

## Phase 12: Add The Backend Dockerfile Locally

This is not an AWS Console step, but you need it before pushing to ECR.

Create this file:

- `C:\Users\Kevin\Documents\ClaimlyDemo\LeaseReviewDemo\Dockerfile`

Use this content:

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

Also create:

- `C:\Users\Kevin\Documents\ClaimlyDemo\LeaseReviewDemo\.dockerignore`

Use this content:

```text
.git
.venv
__pycache__
*.pyc
data
```

Do not copy your local `data` folder into the container. The knowledge base is in RDS now, not in the image.

## Phase 13: Build And Push The Backend Image To ECR

### Use the AWS Console to get the push commands

1. Go back to **ECR > Repositories**.
2. Click `claimly-lease-review-backend`.
3. In the upper-right area of the repository page, click **View push commands**.
4. Leave that window open.

### Run the commands locally

Open PowerShell on your computer and run the ECR commands shown by AWS.

They will look roughly like this:

```powershell
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker build -t claimly-lease-review-backend C:\Users\Kevin\Documents\ClaimlyDemo\LeaseReviewDemo
docker tag claimly-lease-review-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/claimly-lease-review-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/claimly-lease-review-backend:latest
```

When the push finishes, return to the ECR repository page and confirm that the `latest` image tag appears.

## Phase 14: Create The ECS IAM Roles

You need two roles:

- an **execution role** so ECS can pull the image, write logs, and fetch secrets
- a **task role** only if you want the application code itself to use AWS APIs through task-role credentials

Because you are explicitly choosing static keys in Secrets Manager, the task role can stay minimal or even unused for AWS API access. The execution role is still required.

### Create the execution role

1. In the console search bar, type `IAM`.
2. Choose **IAM**.
3. In the left navigation pane, choose **Roles**.
4. Click **Create role**.
5. Under **Trusted entity type**, choose **AWS service**.
6. Under **Use case**, choose **Elastic Container Service**.
7. Choose the **Elastic Container Service Task** use case.
8. Click **Next**.
9. Search for and select:

```text
AmazonECSTaskExecutionRolePolicy
```

10. Click **Next**.
11. For **Role name**, enter:

```text
claimlyEcsTaskExecutionRole
```

12. Click **Create role**.

### Add permission to read your Secrets Manager secret

1. Click the role `claimlyEcsTaskExecutionRole`.
2. Click **Add permissions**.
3. Choose **Create inline policy**.
4. Click the **JSON** tab.
5. Paste this, replacing the secret ARN with your real secret ARN from Secrets Manager:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadClaimlyAppSecret",
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
7. Name the inline policy:

```text
ClaimlyReadBackendSecrets
```

8. Click **Create policy**.

### Create a task role

Even though you are using static keys for the app's AWS calls, create the task role anyway so the service has a clean role slot and you can evolve later.

1. Still in **IAM > Roles**, click **Create role**.
2. Choose **AWS service**.
3. Choose **Elastic Container Service**.
4. Choose the **Elastic Container Service Task** use case.
5. Click **Next**.
6. Do not attach any broad policies yet.
7. Click **Next**.
8. Set **Role name** to:

```text
claimlyBackendTaskRole
```

9. Click **Create role**.

## Phase 15: Create The ECS Express Mode Backend Service

As of April 6, 2026, AWS recommends ECS Express Mode for new workloads instead of starting fresh on App Runner.

### Start the service creation

1. In the console search bar, type `ECS`.
2. Choose **Elastic Container Service**.
3. Look for a button like **Create service** or **Create first service**.
4. Choose the **Express Mode** path if the console offers multiple creation paths.

### Configure the image

1. For **Container image URI**, paste the ECR image URI from your repository page.
   - It will look like:

```text
<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/claimly-lease-review-backend:latest
```

2. For **Service name**, enter:

```text
claimly-lease-review-api
```

3. For **Container port**, enter:

```text
8000
```

4. For **Health check path**, enter:

```text
/health
```

### Add environment variables and secrets

This is the part that matters most for your backend.

In the **Environment variables** section:

1. Add a normal environment variable:
   - Key: `APP_ENV`
   - Value: `production`

Then add the rest as **Secret** values if the Express Mode screen allows per-variable secret references.

If the UI supports choosing a JSON key from a single secret, map the secret keys like this:

- `DATABASE_URL` -> `claimly/prod/lease-review/app-env` JSON key `DATABASE_URL`
- `OPENAI_API_KEY` -> JSON key `OPENAI_API_KEY`
- `OPENAI_EXTRACTION_MODEL` -> JSON key `OPENAI_EXTRACTION_MODEL`
- `OPENAI_REASONING_MODEL` -> JSON key `OPENAI_REASONING_MODEL`
- `OPENAI_EMBEDDING_MODEL` -> JSON key `OPENAI_EMBEDDING_MODEL`
- `OPENAI_EMBEDDING_DIMENSIONS` -> JSON key `OPENAI_EMBEDDING_DIMENSIONS`
- `AWS_REGION` -> JSON key `AWS_REGION`
- `AWS_ACCESS_KEY_ID` -> JSON key `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY` -> JSON key `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` -> JSON key `AWS_SESSION_TOKEN`
- `PDF_OCR_QUALITY_THRESHOLD` -> JSON key `PDF_OCR_QUALITY_THRESHOLD`
- `PDF_OCR_RENDER_DPI` -> JSON key `PDF_OCR_RENDER_DPI`
- `REFERENCE_DOCUMENT_DIR` -> JSON key `REFERENCE_DOCUMENT_DIR`

If the UI only accepts a full secret ARN and not a JSON key picker:

- create separate secrets later, or
- switch to the standard ECS task definition editor

But in current ECS secret injection, JSON-key-based secret references are supported.

### Roles

1. For **Task execution role**, choose:

```text
claimlyEcsTaskExecutionRole
```

2. For **Task role**, choose:

```text
claimlyBackendTaskRole
```

### Compute

For your first working deployment, use:

- CPU: `1 vCPU`
- Memory: `2 GB`
- Minimum tasks: `1`
- Maximum tasks: `2`

### Networking

Use the simplest option that lets you choose your VPC.

If the screen offers a **Customize networking configurations** section:

1. Enable it.
2. Choose your **default VPC**.
3. Choose at least two subnets if prompted.
4. Choose `claimly-backend-sg` as the security group.

If the screen uses defaults automatically:

- continue with the deployment
- after deployment, identify the security group the service actually used
- then update `claimly-db-sg` if needed

### Create the service

1. Review everything carefully.
2. Click **Create**, **Deploy**, or the equivalent final action button.
3. Wait for deployment to complete.

### Record the backend URL

When ECS Express Mode finishes, it will give you an application URL.

Copy that URL.

You will use it later as:

```text
LEASE_REVIEW_API_URL
```
