#ifndef _TRANSPOSITION_TABLE_H_
#define _TRANSPOSITION_TABLE_H_

#include <cstddef>
#include <cstdint>

namespace chess {

// 16-byte transposition table entry
// Layout: [hash: 8 bytes][from: 1 byte][to: 1 byte][eval: 2 bytes][padding: 4 bytes]
struct __attribute__((packed)) TranspositionEntry {
  int64_t hash;        // Board hash key (8 bytes)
  int8_t from_coord;   // From coordinate: (row << 4) | col (1 byte)
  int8_t to_coord;     // To coordinate: (row << 4) | col (1 byte)
  int16_t eval;        // Evaluation score in centipawns (2 bytes)
  // 4 bytes padding to reach 16 bytes total
  int8_t pad[4];

  TranspositionEntry() : hash(0), from_coord(0), to_coord(0), eval(0), pad{0, 0, 0, 0} {}
};

static_assert(sizeof(TranspositionEntry) == 16, "TranspositionEntry must be exactly 16 bytes");

class TranspositionTable {
 public:
  explicit TranspositionTable(size_t num_entries);
  ~TranspositionTable();

  TranspositionTable(const TranspositionTable&) = delete;
  TranspositionTable& operator=(const TranspositionTable&) = delete;

  // Probe the table. Returns true if hit, fills out params.
  __attribute__((always_inline))
  bool Probe(int64_t hash, int16_t* eval, int8_t* from_coord, int8_t* to_coord) const {
    size_t idx = hash & mask_;
    const TranspositionEntry& entry = table_[idx];
    if (entry.hash == hash) {
      *eval = entry.eval;
      *from_coord = entry.from_coord;
      *to_coord = entry.to_coord;
      return true;
    }
    return false;
  }

  // Store a new entry. Always replaces on collision (no probing).
  __attribute__((always_inline))
  void Store(int64_t hash, int16_t eval, int8_t from_coord, int8_t to_coord) {
    size_t idx = hash & mask_;
    TranspositionEntry& entry = table_[idx];
    entry.hash = hash;
    entry.eval = eval;
    entry.from_coord = from_coord;
    entry.to_coord = to_coord;
  }

  size_t Size() const { return size_; }

  void Clear();

 private:
  TranspositionEntry* table_ = nullptr;
  size_t size_ = 0;
  size_t mask_ = 0;
};

}  // namespace chess

#endif  // _TRANSPOSITION_TABLE_H_
