#!/usr/bin/env python3
"""
PV Bridge Script for 4pchess and 4pcheckmate.

Runs both engines simultaneously, parses PV lines from 4pchess's stdout,
and updates 4pcheckmate's position by efficiently undoing/applying only
the changed moves.
"""

import subprocess
import sys
import re
import signal
from pathlib import Path
from typing import List, Optional
from time import sleep

# Paths to engine binaries
CHESS_CLI = Path(__file__).parent / "4pchess" / "cli"
CHECKMATE_CLI = Path(__file__).parent / "4pcheckmate" / "cli"


class EngineProcess:
    """Wrapper for an engine subprocess."""

    def __init__(self, executable: Path):
        self.process = subprocess.Popen(
            [executable],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self.buffer = ""
        self.stderr_buffer = ""

    def send(self, command: str) -> None:
        """Send a command to the engine."""
        print(f"[{self.process.args[0].name}] {command}")
        if self.process.stdin and not self.process.poll():
            self.process.stdin.write(command + "\n")
            self.process.stdin.flush()

    def read_line(self) -> Optional[str]:
        """Read a complete line from stdout, or None if not available."""
        if self.process.stdout is None:
            return None

        # Check if process has exited
        if self.process.poll() is not None:
            return None

        # First, check if we already have a complete line in the buffer
        if '\n' in self.buffer:
            line, self.buffer = self.buffer.split('\n', 1)
            return line.strip()

        # Try to read more data if no complete line in buffer
        import select
        import os

        fd = self.process.stdout.fileno()
        try:
            # Check if there's data available (non-blocking)
            ready, _, _ = select.select([fd], [], [], 0)
            if ready:
                chunk = os.read(fd, 1024).decode('utf-8', errors='replace')
                if chunk:
                    self.buffer += chunk
        except (OSError, ValueError):
            pass

        # Check again for complete lines after reading
        if '\n' in self.buffer:
            line, self.buffer = self.buffer.split('\n', 1)
            return line.strip()

        return None

    def read_stderr_line(self) -> Optional[str]:
        """Read a complete line from stderr, or None if not available."""
        if self.process.stderr is None:
            return None

        # Check if process has exited
        if self.process.poll() is not None:
            return None

        # First, check if we already have a complete line in the buffer
        if '\n' in self.stderr_buffer:
            line, self.stderr_buffer = self.stderr_buffer.split('\n', 1)
            return line.strip()

        # Try to read more data if no complete line in buffer
        import select
        import os

        fd = self.process.stderr.fileno()
        try:
            # Check if there's data available (non-blocking)
            ready, _, _ = select.select([fd], [], [], 0)
            if ready:
                chunk = os.read(fd, 1024).decode('utf-8', errors='replace')
                if chunk:
                    self.stderr_buffer += chunk
        except (OSError, ValueError):
            pass

        # Check again for complete lines after reading
        if '\n' in self.stderr_buffer:
            line, self.stderr_buffer = self.stderr_buffer.split('\n', 1)
            return line.strip()

        return None

    def quit(self) -> None:
        """Send quit command and terminate."""
        try:
            self.send("quit")
            self.process.wait(timeout=2)
        except (subprocess.TimeoutExpired, Exception):
            self.process.terminate()
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()


class PVBridge:
    """Bridge between 4pchess and 4pcheckmate engines."""

    # Regex to parse: info depth 12 time 245 nodes 45000 pv e2-e4 e7-e5 score 45 nps 183673
    INFO_REGEX = re.compile(
        r'info\s+'
        r'depth\s+(\d+)\s+'
        r'(?:time\s+\d+\s+)?'
        r'(?:nodes\s+\d+\s+)?'
        r'pv\s+(.+?)(?:\s+score|$)'
    )

    def __init__(self, chess_cli: Path, checkmate_cli: Path):
        self.chess_engine = EngineProcess(chess_cli)
        self.checkmate_engine = EngineProcess(checkmate_cli)
        self.current_pv: List[str] = []
        self.running = False
        self.depth = 100
        self.position = "startpos"

    def set_position(self, fen_or_startpos: str) -> None:
        """Set the position for both engines."""
        self.position = fen_or_startpos

        if fen_or_startpos == "startpos":
            # Send standard position setup
            self.chess_engine.send("position startpos")
            self.checkmate_engine.send("position startpos")
        elif fen_or_startpos.startswith("fen "):
            self.chess_engine.send(f"position {fen_or_startpos}")
            self.checkmate_engine.send(f"position {fen_or_startpos}")
        else:
            # Assume it's a FEN string
            self.chess_engine.send(f"position fen {fen_or_startpos}")
            self.checkmate_engine.send(f"position fen {fen_or_startpos}")

    def set_depth(self, depth: int) -> None:
        """Set the search depth."""
        self.depth = depth

    def find_common_prefix_length(self, list1: List[str], list2: List[str]) -> int:
        """Find the length of the longest common prefix of two lists."""
        min_len = min(len(list1), len(list2))
        for i in range(min_len):
            if list1[i] != list2[i]:
                return i
        return min_len

    def update_checkmate_position(self, new_pv: List[str], depth: int = 0) -> None:
        """
        Update 4pcheckmate's position to match the new PV.
        Sends stop, position with full move list, and go.
        """
        if new_pv == self.current_pv:
            return

        print(f"[PV] Depth {depth}: {' '.join(new_pv)}")

        common_len = self.find_common_prefix_length(self.current_pv, new_pv)
        num_new = len(new_pv) - common_len

        if num_new > 0:
            print(f"[Checkmate] New moves: {' '.join(new_pv[common_len:])}")

        self.checkmate_engine.send("stop")
        sleep(0.1)

        # Build position command with full move list
        moves_str = ' '.join(new_pv)
        if self.position == "startpos":
            self.checkmate_engine.send(f"position startpos moves {moves_str}")
        elif self.position.startswith("fen "):
            self.checkmate_engine.send(f"position {self.position} moves {moves_str}")
        else:
            self.checkmate_engine.send(f"position fen {self.position} moves {moves_str}")

        self.checkmate_engine.send("go")

        self.current_pv = new_pv.copy()
        print(f"[Checkmate] Position updated: {len(self.current_pv)} move(s) in PV")

    def parse_info_line(self, line: str) -> Optional[List[str]]:
        """Parse an info line and extract the PV moves."""
        match = self.INFO_REGEX.match(line)
        if match:
            pv_part = match.group(2).strip()
            moves = pv_part.split()
            return moves
        return None

    def should_log_engine_output(self, line: str) -> bool:
        """Check if an engine output line should be logged."""
        # Log all engine output
        return True

    def log_engine_output(self, engine_name: str, line: str, force: bool = False) -> None:
        """Log output from an engine."""
        if force or self.should_log_engine_output(line):
            print(f"[{engine_name}] {line}")

    def run(self) -> None:
        """Main loop: start 4pchess search and process output from both engines."""
        self.running = True

        # Start the search on 4pchess
        self.chess_engine.send(f"go depth {self.depth}")

        while self.running:
            # Read from 4pchess engine stdout (main search)
            line = self.chess_engine.read_line()
            if line is not None:
                self.log_engine_output("4pchess", line)

                # Check for search completion
                if line.startswith("bestmove "):
                    print(f"[Bridge] Search complete: {line}")
                    break

                # Parse info line with PV
                new_pv = self.parse_info_line(line)
                if new_pv is not None:
                    # Extract depth from the line for logging
                    depth_match = re.search(r'depth\s+(\d+)', line)
                    depth = int(depth_match.group(1)) if depth_match else 0
                    self.update_checkmate_position(new_pv, depth)

            # Read from 4pchess engine stderr
            chess_stderr = self.chess_engine.read_stderr_line()
            if chess_stderr is not None:
                print(f"[4pchess STDERR] {chess_stderr}")

            # Read from 4pcheckmate engine stdout (checkmate discovery)
            checkmate_line = self.checkmate_engine.read_line()
            if checkmate_line is not None:
                self.log_engine_output("4pcheckmate", checkmate_line)

            # Read from 4pcheckmate engine stderr
            checkmate_stderr = self.checkmate_engine.read_stderr_line()
            if checkmate_stderr is not None:
                print(f"[4pcheckmate STDERR] {checkmate_stderr}")

    def stop(self) -> None:
        """Stop both engines."""
        self.running = False
        self.chess_engine.send("stop")
        self.chess_engine.quit()
        self.checkmate_engine.quit()


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Bridge 4pchess PV lines to 4pcheckmate engine"
    )
    parser.add_argument(
        "--depth",
        type=int,
        default=100,
        help="Search depth (default: 100)",
    )
    parser.add_argument(
        "--position",
        type=str,
        default="startpos",
        help='Starting position: "startpos" or FEN string (default: startpos)',
    )
    parser.add_argument(
        "--chess-cli",
        type=Path,
        default=CHESS_CLI,
        help=f"Path to 4pchess CLI (default: {CHESS_CLI})",
    )
    parser.add_argument(
        "--checkmate-cli",
        type=Path,
        default=CHECKMATE_CLI,
        help=f"Path to 4pcheckmate CLI (default: {CHECKMATE_CLI})",
    )

    args = parser.parse_args()

    # Validate executables exist
    if not args.chess_cli.exists():
        print(f"Error: 4pchess CLI not found: {args.chess_cli}", file=sys.stderr)
        sys.exit(1)
    if not args.checkmate_cli.exists():
        print(f"Error: 4pcheckmate CLI not found: {args.checkmate_cli}", file=sys.stderr)
        sys.exit(1)

    bridge = PVBridge(args.chess_cli, args.checkmate_cli)
    bridge.set_position(args.position)
    bridge.set_depth(args.depth)

    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        print("\n[Bridge] Stopping engines...")
        bridge.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    print(f"[Bridge] Starting 4pchess and 4pcheckmate")
    print(f"[Bridge] Position: {args.position}")
    print(f"[Bridge] Depth: {args.depth}")
    print("[Bridge] Press Ctrl+C to stop")

    bridge.run()
    bridge.stop()


if __name__ == "__main__":
    main()
