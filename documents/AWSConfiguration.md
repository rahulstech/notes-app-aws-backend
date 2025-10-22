This document provides a structured, step-by-step guide for setting up the production AWS infrastructure for the **Notes App** backend. Each step includes the purpose and necessary configuration details.

-----

## 1\. IAM User Setup (The Administrator) 👤

This step establishes the primary administrative user for performing all subsequent setup tasks.

| Resource | Name | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **IAM User** | `notes-app-admin` | **Policy:** `AdministratorAccess` | A dedicated admin user for managing AWS services. |
| **Credentials** | N/A | Download `.csv` file and configure **AWS CLI** using the new profile. | Essential for programmatic access and command-line execution. |

-----

## 2\. DynamoDB Table Creation (The Database) 📝

A scalable NoSQL table is created to store user notes, optimized for user-specific queries and sorting by creation time.

| Resource | Name | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **DynamoDB Table** | `notes-app-user-notes` | **Primary Key:** Partition Key (PK) = **String** (Hash), Sort Key (SK) = **String** (Range) | Stores the core notes data. The PK is typically the User ID, and the SK is the Note ID. |
| **Local Secondary Index** | `OrderNoteByCreatedIndex` | **Key:** Sort Key = `timestamp_created` (**Number** Range) | Allows efficient querying of a user's notes (same PK) sorted by their creation time. |

-----

## 3\. SQS Queue Creation (The Message Broker) 📨

An SQS queue acts as a buffer for asynchronous tasks, specifically for processing file uploads from S3.

| Resource | Name | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **SQS Queue** | `notes-app-queue` | **Type:** Standard | Used for processing media file events asynchronously. |
| | | **Visibility Timeout:** 60 seconds | Gives the consuming Lambda (`notes-app-queue-service`) time to process the message. (Must be $\ge 2 \times$ Lambda Timeout). |
| | | **Receive Message Wait Time:** 20 seconds | Uses Long Polling to reduce the number of empty responses, lowering costs and latency. |

-----

Got it! You want to update the **CORS note** to reflect that `PUT` requests are allowed on the S3 bucket, so clients (like your frontend) can upload objects directly if needed. Here's an updated version of your section:

---

## 4. S3 Bucket and Event Notification Setup (The Media Store) 🖼️

An S3 bucket for storing media files and configuring event notifications to integrate with the SQS queue.

| Resource      | Configuration                                       | Purpose                                                                                                                                   |
| :------------ | :-------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **S3 Bucket** | **Type:** General Purpose, keep other defaults.     | Stores user media files (e.g., images, attachments).                                                                                      |
| **CORS Note** | **CORS configured for PUT requests from frontend.** | Allows the frontend (`https://rahulstech.github.io`) to upload objects directly using PUT. Objects will still be accessed via CloudFront. |

```json
[
    {
        "AllowedHeaders": [
            "content-type"
        ],
        "AllowedMethods": [
            "HEAD",
            "PUT"
        ],
        "AllowedOrigins": [
            "https://rahulstech.github.io"
        ],
        "ExposeHeaders": []
    }
]
```

✅ **Explanation:**

* `PUT` allows clients to upload files.
* `HEAD` allows checking object metadata before uploading.
* `AllowedOrigins` restricts access to your frontend domain.
* Objects are still served via CloudFront, so direct S3 access is minimized.

### SQS Queue Policy Update

The policy is updated to allow both the administrative user and the S3 service to interact with the queue.

```json
{
  "Version": "2012-10-17",
  "Id": "__default_policy_ID",
  "Statement": [
    {
      "Sid": "__owner_statement",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<account-id>:user/notes-app-admin"
      },
      "Action": "SQS:*",
      "Resource": "arn:aws:sqs:<queue-region>:<account-id>:notes-app-queue"
    },
    {
      "Sid": "MediaStore",
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:<queue-region>:<account-id>:notes-app-queue",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::notes-app-media-store"
        }
      }
    }
  ]
}
```

**Reasoning for `MediaStore` Statement:** The `Condition` ensures that only the **`notes-app-media-store`** S3 bucket can send `SendMessage` requests to this SQS queue, which is required for the S3 event notification to work.

### S3 Event Notification Configuration

| Event Name | Prefix | Event Tye | Destination |
| :--- | :--- | :--- | :--- |
| event-media-created | medias/ | `Object Creation` -\> **`Put (only)`** | SQS Queue -\> `notes-app-queue` |
| event-photo-created | photos/ | `Object Creation` -\> **`Put (only)`** | SQS Queue -\> `notes-app-queue` |

**Reasoning:** Only files uploaded to the specified prefixes and only upon the initial `Put` action will trigger a message to the SQS queue.

-----

## 5\. CloudFront Distribution Creation (The CDN) 🌐

A Content Delivery Network (CDN) is set up to distribute the media files globally, improving performance and reducing latency.

| Resource | Name | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **CloudFront Distribution** | `notes-app-cdn` | **Origin Type:** Amazon S3 | The CDN for media assets. |
| | | **Origin:** ARN of `notes-app-media-store` S3 bucket. | Serves as the source of the content. |
| **Note** | | Firewall disabled (for now). | Simplifies initial setup. |
| **Automatic Action** | | CloudFront automatically adds a **Bucket Policy** to `notes-app-media-store` allowing `GetObject` action from the distribution. | This ensures the CDN can fetch the files, but external users can't access S3 directly. |

-----

## 6\. Cognito User Pool Setup (Authentication) 🔑

Cognito is set up to handle user registration, sign-in, and authorization.

| Resource | Name | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **User Pool** | `notes-app-users` | **Region:** Must match other services. | The central repository for user accounts. |
| **Application Type** | | **Machine to Machine** | **Reasoning:** The client will not use the Cognito SDK directly. The backend service (Lambda) will handle all interactions, allowing for easier switching of the authorization technique in the future without modifying the client. |

### App Client Configuration

| Configuration | Details | Purpose |
| :--- | :--- | :--- |
| **App Client** | `notes-app-users` (System-generated name) | The entity that interacts with the User Pool. |
| **Auth Flows** | `ALLOW_USER_PASSWORD_AUTH` | Enables sign-in with username/email and password via the server. |
| | `ALLOW_REFRESH_TOKEN_AUTH` | Allows the user to obtain new access/ID tokens without re-authenticating with their password. |

### Attribute Verification

| Section | Configuration | Purpose |
| :--- | :--- | :--- |
| **Attribute verification and user account confirmation** | **Automatically send:** Allow Cognito to automatically send messages to verify and confirm. | Essential for new users to complete sign-up and be able to sign in. |
| | **Attributes to verify:** `Send email message, verify email address` | Ensures the email address is valid before the account is fully active. |
| | **Verifying attribute changes:** `Email address` | Ensures if a user changes their email, the new one is verified. |

-----

## 7\. IAM Policies Creation (Permissions for Lambda) 🛡️

Three reusable IAM policies are created to grant necessary permissions to the Lambda functions.

### NotesAppUserNotesPolicy (DynamoDB Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem", "dynamodb:BatchGetItem", "dynamodb:GetItem", "dynamodb:Query",
        "dynamodb:Scan", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:<dynamodb-table-region>:<account-id>:table/notes-app-user-notes",
        "arn:aws:dynamodb:<dynamodb-table-region>:<accout-id>:table/notes-app-user-notes/index/OrderNoteByCreatedIndex"
      ]
    }
  ]
}
```

### NotesAppMediaStorePolicy (S3 Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::notes-app-media-store",
        "arn:aws:s3:::notes-app-media-store/medias/*",
        "arn:aws:s3:::notes-app-media-store/photos/*"
      ]
    }
  ]
}
```

### NotesAppQueuePolicy (SQS Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:DeleteMessage", "sqs:ReceiveMessage", "sqs:SendMessage", "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:ap-south-1:<account-id>:notes-app-queue"
    }
  ]
}
```

-----

## 8\. API Gateway Setup (The Front Door) 🚪

An HTTP API is created as the entry point for all client requests.

| Resource | Name | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `notes-app-rest-api` | **API Type:** HTTP API | A high-performance, low-cost API endpoint. |
| | | **IP Address Type:** Dualstack (IPv4 + IPv6) | Ensures modern network compatibility. |

-----

## 9\. Lambda Function: Notes App Auth Service ⚙️

This Lambda handles all authentication-related requests.

| Resource | Name | Configuration |
| :--- | :--- | :--- |
| **Lambda Function** | `notes-app-auth-service` | **Runtime:** Node.js 22.x |

### Execution Role Permissions

The Lambda's default Execution Role is updated to attach the following custom policies:

  * `NotesAppUserNotesPolicy`
  * `NotesAppMediaStorePolicy`
  * `NotesAppQueuePolicy`

**Purpose:** This gives the authorization service Lambda the necessary permissions to interact with DynamoDB (for user data storage), S3, and SQS if needed (though typically auth logic is limited to Cognito and DynamoDB). It also inherits the default CloudWatch logging permission.

-----

## 10\. Lambda Function: Notes App Note Service ✍️

This Lambda handles all core CRUD (Create, Read, Update, Delete) operations for the notes.

| Resource | Name | Configuration |
| :--- | :--- | :--- |
| **Lambda Function** | `notes-app-note-service` | **Runtime:** Node.js 22.x |

### Execution Role Permissions

The Lambda's default Execution Role is updated to attach the following custom policies:

  * `NotesAppUserNotesPolicy`
  * `NotesAppMediaStorePolicy`
  * `NotesAppQueuePolicy`

**Purpose:** This Lambda needs to read/write notes (DynamoDB), handle media files (S3), and potentially send messages to SQS (via `NotesAppQueuePolicy`).

-----

## 11\. Lambda Function: Notes App Queue Service 🔄

This Lambda is dedicated to processing messages from the SQS queue, primarily for handling media file events.

| Resource | Name | Configuration |
| :--- | :--- | :--- |
| **Lambda Function** | `notes-app-queue-service` | **Runtime:** Node.js 22.x |

### Execution Role Permissions

The Lambda's default Execution Role is updated to attach the following custom policies:

  * `NotesAppUserNotesPolicy`
  * `NotesAppMediaStorePolicy`
  * `NotesAppQueuePolicy`

**Purpose:** This Lambda processes S3 events received via SQS, which may require it to update DynamoDB records (`NotesAppUserNotesPolicy`) or perform further operations on S3 objects.

### SQS Trigger Configuration

| Configuration | Details | Purpose |
| :--- | :--- | :--- |
| **Source** | SQS (`notes-app-queue`) | Links the Lambda to the queue for automatic invocation. |
| **Batch Size** | 100 | The maximum number of messages Lambda reads from the queue in one batch. |
| **Batch Window** | 300 seconds (max) | The maximum time Lambda waits to collect a batch before invoking the function. |

### Memory and Timeout

| Setting | Value | Rationale |
| :--- | :--- | :--- |
| **Memory** | 256 MB | Increased from default to handle processing, potentially including media manipulation. |
| **Timeout** | 30 seconds | The maximum execution time. **Rule of Thumb:** SQS Visibility Timeout (60s) $\ge 2 \times$ Lambda Timeout (30s). |

-----

## 12\. SQS Queue Policy Update for Lambda ➡️

The SQS queue policy must be updated to explicitly allow the `notes-app-queue-service` Lambda to interact with it.

```json
{
  // ... existing statements ...
  "Statement": [
    // ... __owner_statement and MediaStore statements ...
    {
      "Sid": "QueueService",
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:<queue region>:<account-id>:notes-app-queue",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:lambda:<lambda region>:<account-id>:function:notes-app-queue-service"
        }
      }
    }
  ]
}
```

**Reasoning:** The `Condition` ensures that only the specific SQS-triggered Lambda function can receive/delete messages from the queue.

-----

## 13\. API Gateway Integrations (Connecting API to Lambda) 🔗

The HTTP API routes are connected to the respective Lambda functions.

| Resource | Integration | Target | Automatic Action |
| :--- | :--- | :--- | :--- |
| **Integration** | `notes-app-auth-service` | Lambda: `notes-app-auth-service` | API Gateway automatically adds **`lambda:InvokeFunction`** permissions to the Lambda's resource policy. |
| **Integration** | `notes-app-note-service` | Lambda: `notes-app-note-service` | API Gateway automatically adds **`lambda:InvokeFunction`** permissions to the Lambda's resource policy. |
| **Integration** | `notes-app-queue-service` | Lambda: `notes-app-queue-service` | API Gateway automatically adds **`lambda:InvokeFunction`** permissions to the Lambda's resource policy. |
| **Integration** | `notes-app-playground` | Lambda: `notes-app-playground` | API Gateway automatically adds **`lambda:InvokeFunction`** permissions to the Lambda's resource policy. |

-----

## 14\. API Gateway Authorizer Setup (Protecting Routes) 🔒

A Cognito JWT Authorizer is configured to validate tokens before requests reach the protected Lambda functions.

| Resource | Name | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **Authorizer** | `notes-app-cognito-authorizer` | **Authorization Type:** JWT | Validates JSON Web Tokens issued by Cognito. |
| | | **Issuer:** `https://cognito-idp.<region>.amazonaws.com/<user-pool-id>` | Tells the authorizer where to find the public keys to verify the token signature. |
| | | **Audience:** `<cognito notes-app-user client id>` | Ensures the token was issued for the correct application client. |
| | | **Identity Source:** `$request.header.Authorization` | Specifies that the JWT token is expected in the Authorization header. |

-----

## 15\. API Gateway Routes and CORS 🗺️

The final step maps API paths to integrations and configures Cross-Origin Resource Sharing (CORS).

### Routes Configuration

| Route | Integration | Authorizer | Type/Pattern | Reasoning |
| :--- | :--- | :--- | :--- | :--- |
| **`ANY /auth/{proxy+}`** | `notes-app-auth-service` | NONE | Lambda Proxy | Handles all authentication routes (`/auth/login`, `/auth/register`, etc.). **No authorizer is needed** as these are public. |
| **`ANY /user/{proxy+}`** | `notes-app-auth-service` | `notes-app-cognito-authorizer` | Lambda Proxy | Handles user-specific auth actions (e.g., changing password). **Requires authentication.** |
| **`ANY /notes/{proxy+}`** | `notes-app-note-service` | `notes-app-cognito-authorizer` | Lambda Proxy | Handles core note CRUD operations. **Requires authentication.** |
| **`ANY /playground/{proxy+}`** | `notes-app-note-service` | NONE | Lambda Proxy | Exposes specific functionality for the public playground. **No authorizer is needed.** |

**Lambda Proxy Handler:** Using the `{proxy+}` greedy path variable directs all sub-paths to the same Lambda function, allowing the internal Node.js/Express server in the Lambda code to handle the specific routing (e.g., `/auth/login` vs `/auth/register`).

### CORS Configuration

| Setting | Value | Rationale |
| :--- | :--- | :--- |
| **`Access-Control-Allow-Origin`** | `https://rahulstech.github.io` | Explicitly allows the frontend playground (GitHub Pages) to make requests to the API. |
| **`Access-Control-Allow-Headers`** | `*` | Allows all headers, including the **`Authorization`** header needed for JWT. |
| **`Access-Control-Allow-Methods`** | `*` | Allows all HTTP methods (GET, POST, PUT, DELETE, etc.). |