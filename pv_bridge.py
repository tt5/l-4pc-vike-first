#!/usr/bin/env python3
"""
PV Bridge Script for 4pchess and 4pcheckmate.

Bridge that subscribes to NATS commands from WebSocket clients
and mirrors positions to 4pcheckmate for checkmate discovery.
"""

import subprocess
import sys
import re
import signal
import threading
import queue
import json
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from time import sleep
try:
    import nats
    from nats.errors import NoServersError, TimeoutError
except ImportError:
    print("Error: nats-py not found. Install with: pip install nats-py")
    sys.exit(1)

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


def stdin_reader_thread(stdin_queue):
    """Read stdin commands into a queue."""
    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            cmd = line.strip()
            if cmd:
                stdin_queue.put(cmd)
    except (EOFError, KeyboardInterrupt):
        pass


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
    """Bridge NATS commands from WebSocket clients to 4pchess and 4pcheckmate."""
    
    INFO_RE = re.compile(r'info\s+pv\s+(.+?)(\s*$)')
    
    def __init__(self, chess_path: Path, checkmate_path: Path, nats_url: str = "nats://localhost:4222"):
        self.chess = Engine(chess_path, "4pchess")
        self.checkmate = Engine(checkmate_path, "4pcheckmate")
        self.running = False
        self.depth = 100
        self.position = "startpos"
        self.current_pv = []
        self.oldpv = []
        self.made_moves = {}  # Track moves made by each client: {client_id: [moves]}
        self.nats_url = nats_url
        self.nc = None
        self.command_queue = queue.Queue()
    
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
    
    async def connect_nats(self):
        """Connect to NATS server."""
        try:
            print(f"[Bridge] Connecting to NATS at {self.nats_url}...")
            self.nc = await nats.connect(self.nats_url)
            print("[Bridge] Connected to NATS")
            
            # Subscribe to command subjects
            await self.nc.subscribe("engine.commands.*", cb=self.handle_nats_command)
            print("[Bridge] Subscribed to engine.commands.*")
            
        except (NoServersError, TimeoutError) as e:
            print(f"[Bridge] Failed to connect to NATS: {e}")
            raise
    
    async def handle_nats_command(self, msg):
        """Handle NATS command message."""
        try:
            command = json.loads(msg.data.decode())
            client_id = command.get('clientId')
            cmd_type = command.get('type')
            data = command.get('data', {})
            
            print(f"[Bridge] Received command from {client_id}: {cmd_type}")
            
            # Initialize client moves if not exists
            if client_id not in self.made_moves:
                self.made_moves[client_id] = []
            
            # Process command based on type
            if cmd_type == "go":
                depth = data.get('depth', self.depth)
                print(f"[Bridge] -> go depth {depth}")
                self.chess.send(f"go depth {depth}")
                
            elif cmd_type == "stop":
                print("[Bridge] -> stop")
                self.chess.send("stop")
                self.checkmate.send("stop")
                
            elif cmd_type == "move":
                move = data.get('move')
                if move and "-" in move:
                    print(f"[Bridge] -> move {move}")
                    self.chess.send(f"move {move}")
                    self.made_moves[client_id].append(move)
                else:
                    print(f"[Bridge] Invalid move format: {move}")
                    await self.send_error_response(client_id, "Invalid move format")
                    
            elif cmd_type == "undo":
                if self.made_moves[client_id]:
                    last_move = self.made_moves[client_id].pop()
                    print(f"[Bridge] -> undo {last_move}")
                    
                    self.chess.send("undo")
                    
                    # Update 4pcheckmate position with remaining moves
                    moves_str = ' '.join(self.made_moves[client_id])
                    if self.position == "startpos":
                        if moves_str:
                            self.checkmate.send(f"position startpos moves {moves_str}")
                        else:
                            self.checkmate.send("position startpos")
                    elif self.position.startswith("fen "):
                        if moves_str:
                            self.checkmate.send(f"position {self.position} moves {moves_str}")
                        else:
                            self.checkmate.send(f"position {self.position}")
                    else:
                        if moves_str:
                            self.checkmate.send(f"position fen {self.position} moves {moves_str}")
                        else:
                            self.checkmate.send(f"position fen {self.position}")
                    
                    self.current_pv = []
                    self.oldpv = []
                else:
                    print("[Bridge] No moves to undo")
                    await self.send_error_response(client_id, "No moves to undo")
            else:
                print(f"[Bridge] Unknown command: {cmd_type}")
                await self.send_error_response(client_id, f"Unknown command: {cmd_type}")
                
        except json.JSONDecodeError as e:
            print(f"[Bridge] Failed to parse command: {e}")
        except Exception as e:
            print(f"[Bridge] Error handling command: {e}")
    
    async def send_error_response(self, client_id: str, message: str):
        """Send error response to specific client."""
        if self.nc:
            response = {
                "clientId": client_id,
                "type": "error",
                "data": {"message": message},
                "timestamp": int(time.time() * 1000)
            }
            await self.nc.publish(f"engine.responses.{client_id}", json.dumps(response).encode())
    
    async def send_response(self, client_id: str, response_type: str, data: Any):
        """Send response to specific client."""
        if self.nc:
            response = {
                "clientId": client_id,
                "type": response_type,
                "data": data,
                "timestamp": int(time.time() * 1000)
            }
            await self.nc.publish(f"engine.responses.{client_id}", json.dumps(response).encode())
    

    async def update_checkmate(self, pv: List[str], client_id: str = None) -> None:
        """Update 4pcheckmate to search the PV position."""
        l = 1
        if pv == self.current_pv:
            if pv == self.oldpv:
                print("> running")
                return
            else:
                print("> same")
                l = 0
        else:
            print("> new")
        self.oldpv = self.current_pv
        
        # Send stop, new position, go
        self.checkmate.send("stop")

        common = 0
        for a, b in zip(self.current_pv, pv):
            if a == b:
                common += 1
            else:
                break
        
        moves = ' '.join(pv[:common+l])
        
        # Get moves for the specific client, or use empty list for broadcast
        client_moves = []
        if client_id and client_id in self.made_moves:
            client_moves = self.made_moves[client_id]
        
        # Prepend client moves to the moves sent to 4pcheckmate
        pv_moves = pv[:common+l] if moves else []
        all_moves = client_moves + pv_moves
        all_moves_str = ' '.join(all_moves)
        
        if self.position == "startpos":
            self.checkmate.send(f"position startpos moves {all_moves_str}")
        elif self.position.startswith("fen "):
            self.checkmate.send(f"position {self.position} moves {all_moves_str}")
        else:
            self.checkmate.send(f"position fen {self.position} moves {all_moves_str}")
        
        self.checkmate.send("go")
        self.current_pv = pv
    
    async def run(self) -> None:
        """Main loop: process 4pchess output, mirror to 4pcheckmate."""
        self.running = True
        
        while self.running:
            # Process 4pchess output
            for line in self.chess.get_lines():
                print(f"[4pchess ->] {line}")
                
                # Parse PV info
                m = self.INFO_RE.match(line)
                if m:
                    pv_moves = m.group(1).strip().split()
                    # Update checkmate for all clients (could be optimized per-client)
                    await self.update_checkmate(pv_moves)
            
            # Show 4pchess errors
            for line in self.chess.get_errors():
                print(f"[4pchess ERR] {line}")
            
            # Show 4pcheckmate output and broadcast to all clients
            for line in self.checkmate.get_lines():
                print(f"[4pcheckmate ->] {line}")
                # Broadcast to all connected clients
                await self.broadcast_engine_output(line)
            
            # Show 4pcheckmate errors
            for line in self.checkmate.get_errors():
                print(f"[4pcheckmate ERR] {line}")
            
            # Sleep to reduce CPU usage when idle
            await asyncio.sleep(0.1)
    
    async def broadcast_engine_output(self, line: str):
        """Broadcast engine output to all connected clients."""
        if not self.nc:
            return
            
        # Parse engine output
        line = line.strip()
        
        if line.startswith("info "):
            # Parse info line
            info = {}
            parts = line[5:].split(" ")
            
            for i in range(0, len(parts)):
                key = parts[i]
                if key == "pv":
                    info["pv"] = parts[i+1:]
                    break
                elif i + 1 < len(parts):
                    val = parts[i + 1]
                    if key == "score":
                        info["score"] = int(val)
                    i += 1
            
            # Broadcast to all clients
            for client_id in self.made_moves.keys():
                await self.send_response(client_id, "info", info)
                
        elif line.startswith("depth "):
            # Parse depth line
            info = {}
            parts = line.split(" ")
            
            for i in range(0, len(parts), 2):
                if i + 1 < len(parts):
                    key = parts[i]
                    val = parts[i + 1]
                    if key in ["depth", "nps"]:
                        info[key] = int(val)
            
            # Broadcast to all clients
            for client_id in self.made_moves.keys():
                await self.send_response(client_id, "depth", info)
                
        elif line.startswith("bestmove "):
            move = line[9:].strip()
            # Broadcast to all clients
            for client_id in self.made_moves.keys():
                await self.send_response(client_id, "bestmove", {"move": move})
    
    async def stop(self) -> None:
        """Stop both engines and NATS connection."""
        self.running = False
        self.chess.send("stop")
        self.chess.quit()
        self.checkmate.quit()
        
        if self.nc:
            await self.nc.close()
            print("[Bridge] NATS connection closed")


async def main():
    for path, name in [(CHESS_CLI, "4pchess"), (CHECKMATE_CLI, "4pcheckmate")]:
        if not path.exists():
            print(f"Error: {name} not found: {path}", file=sys.stderr)
            sys.exit(1)
    
    # Get NATS URL from environment or use default
    nats_url = os.getenv('NATS_URL', 'nats://localhost:4222')
    
    bridge = PVBridge(CHESS_CLI, CHECKMATE_CLI, nats_url)
    bridge.set_position("startpos")
    bridge.set_depth(100)
    
    def handler(sig, frame):
        print("\n[Bridge] Stopping...")
        asyncio.create_task(bridge.stop())
        sys.exit(0)
    
    signal.signal(signal.SIGINT, handler)
    
    try:
        await bridge.connect_nats()
        print("[Bridge] Starting: position=startpos, depth=100")
        print("[Bridge] Ctrl+C to stop")
        print("[Bridge] Waiting for commands via NATS...")
        
        await bridge.run()
    except KeyboardInterrupt:
        print("\n[Bridge] Interrupted by user")
    except Exception as e:
        print(f"[Bridge] Error: {e}")
    finally:
        await bridge.stop()


if __name__ == "__main__":
    import os
    import time
    asyncio.run(main())
