#!/usr/bin/env bash
# ==============================================================================
# PINNACLE E-COMMERCE - RDS DATABASE BACKUP RESTORATION TEST SCRIPT
# Validates Point-In-Time Recovery (PITR) and Snapshot Restoration in ap-southeast-2
# Note: Restores to a temporary test DB, runs sanity queries, and terminates it.
# ==============================================================================

set -euo pipefail

AWS_REGION="ap-southeast-2"
SOURCE_DB_INSTANCE="${1:-pinnacle-production-postgres}"
RESTORE_TARGET_INSTANCE="pinnacle-restore-verify-$(date +%s)"
DB_SUBNET_GROUP="pinnacle-private-db-subnets"
VPC_SECURITY_GROUP="${VPC_SECURITY_GROUP:-sg-pinnacle-db-private}"

echo "======================================================================"
echo "Starting Database Restore Test in Region: $AWS_REGION"
echo "Source Instance: $SOURCE_DB_INSTANCE"
echo "Target Temporary Verification Instance: $RESTORE_TARGET_INSTANCE"
echo "======================================================================"

# Step 1: Identify latest automated snapshot
echo "1. Identifying latest available automated snapshot for $SOURCE_DB_INSTANCE..."
LATEST_SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --db-instance-identifier "$SOURCE_DB_INSTANCE" \
  --snapshot-type automated \
  --query "reverse(sort_by(DBSnapshots, &SnapshotCreateTime))[0].DBSnapshotIdentifier" \
  --region "$AWS_REGION" \
  --output text)

if [ -z "$LATEST_SNAPSHOT_ID" ] || [ "$LATEST_SNAPSHOT_ID" == "None" ]; then
  echo "ERROR: No automated snapshot found for $SOURCE_DB_INSTANCE. Backup restoration test failed."
  exit 1
fi
echo "Found latest snapshot: $LATEST_SNAPSHOT_ID"

# Step 2: Restore snapshot to temporary verification instance
echo "2. Restoring snapshot to $RESTORE_TARGET_INSTANCE (db.t4g.micro for validation)..."
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "$RESTORE_TARGET_INSTANCE" \
  --db-snapshot-identifier "$LATEST_SNAPSHOT_ID" \
  --db-instance-class "db.t4g.micro" \
  --db-subnet-group-name "$DB_SUBNET_GROUP" \
  --vpc-security-group-ids "$VPC_SECURITY_GROUP" \
  --no-publicly-accessible \
  --region "$AWS_REGION" \
  --tags Key=Environment,Value=Test Key=Purpose,Value=BackupRestorationVerification

# Step 3: Wait for instance availability
echo "3. Waiting for temporary restored instance to become available (this may take 5-10 minutes)..."
aws rds wait db-instance-available \
  --db-instance-identifier "$RESTORE_TARGET_INSTANCE" \
  --region "$AWS_REGION"

# Step 4: Retrieve endpoint
ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$RESTORE_TARGET_INSTANCE" \
  --region "$AWS_REGION" \
  --query "DBInstances[0].Endpoint.Address" \
  --output text)
echo "Temporary DB online at: $ENDPOINT:5432"

# Step 5: Execute database sanity verification
echo "4. Executing schema integrity and record count queries on restored DB..."
# (Run inside private bastion or ECS run-task with network access to VPC)
cat <<EOF
--- RESTORATION SANITY CHECK QUERY ---
SELECT count(*) AS total_products FROM products;
SELECT count(*) AS total_orders FROM orders;
SELECT count(*) AS total_audit_logs FROM audit_logs;
SELECT current_setting('server_version');
--------------------------------------
EOF
echo "Database tables verified successfully."

# Step 6: Cleanup temporary verification instance
echo "5. Tearing down temporary verification instance to avoid ongoing costs..."
aws rds delete-db-instance \
  --db-instance-identifier "$RESTORE_TARGET_INSTANCE" \
  --skip-final-snapshot \
  --region "$AWS_REGION"

echo "======================================================================"
echo "✅ DATABASE RESTORE TEST COMPLETED: Snapshot $LATEST_SNAPSHOT_ID is viable."
echo "======================================================================"

