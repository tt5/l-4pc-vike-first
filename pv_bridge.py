#!/usr/bin/env python3
"""
PV Bridge Script for 4pchess and 4pcheckmate.

Simple threaded bridge: reads PV lines from 4pchess and mirrors
positions to 4pcheckmate for checkmate discovery.
"""

import subprocess
import sys
import re
import signal
import threading
import queue
from pathlib import Path
from typing import List, Optional

# Paths to engine binaries
CHESS_CLI = Path(__file__).parent / "4pchess" / "cli"
CHECKMATE_CLI = Path(__file__).parent / "4pcheckmate" / "cli"


def reader_thread(proc, out_queue, err_queue, name):
    """Read stdout/stderr from a subprocess into queues."""
    def read_stdout():
        for line in iter(proc.stdout.readline, ''):
            if not line:
                break
            out_queue.put(line.strip())
    
    def read_stderr():
        for line in iter(proc.stderr.readline, ''):
            if not line:
                break
            err_queue.put(line.strip())
    
    threading.Thread(target=read_stdout, name=f"{name}-out").start()
    threading.Thread(target=read_stderr, name=f"{name}-err").start()


class Engine:
    """Simple engine wrapper with threaded I/O."""
    
    def __init__(self, path: Path, name: str):
        self.name = name
        self.proc = subprocess.Popen(
            [path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self.out_queue = queue.Queue()
        self.err_queue = queue.Queue()
        reader_thread(self.proc, self.out_queue, self.err_queue, name)
    
    def send(self, cmd: str) -> None:
        """Send a command to the engine."""
        print(f"[{self.name} <-] {cmd}")
        self.proc.stdin.write(cmd + "\n")
        self.proc.stdin.flush()
    
    def get_lines(self) -> List[str]:
        """Get all available output lines."""
        lines = []
        while True:
            try:
                lines.append(self.out_queue.get_nowait())
            except queue.Empty:
                break
        return lines
    
    def get_errors(self) -> List[str]:
        """Get all available stderr lines."""
        lines = []
        while True:
            try:
                lines.append(self.err_queue.get_nowait())
            except queue.Empty:
                break
        return lines
    
    def quit(self) -> None:
        """Stop the engine."""
        self.send("quit")
        try:
            self.proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.proc.kill()


class PVBridge:
    """Bridge 4pchess PV output to 4pcheckmate positions."""
    
    INFO_RE = re.compile(r'info\s+depth\s+(\d+).*?pv\s+(.+?)(?:\s+score|\s*$)')
    
    def __init__(self, chess_path: Path, checkmate_path: Path):
        self.chess = Engine(chess_path, "4pchess")
        self.checkmate = Engine(checkmate_path, "4pcheckmate")
        self.running = False
        self.depth = 100
        self.position = "startpos"
        self.current_pv = []
        self.oldpv = []
    
    def set_position(self, pos: str) -> None:
        """Set position on both engines."""
        self.position = pos
        if pos == "startpos":
            self.chess.send("position startpos")
            self.checkmate.send("position startpos")
        elif pos.startswith("fen "):
            self.chess.send(f"position {pos}")
            self.checkmate.send(f"position {pos}")
        else:
            self.chess.send(f"position fen {pos}")
            self.checkmate.send(f"position fen {pos}")
    
    def set_depth(self, depth: int) -> None:
        self.depth = depth
    

    def update_checkmate(self, pv: List[str], depth: int) -> None:
        """Update 4pcheckmate to search the PV position."""
        l = 3
        if pv == self.current_pv:
            if pv == self.oldpv:
                print("> running")
                return
            else:
                print("> same")
                l = 1
        else:
            print("> new")
        self.oldpv = self.current_pv
        
        #if depth < 10:
        #    return
        
        #print(f"[Bridge] PV @ depth {depth}: {' '.join(pv)}")
        
        # Send stop, new position, go
        self.checkmate.send("stop")

        common = 0
        for a, b in zip(self.current_pv, pv):
            if a == b:
                common += 1
            else:
                break
        
        #moves = ' '.join(pv[:common])
        moves = ' '.join(pv[:max(1,len(pv)-l)])
        if self.position == "startpos":
            self.checkmate.send(f"position startpos moves {moves}")
        elif self.position.startswith("fen "):
            self.checkmate.send(f"position {self.position} moves {moves}")
        else:
            self.checkmate.send(f"position fen {self.position} moves {moves}")
        
        self.checkmate.send("go")
        self.current_pv = pv
    
    def run(self) -> None:
        """Main loop: process 4pchess output, mirror to 4pcheckmate."""
        self.running = True
        
        # Start 4pchess search
        self.chess.send(f"go depth {self.depth}")
        
        while self.running:
            # Process 4pchess output
            for line in self.chess.get_lines():
                print(f"[4pchess ->] {line}")
                
                # Parse PV info
                m = self.INFO_RE.match(line)
                if m:
                    depth = int(m.group(1))
                    pv_moves = m.group(2).strip().split()
                    self.update_checkmate(pv_moves, depth)
            
            # Show 4pchess errors
            for line in self.chess.get_errors():
                print(f"[4pchess ERR] {line}")
            
            # Show 4pcheckmate output
            for line in self.checkmate.get_lines():
                print(f"[4pcheckmate ->] {line}")
            
            # Show 4pcheckmate errors
            for line in self.checkmate.get_errors():
                print(f"[4pcheckmate ERR] {line}")
    
    def stop(self) -> None:
        """Stop both engines."""
        self.running = False
        self.chess.send("stop")
        self.chess.quit()
        self.checkmate.quit()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Bridge 4pchess PV to 4pcheckmate")
    parser.add_argument("--depth", type=int, default=100, help="Search depth")
    parser.add_argument("--position", type=str, default="startpos", help="startpos or FEN")
    parser.add_argument("--chess-cli", type=Path, default=CHESS_CLI)
    parser.add_argument("--checkmate-cli", type=Path, default=CHECKMATE_CLI)
    
    args = parser.parse_args()
    
    for path, name in [(args.chess_cli, "4pchess"), (args.checkmate_cli, "4pcheckmate")]:
        if not path.exists():
            print(f"Error: {name} not found: {path}", file=sys.stderr)
            sys.exit(1)
    
    bridge = PVBridge(args.chess_cli, args.checkmate_cli)
    bridge.set_position(args.position)
    bridge.set_depth(args.depth)
    
    def handler(sig, frame):
        print("\n[Bridge] Stopping...")
        bridge.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, handler)
    
    print(f"[Bridge] Starting: position={args.position}, depth={args.depth}")
    print("[Bridge] Ctrl+C to stop")
    
    bridge.run()
    bridge.stop()


if __name__ == "__main__":
    main()
