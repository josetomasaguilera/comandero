#!/bin/bash
set -euo pipefail

DB_PASSWORD=$(curl -s -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/attributes/db-password")

apt-get update -y
apt-get install -y postgresql

PG_VERSION=$(ls /etc/postgresql)
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "CREATE DATABASE comandero;" || true

sed -i "s/^#listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
echo "host all all 0.0.0.0/0 scram-sha-256" >> "$PG_HBA"

systemctl restart postgresql
systemctl enable postgresql
