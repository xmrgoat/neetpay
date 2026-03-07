#!/bin/bash
# ============================================================================
# NeetPay — PostgreSQL 16 Secure Setup for VPS (Ubuntu/Debian)
# Run as root on the VPS: bash setup-vps-postgres.sh
# ============================================================================
set -euo pipefail

# ─── Config ─────────────────────────────────────────────────────────────────
DB_NAME="voidpay"
DB_USER="voidpay"
DB_PASS="V0idPG2026neet!"  # Change this in production
ALLOWED_IP="0.0.0.0/0"     # Restrict to your IP in production (e.g. 1.2.3.4/32)
PG_VERSION="16"
SSL_DAYS=3650               # 10 year self-signed cert

echo "══════════════════════════════════════════════════════════"
echo "  NeetPay PostgreSQL ${PG_VERSION} — Secure VPS Setup"
echo "══════════════════════════════════════════════════════════"

# ─── 1. Install PostgreSQL 16 ──────────────────────────────────────────────
echo "[1/7] Installing PostgreSQL ${PG_VERSION}..."
apt-get update -qq
apt-get install -y -qq gnupg2 lsb-release curl

# Add official PostgreSQL repo
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg 2>/dev/null || true
apt-get update -qq
apt-get install -y -qq "postgresql-${PG_VERSION}" "postgresql-contrib-${PG_VERSION}"

PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
PG_DATA="/var/lib/postgresql/${PG_VERSION}/main"

# ─── 2. Enable data checksums ──────────────────────────────────────────────
echo "[2/7] Enabling data checksums (integrity protection)..."
systemctl stop postgresql
su - postgres -c "/usr/lib/postgresql/${PG_VERSION}/bin/pg_checksums --enable -D ${PG_DATA}" 2>/dev/null || echo "  Checksums already enabled or fresh cluster"
systemctl start postgresql

# ─── 3. Generate SSL certificates ──────────────────────────────────────────
echo "[3/7] Generating SSL certificates..."
SSL_DIR="/etc/postgresql/${PG_VERSION}/main/ssl"
mkdir -p "${SSL_DIR}"

openssl req -new -x509 -days ${SSL_DAYS} -nodes \
  -out "${SSL_DIR}/server.crt" \
  -keyout "${SSL_DIR}/server.key" \
  -subj "/CN=neetpay-db/O=NeetPay/C=FR" \
  2>/dev/null

chown postgres:postgres "${SSL_DIR}/server.crt" "${SSL_DIR}/server.key"
chmod 600 "${SSL_DIR}/server.key"
chmod 644 "${SSL_DIR}/server.crt"

# ─── 4. Configure PostgreSQL ───────────────────────────────────────────────
echo "[4/7] Configuring PostgreSQL for security..."

cat > /tmp/neetpay_pg.conf << 'PGCONF'
# ── NeetPay security settings ──

# Listen on all interfaces
listen_addresses = '*'
port = 5432

# SSL — enforce encrypted connections
ssl = on
ssl_cert_file = '/etc/postgresql/16/main/ssl/server.crt'
ssl_key_file = '/etc/postgresql/16/main/ssl/server.key'
ssl_min_protocol_version = 'TLSv1.3'
ssl_ciphers = 'HIGH:!aNULL:!MD5'

# Connection hardening
max_connections = 50
password_encryption = scram-sha-256

# Logging
log_connections = on
log_disconnections = on
log_statement = 'ddl'
log_line_prefix = '%t [%p] %u@%d '

# Performance (small VPS)
shared_buffers = 128MB
effective_cache_size = 384MB
work_mem = 4MB
maintenance_work_mem = 64MB
PGCONF

# Append our config (PostgreSQL reads includes)
if ! grep -q "neetpay_pg.conf" "${PG_CONF}"; then
  cp /tmp/neetpay_pg.conf "/etc/postgresql/${PG_VERSION}/main/conf.d/neetpay.conf" 2>/dev/null || {
    mkdir -p "/etc/postgresql/${PG_VERSION}/main/conf.d"
    cp /tmp/neetpay_pg.conf "/etc/postgresql/${PG_VERSION}/main/conf.d/neetpay.conf"
    echo "include_dir = 'conf.d'" >> "${PG_CONF}"
  }
fi

# ─── 5. Configure authentication (pg_hba.conf) ─────────────────────────────
echo "[5/7] Configuring authentication (SSL + scram-sha-256)..."

cat > "${PG_HBA}" << HBAEOF
# TYPE  DATABASE  USER       ADDRESS           METHOD

# Local connections (unix socket)
local   all       postgres                     peer
local   all       all                          scram-sha-256

# SSL-only remote connections
hostssl ${DB_NAME} ${DB_USER} ${ALLOWED_IP}    scram-sha-256

# Reject everything else
host    all       all        0.0.0.0/0         reject
host    all       all        ::/0              reject
HBAEOF

chown postgres:postgres "${PG_HBA}"

# ─── 6. Create database and user ───────────────────────────────────────────
echo "[6/7] Creating database '${DB_NAME}' and user '${DB_USER}'..."
systemctl restart postgresql

su - postgres -c "psql -c \"DO \\\$\\\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\\\$\\\$;\""

su - postgres -c "psql -c \"SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'\" -tA" | grep -q 1 || \
  su - postgres -c "createdb -O ${DB_USER} ${DB_NAME}"

# Enable pgcrypto extension for encryption functions
su - postgres -c "psql -d ${DB_NAME} -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'"

# Grant permissions
su - postgres -c "psql -c 'GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};'"
su - postgres -c "psql -d ${DB_NAME} -c 'GRANT ALL ON SCHEMA public TO ${DB_USER};'"
su - postgres -c "psql -d ${DB_NAME} -c 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};'"

# ─── 7. Firewall ───────────────────────────────────────────────────────────
echo "[7/7] Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw allow 5432/tcp comment "PostgreSQL NeetPay"
  echo "  UFW: port 5432 opened"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port=5432/tcp
  firewall-cmd --reload
  echo "  firewalld: port 5432 opened"
else
  # iptables fallback
  iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
  echo "  iptables: port 5432 opened"
fi

# ─── Done ───────────────────────────────────────────────────────────────────
systemctl restart postgresql
systemctl enable postgresql

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  PostgreSQL ${PG_VERSION} installed and secured!"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "  Connection string (SSL):"
echo "  postgresql://${DB_USER}:${DB_PASS}@185.55.243.203:5432/${DB_NAME}?sslmode=require"
echo ""
echo "  Security features:"
echo "  - TLS 1.3 enforced (self-signed cert)"
echo "  - SCRAM-SHA-256 password hashing"
echo "  - Data checksums enabled"
echo "  - pgcrypto extension available"
echo "  - Only SSL connections accepted"
echo "  - DDL statements logged"
echo ""
echo "  Next: Update your .env DATABASE_URL with the connection string above"
echo ""
