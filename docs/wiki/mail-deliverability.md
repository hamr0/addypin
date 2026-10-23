---
title: Mail deliverability (SPF, DKIM, PTR)
theme: mail-deliverability
sources:
  - docs/archive/observability-playbook.md
---

# Mail deliverability: SPF, DKIM, PTR

SPF, DKIM and PTR setup that must be right before any alert can arrive.

## Why this comes first

Do this before anything else. pulselog/flightlog can be flawless and you still get nothing if the VPS can't hand mail to the recipient. Gmail (and most providers) reject unauthenticated mail outright. There are three independent gates, and all three must be green (docs/archive/observability-playbook.md:86-89).

## Golden rule

Never put your mail host behind a proxy/CDN. If `<MAIL_HOST>` (or the domain whose A record your SPF trusts) is proxied (e.g. Cloudflare "orange cloud"), it resolves to the CDN's IPs, not your VPS. That breaks SPF and reverse-DNS at once. A mail host must be DNS-only and point straight at `<VPS_IP>`. CDNs don't proxy SMTP/25 anyway, so proxying buys nothing (docs/archive/observability-playbook.md:91-95).

## 2a. PTR / reverse DNS (fixes Gmail `5.7.25`)

Set it at your VPS provider (not your DNS host): `<VPS_IP>` to `<MAIL_HOST>`. Then ensure `<MAIL_HOST>` forward-resolves back to `<VPS_IP>` (forward-confirmed reverse DNS, FCrDNS) (docs/archive/observability-playbook.md:97-100). Verify:

```bash
dig +short -x <VPS_IP>            # → <MAIL_HOST>.
dig +short A <MAIL_HOST>          # → <VPS_IP>   (NOT a CDN IP)
```
(docs/archive/observability-playbook.md:101-104)

## 2b. SPF (part of fixing `5.7.26`)

Publish a TXT record on `<DOMAIN>`. Prefer a literal IP so it doesn't depend on any hostname's proxy state (docs/archive/observability-playbook.md:106-108):

```
<DOMAIN>.   TXT   "v=spf1 ip4:<VPS_IP> -all"
```
(docs/archive/observability-playbook.md:109-111)

If you relay through Gmail/another provider, add their `include:` and use `~all`. Verify with `dig +short TXT <DOMAIN>` (docs/archive/observability-playbook.md:112-113).

## 2c. DKIM (part of fixing `5.7.26`)

Set up OpenDKIM (Postfix milter) with selector `<DKIM_SELECTOR>` for `<DOMAIN>`, then publish the public key. This is the step most often forgotten: the MTA signs happily, the recipient just can't verify (docs/archive/observability-playbook.md:116-118).

```bash
# on the VPS, after opendkim-genkey created <DKIM_SELECTOR>.txt:
cat /etc/opendkim/keys/<DOMAIN>/<DKIM_SELECTOR>.txt   # copy the p=… value
```
(docs/archive/observability-playbook.md:119-122)

Publish as TXT at `<DKIM_SELECTOR>._domainkey.<DOMAIN>` = `v=DKIM1; k=rsa; p=…` (docs/archive/observability-playbook.md:123). Verify it's live and that signing happens:

```bash
dig +short TXT <DKIM_SELECTOR>._domainkey.<DOMAIN>          # → v=DKIM1;...
grep 'DKIM-Signature field added' /var/log/maillog | tail  # → s=<DKIM_SELECTOR>
```
(docs/archive/observability-playbook.md:124-128)

## 2d. DMARC (recommended)

```
_dmarc.<DOMAIN>.   TXT   "v=DMARC1; p=none; rua=mailto:<OPERATOR_EMAIL>"
```
(docs/archive/observability-playbook.md:130-133)

## 2e. Prove it end-to-end

```bash
printf 'Subject: mailtest\nFrom: noreply@<DOMAIN>\nTo: <OPERATOR_EMAIL>\n\nhi\n' \
  | /usr/sbin/sendmail -f noreply@<DOMAIN> <OPERATOR_EMAIL>
sleep 8
grep '<OPERATOR_EMAIL>' /var/log/maillog | tail -1     # want: status=sent (250 2.0.0 OK)
```
(docs/archive/observability-playbook.md:135-141)

## Reading the result

`status=bounced` with `5.7.25` means fix PTR (2a). `5.7.26` means fix SPF/DKIM (2b/2c) (docs/archive/observability-playbook.md:142).

Back to the overview: [observability playbook](observability-playbook.md)
