## Notes App AWS Backend

A **serverless microservice-based backend** built using **AWS Lambda**, **DynamoDB**, **S3**, and **SQS**, managed under an **Nx Monorepo**.  
This backend powers a **Notes App** where users can securely create, update, and sync their notes and media between devices.

## Content

* [Project Overview](#project-overview)
* [Tech Stack](#tech-stack)
* [Aws Configuration](#aws-configuration)
* [Install Guide](#install-guide)
* [Publish Guide](#publish-guide)
* [Learning Outcome](#learning-outcome)
* [Future Work](#future-work)
* [Contact](#contact)

## Project Overview

The **Notes App** backend provides APIs to manage user notes and media with authentication and data synchronization support.  
It is designed to work as a **sync service** for an **Android offline-first client**, ensuring users’ notes remain safe and recoverable across devices.

**Core Features:**

* **User Authentication** — users must log in to use the service (handled via AWS Cognito)
* **Note Management**
  * Add, edit, or delete notes with title and text content
  * List all notes or fetch a specific note by its ID
* **Media Support**
  * Attach up to **5 images per note**
  * Uploads handled via **AWS S3**
  * Deletion handled asynchronously using **AWS SQS** (decoupled cleanup)
* **Sync Support**
  * Android client syncs local changes (create/update/delete) with this backend
  * Enables restoring notes after re-login or device change

This project focuses heavily on **clean service design** and **AWS-native architecture** principles.

**Microservices:**
* `auth-service` — handles user authentication and token validation
* `note-service` — manages CRUD operations for notes
* `queue-service` — listens to SQS events and performs background tasks (e.g., deleting media files)

[Back to content](#content)

## Tech Stack

The tech stack i used for this project is as below:

- Language: TypeScript (Node.js 22)
- Framework: Nx Monorepo
- Cloud: AWS (Lambda, DynamoDB, S3, SQS, CloudFront, API Gateway, Cognito)
- Testing: Jest, LocalStack
- Infrastructure Scripts: Bash

[Back to content](#content)

## Aws Configuration

The backend is deployed entirely on **AWS** using a **serverless architecture** built around **Lambda**, **API Gateway**, **S3**, **SQS**, **DynamoDB**, and **CloudFront**.
This section summarizes how the production infrastructure is configured and how different components interact.

**1. API Gateway**

* Acts as the **entry point** for all client requests.
* Routes incoming HTTP requests to the corresponding **Lambda functions** (e.g., `auth-service`, `note-service`).
* Integrated with **Cognito Authorizer** for validating access tokens.
* Each microservice has its own route prefix for better separation and scalability.

Example:

```
/auth/...       → Auth Lambda
/auth/user/...  → Auth Lambda
/notes/...      → Notes Lambda
```

**2. AWS Lambda Functions**

* Each microservice (`auth-service`, `note-service`, `queue-service`) runs as a **dedicated Lambda function**.
* All Lambdas are built with **Node.js 22 runtime**.
* Each Lambda function reads its configuration from environment variables defined in `.env-PROD`.
* The Lambdas interact with DynamoDB, S3, and SQS using the AWS SDK v3.

**Lambda Roles & Permissions**

* Each Lambda is assigned a **dedicated IAM role** with least-privilege permissions to:

  * Read/write DynamoDB tables
  * Access S3 for media operations
  * Read messages from SQS (for background tasks)
  * Authenticate requests through Cognito

**3. AWS Cognito (Authentication)**

* Authentication is handled by the **`auth-service` Lambda**, which uses **AWS Cognito** internally.
* Cognito manages:

  * User registration and login
  * Token issuance (Access and Refresh tokens)
  * Password recovery and validation
* API Gateway integrates directly with **Cognito Authorizer** to protect all user endpoints.

**4. DynamoDB (Data Storage)**

* Stores all user notes and related metadata.
* Table design optimized for **user-based access patterns**:

  * **Partition Key:** `user_id`
  * **Sort Key:** `note_id`
* Supports efficient querying of all notes for a given user or retrieving a single note by ID.
* Used for both structured data (notes) and operational metadata (sync state, timestamps, etc.).

**5. S3 and CloudFront (Media Storage)**

* **S3** is used to store media (note images).
* Buckets are **not publicly accessible** to maintain privacy and control.
* **CloudFront** is configured in front of S3 to provide secure, CDN-optimized delivery.
* Only pre-signed URLs are used for upload and download operations.

**6. SQS (Asynchronous Processing)**

* **S3 PUT events** (file uploads) trigger **SQS messages**.
* In production, **SQS triggers a dedicated Lambda** (`queue-service`) to process those messages.

  * Example: When a note is deleted, `queue-service` removes related media files asynchronously.
* SQS ensures decoupled and reliable background task processing, enabling retry mechanisms and fault tolerance.

**7. IAM Setup**

* A **dedicated IAM user** and related **roles/policies** are created for this project only.
* The IAM user is granted access to:

  * DynamoDB (CRUD for notes table)
  * S3 (read/write for media bucket)
  * SQS (read/write for message queues)
  * Lambda (deploy and invoke)
  * CloudFront (invalidate cache if required)
  * API Gateway & Cognito (management and authorizer setup)

This approach maintains **security isolation**, ensuring no cross-project access or permission overlap.


**Architecture Summary:**

```
Client (Android App)
        ↓
   API Gateway
        ↓
  +-----------------------------+
  |        Lambda Layer         |
  |  - auth-service (Cognito)   |
  |  - note-service (CRUD)      |
  +-----------------------------+
        ↓           ↓
   DynamoDB       S3 + CloudFront
        ↑           ↓
        └─── S3 PUT → SQS → Lambda (media cleanup)
```

[Back to content](#content)


[Back to content](#content)

## Install Guide

**Prerequisites**

You **must** have the following installed on your machine (tested on Linux):

* **Docker** — for running LocalStack (local S3/DynamoDB/SQS during development and integration tests)
* **AWS CLI** (v2 recommended)
* **Node.js 22** — the project targets Node 22 and `npm`
* **Linux OS** — bash scripts are written for Linux; run them on WSL2 or native Linux. macOS should also work but minor path differences may apply.
* **git** — to clone the repository


**Project environments**

The project supports **three environments**:

* `dev` — local development using LocalStack (local DynamoDB, S3, SQS)
* `test` — integration testing using local containers (scripts under `scripts/test/integration`)
* `prod` — deployment to a real AWS account

**Repository layout (relevant paths)**

* `scripts/dev/database-service.sh` — sets up local DynamoDB for development
* `scripts/test/integration/` — contains integration test harness scripts (start containers, set env vars, run tests, cleanup)
* `scripts/publish/` — publish/deploy helper scripts (see [Publish Guide](#publish-guide))


**Quick Install**

1. Clone the repository

```bash
git clone https://github.com/rahulstech/notes-app-aws-backend.git notes-app-aws-backend
cd notes-app-aws-backend
````

2. Ensure Node 22 and npm are active

```bash
node -v   # should show v22.x.x
npm -v
```

3. Install dependencies

```bash
npm install
```

4. Verify Docker and AWS CLI

```bash
docker --version
aws --version
```

**Local development (dev environment)**

The `dev` environment uses LocalStack to emulate AWS services such as DynamoDB.
Before running the backend locally, run the provided script to prepare the local database:

```bash
npm run exe:database
```

Typical *dev* flow:

- Create S3 bucket
- Setup CloudFront for the S3 bucket created in previous step
- Create a **user-pool** and **client** in Aws Cognito
- Create a standard Aws SQS queue
- Create an IAM user and grant access to all of the above services
- Rename `.env-DEV-example` to `.env-DEV` and add environment values.
- Start the local dynamodb instance to provision DynamoDB tables and seed data.
- Start the backend microservices:

```bash
npm run dev:note-service
npm run dev:queue-service
npm run dev:auth-service
```

**Note:** 
- In _dev_ environment you can run `note-service` with or without `authorization` header. If this service does not find _authorization_ header then it uses _GUEST_ user. 
- To test with authorized use just add the **accessToken** received on successful login from `auth-service` as _authorization_ header as **bearer** toke as `bearer <access-token>`

**Integration tests (test environment)**

Integration tests use LocalStack containers for S3, SQS, and DynamoDB.
Integration tests exist for `@notes-app/database-service`, `@notes-app/storage-service`, and `@notes-app/queue-service`.

Example:

```bash
npm run test:integration:database-service

npm run test:integration:storage-service

npm run test:integration:queue-service
```

What the test scripts do:

* Spin up LocalStack containers for the required AWS services
* Configure endpoints and environment variables
* Run Jest integration tests
* Clean up containers after test completion

**Troubleshooting**

* If Docker permission issues occur, ensure the current user can run Docker commands without `sudo`.
* If tests fail to connect to endpoints, verify endpoint URLs and port mappings in the integration scripts.
* If any base script (_*.sh_) inside _scripts_ directory does not run properly, then ensure that the scipt is executable.
  Make the script executable with the command `chmod +x /path/to/script.sh`

**[Back to Content](#content)**

## Publish Guide

The **publish process** prepares microservices for **production deployment** on AWS Lambda.

**Folder:** `scripts/publish/`

Each script inside this directory:

1. **Builds** the respective microservice (using its Nx target configuration for production)
2. **Packages** the build output into a `.zip` file
3. **Outputs** the zip to a `publish/` folder — ready to upload to AWS Lambda

Example:

```bash
# Build and package all microservices
npm run publish
```

**Environment Setup (Production)**

Each AWS Lambda function should have environment variables defined using `.env-PROD-example` as reference.
Rename it to `.env-PROD`, fill in the correct production values, and ensure those variables are also added in each Lambda’s configuration on AWS.

**Manual AWS setup (current phase):**

* **API Gateway** — acts as the entry point for API requests
* **Cognito Authorizer** — used for authentication and securing endpoints
* **Lambda Functions** — deploy built zip files from `publish-output/`
* **DynamoDB**, **S3**, **SQS**, **CloudFront** — must be created and connected via proper IAM roles

> Note: These configurations are currently performed manually.
> Future updates will include scripts to automate Lambda uploads, environment setup, and API Gateway configuration.

**[Back to Content](#content)**

## Learning Outcome

This project was my **first Nx monorepo** implementation — and also my **first TypeScript project**.
It gave me deep insights into how to structure, build, and maintain multiple backend services efficiently within a single workspace.

**TypeScript (Language and Design Mastery)**

This was my **first real-world TypeScript project**, and I learned how to leverage the language’s features to write robust, maintainable, and self-documented code.

Key learnings:

* Understanding and configuring the **TypeScript compiler (`tsconfig.json`)** — including reusing and extending base configurations for each microservice.
* Using **interfaces**, **classes**, and **enums** to create structured, predictable, and type-safe code.
* Practical usage of **TypeScript utility types** like:

  * `Omit`, `Partial`, `Required`, `Pick`, and `Record`
* Differentiating and correctly applying **special types** such as:

  * `never`, `unknown`, and `any`
* Applying **strict typing** in data models and service contracts for better IDE support and compile-time safety.

I also implemented several **object-oriented design patterns** and **TypeScript best practices**, such as:

* **Interface-based design** — defining abstract service contracts and then providing concrete implementations.
* **Factory classes** — for instantiating AWS service clients and environment-specific handlers.
* **SOLID principles** — ensuring that services are modular, testable, and maintainable.

**Nx Monorepo Architecture**

I learned how to:

* Structure an **Nx monorepo** with multiple applications and shared libraries.
* Configure build and serve targets for different environments (`development`, `production`, `test`).
* Reuse shared TypeScript types and utilities across microservices.
* Automate testing and building workflows using Nx executors and scripts.

**Database (DynamoDB - NoSQL)**

This was also my first experience with a **NoSQL database** — DynamoDB.
I learned that while **normalization** is crucial in SQL, **denormalization** often provides better performance in NoSQL systems designed around access patterns.

Key learnings:

* Tables require only key attributes (no strict schema enforcement)
* **Partition Key** defines the logical grouping
* **Sort Key** defines individual items within a partition
* Used **Global Secondary Index (GSI)** and **Local Secondary Index (LSI)** effectively
* Implemented **paged loading** similar to SQL `LIMIT/OFFSET` for large dataset handling
* Understood DynamoDB’s **query limitations** (must use keys or indexed attributes)

Example model:

> `user_id` → Partition Key
> `note_id` → Sort Key

This made it easy to query all notes by a user or a specific note efficiently.

**Asynchronous Design (SQS)**

I implemented **asynchronous communication** using **AWS SQS** to decouple services.

Example use case:
When a note is deleted, the related media files must also be deleted.
Instead of blocking the user request, a **delete event** is pushed to an SQS queue.
The `queue-service` listens for these events and performs the cleanup asynchronously.

This design pattern:

* Improves response times
* Reduces service coupling
* Increases scalability and reliability
* Handles retries automatically in case of failures


**Testing**

I designed and executed both **unit** and **integration** tests using **Jest**.

* **Unit tests** — focused on isolated modules using mocks.
* **Integration tests** — validated real interactions with AWS services through **LocalStack**.
* Learned Jest mocking strategies for AWS SDK calls and cross-service interactions.
* Implemented automated test scripts for reproducible and containerized testing environments.

**[Back to Content](#content)**

## Future Work

While the current version provides a strong and modular foundation, several enhancements are planned for upcoming iterations:

1. **API Versioning**

Currently, the backend supports a single API version.
Future releases will introduce multiple API versioning (e.g., v1, v2) to ensure backward compatibility and smoother client upgrades.

2. **Rich Text Notes**

At present, note content is stored as plain text.
Rich text formatting (bold, italic, bullet lists, etc.) will be supported to improve usability and enhance the note-taking experience.

3. **Advanced Filtering and Sorting**

Notes are currently sorted in descending order of creation date.
Future versions will support multiple filters and sorting options, such as:

* By tag or category

* By last modified date

* By title or keyword search

4. **Federated Authentication**

The authentication system currently uses AWS Cognito user pools.
Future updates will add federated authentication, allowing users to log in with Google, Facebook, and other identity providers.

5. **Deployment Automation**

While the current setup requires manual steps to configure AWS Lambda, API Gateway, and Cognito,
upcoming versions will include deployment automation scripts to:

* Upload Lambda packages

* Configure API Gateway routes

* Setup Cognito authorizers

* Sync environment variables from .env files automatically

**[Back to Content](#content)**

## Contact

If you’d like to discuss this project, collaborate, or learn more about my work:

- [**GitHub**](https://github.com/rahulstech)
- [**LinkedIn**](https://www.linkedin.com/in/rahul-bagchi-176a63212/)
- **Email** rahulstech18@gmail.com

**[Back to Content](#content)**