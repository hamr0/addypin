#!/usr/bin/env bash
# Postfix pipe transport entry. Deployed to /opt/addypin/inbound-wrapper.sh,
# mode 750, owner addypin:addypin. master.cf invokes this; it sources the
# system env then execs the Node CLI against message-on-stdin.
set -e
cd /opt/addypin
set -a; source /etc/addypin/env; set +a
exec /usr/bin/env node --experimental-sqlite \
  /opt/addypin/server/inbound-cli.js
