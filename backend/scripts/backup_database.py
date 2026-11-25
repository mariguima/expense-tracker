"""Encrypted local Compose backup and isolated restore verification; never restores over the app DB."""
import argparse
import os
from pathlib import Path
import secrets
import subprocess
import sys

from cryptography.fernet import Fernet
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]


def docker(*args, data=None):
    result = subprocess.run(["docker", "compose", "exec", "-T", "db", *args],
                            cwd=ROOT, input=data, capture_output=True, check=False, timeout=300)
    if result.returncode:
        # pg_restore errors can include user data. Never print raw subprocess output.
        raise RuntimeError(f"Database command failed ({args[0]}). Review restricted database logs.")
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["backup", "verify"])
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "backend" / ".env")
    key = os.environ.get("BACKUP_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("Set BACKUP_ENCRYPTION_KEY to a Fernet key stored separately from backups.")
    cipher = Fernet(key)
    user = os.environ["POSTGRES_USER"]
    database = os.environ["POSTGRES_DB"]
    if args.action == "backup":
        if args.file.exists():
            raise RuntimeError("Choose a new backup file; existing backups are never overwritten.")
        data = docker("pg_dump", "-U", user, "-d", database, "--format=custom", "--no-owner", "--no-acl")
        args.file.parent.mkdir(parents=True, exist_ok=True)
        with args.file.open("xb") as output:
            output.write(cipher.encrypt(data))
        print(f"Encrypted backup saved: {args.file.resolve()}")
    else:
        data = cipher.decrypt(args.file.read_bytes())
        # A unique disposable database is created solely for this restore check.
        temporary = "restore_check_" + secrets.token_hex(8)
        docker("createdb", "-U", user, temporary)
        try:
            docker("pg_restore", "-U", user, "-d", temporary, "--exit-on-error", "--no-owner", "--no-acl", data=data)
            docker("psql", "-U", user, "-d", temporary, "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) FROM users; SELECT count(*) FROM expenses;")
            print("Backup decrypted and restored successfully into an isolated temporary database.")
        finally:
            docker("dropdb", "-U", user, temporary)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Backup operation failed: {type(error).__name__}", file=sys.stderr)
        sys.exit(1)
