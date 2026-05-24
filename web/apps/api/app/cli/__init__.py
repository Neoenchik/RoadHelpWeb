"""CLI: python -m app.cli <command>"""
import sys

from app.cli import create_admin, seed

COMMANDS = {
    "create-admin": create_admin.run,
    "seed": seed.run,
}


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(f"Usage: python -m app.cli <{ '|'.join(COMMANDS) }>")
        sys.exit(1)
    COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    main()
