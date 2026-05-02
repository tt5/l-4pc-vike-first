# uci

```bash
rlwrap ./cli
go
stop
move h2-h3
stop
undo
go
quit
```

`d`

# fen

<Player>-<Eliminated>-<Kingside>-<Queenside>-<Points>-<Halfmove>-<Enpassant>-<Pieces>

En passant format: 4 comma-separated target squares (one per player: Red,Blue,Yellow,Green), use `-` for none.

```
position startpos
position startpos moves <from>-<to> <from>-<to>
position fen R-XXXX-KQkq-KQkq-0-0-e3,-,f6,--<pieces>
position fen R-XXXX-KQkq-KQkq-0-0-e3,-,f6,--<pieces> moves <from>-<to> <from>-<to>
```
