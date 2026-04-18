# Email System

## Overview

AddyPin's email system allows users to send emails to `SHORTCODE@addypin.com` and receive automatic responses with location details and map app links.

**Example**: Send email to `TRZLUA@addypin.com` -> Get map links for that location

## Architecture

```
External Email Server
    | (SMTP Port 25)
Maddy Mail Server (systemd service)
    | (Webhook Script)
AddyPin Application (port 3000)
    | (Resend API)
User receives auto-response email
```

## Components

### 1. Maddy Mail Server

- **Service**: systemd service `maddy`
- **Port**: 25 (SMTP)
- **Config**: `/etc/maddy/maddy.conf`

Configuration:
```
smtp tcp://0.0.0.0:25 {
    hostname mail.addypin.com
    destination addypin.com {
        deliver_to &webhook
    }
    default_destination {
        reject 550 5.1.1 "Domain not served here"
    }
}

msgpipeline webhook {
    default_destination {
        check {
            command /usr/local/bin/addypin-webhook-sender
        }
        deliver_to dummy
    }
}
```

### 2. Webhook Script

- **Location**: `/usr/local/bin/addypin-webhook-sender`
- **Log**: `/var/log/addypin-webhook.log`

Process:
1. Receives email content via stdin from Maddy
2. Parses `To:` and `From:` headers
3. Extracts shortcode (e.g., `TRZLUA@addypin.com` -> `TRZLUA`)
4. Sends JSON payload to `http://127.0.0.1:3000/api/webhook/email-inbound`

### 3. Application Webhook Handler

- **Endpoint**: `POST /api/webhook/email-inbound`
- **File**: `server/routes.ts`

Process:
1. Receives webhook from Maddy
2. Validates `to` and `from` fields
3. Extracts shortcode from recipient email
4. Calls `sendMapAutoResponse()` from email-autoresponder service
5. Returns success/failure

### 4. Auto-Response (Resend API)

- **Service**: `server/services/email-autoresponder.ts`
- Looks up pin by shortcode
- Generates map links for the pin's coordinates
- Sends formatted email via Resend API

## Dual Format Implementation

Pins are accessible via two formats:
- **Web**: `ABC123.addypin.com` - Nginx wildcard routing catches `*.addypin.com` and proxies to the app
- **Email**: `ABC123@addypin.com` - Maddy receives, webhook forwards to app, auto-response sent

## DNS Requirements

```
MX    addypin.com    mail.addypin.com    10
A     mail.addypin.com    <VPS-IP>
A     *.addypin.com       <VPS-IP>
```

## OTP Email Verification

For pin editing, the system also sends OTP codes via Resend:
- `POST /api/otp/send` - Sends 6-digit code to email
- `POST /api/otp/verify` - Verifies code and returns edit token
