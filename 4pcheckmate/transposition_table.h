#ifndef _TRANSPOSITION_TABLE_H_
#define _TRANSPOSITION_TABLE_H_

#include <atomic>
#include <cstdint>
#include <memory>
#include <optional>

#include "board.h"

namespace chess {

constexpr int value_none_tt = -119988;

enum ScoreBound {
  EXACT = 0, LOWER_BOUND = 1, UPPER_BOUND = 2,
};

struct HashTableEntry {
  int64_t key;            // 8 bytes - full Zobrist hash
  Move move;              // Full move object (no packing)
  int16_t score;          // 2 bytes - packed score (mate scores encoded)
  int8_t eval;            // 1 byte - static evaluation (clamped to ±127 centipawns)
  uint8_t gen_depth;      // 1 byte - generation (bits 6-7) + depth (bits 0-5, max 63)
  uint8_t bound_is_pv;    // 1 byte - bound (bits 0-1) + is_pv (bit 2) + has_move (bit 3)

  // Accessors for packed fields
  int GetScore() const;
  void SetScore(int s);

  uint8_t depth() const { return gen_depth & 0x3F; }  // Lower 6 bits
  void set_depth(uint8_t d) { gen_depth = (gen_depth & 0xC0) | (d & 0x3F); }

  uint8_t generation() const { return gen_depth >> 6; }  // Upper 2 bits
  void set_generation(uint8_t g) { gen_depth = (gen_depth & 0x3F) | ((g & 0x3) << 6); }

  ScoreBound bound() const {
    return static_cast<ScoreBound>(bound_is_pv & 0x3);
  }
  void set_bound(ScoreBound b) {
    bound_is_pv = (bound_is_pv & ~0x3) | (static_cast<uint8_t>(b) & 0x3);
  }

  bool is_pv() const {
    return (bound_is_pv >> 2) & 0x1;
  }
  void set_is_pv(bool pv) {
    bound_is_pv = (bound_is_pv & ~(1 << 2)) | (static_cast<uint8_t>(pv) << 2);
  }

  bool has_move() const {
    return (bound_is_pv >> 3) & 0x1;
  }
  void set_has_move(bool has) {
    bound_is_pv = (bound_is_pv & ~(1 << 3)) | (static_cast<uint8_t>(has) << 3);
  }
};

static_assert(sizeof(HashTableEntry) > 16, "TT entry must be larger than 16 bytes");

class TranspositionTable {
 public:
   TranspositionTable(size_t table_size);

   const HashTableEntry* Get(int64_t key);
   void Save(int64_t key, int depth, std::optional<Move> move,
             int score, int eval, ScoreBound bound, bool is_pv);
   void NewSearch();
   void Merge(const TranspositionTable& source);

  ~TranspositionTable() {
    if (hash_table_ != nullptr) {
      free(hash_table_);
    }
  }

 private:
  HashTableEntry* hash_table_ = nullptr;
  size_t table_size_ = 0;
  uint8_t generation_ = 0;
};


}  // namespace chess

#endif  // _TRANSPOSITION_TABLE_H_