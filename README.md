FwdMX - A DNS-driven Forwarding Mail Server
-------------------------------------------

FwdMX is a forwarding MX server that references DNS TXT
records to determine the destination for an inbound
message. Messages can be forwarded to one or multiple
email addresses or sent to a 'webhook'.

FwdMX uses Haraka (an SMTP server in the NodeJS platform),
so you must have Haraka installed before attempting to
configure FwdMX.

See web/index.html for more.
