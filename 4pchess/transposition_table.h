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

#pragma pack(push, 1)
struct HashTableEntry {
  int64_t key;            // 8 bytes - full Zobrist hash
  uint32_t packed_move;   // 4 bytes - move (bits 0-20) + bound/is_pv (bits 21-23)
  int16_t score;          // 2 bytes - packed score (mate scores encoded)
  int8_t eval;            // 1 byte - static evaluation (clamped to ±127 centipawns)
  uint8_t gen_depth;      // 1 byte - generation (bits 6-7) + depth (bits 0-5, max 63)

  // Accessors for packed fields (for compatibility with existing search code)
  int GetScore() const;
  void SetScore(int s);

  uint8_t depth() const { return gen_depth & 0x3F; }  // Lower 6 bits
  void set_depth(uint8_t d) { gen_depth = (gen_depth & 0xC0) | (d & 0x3F); }

  uint8_t generation() const { return gen_depth >> 6; }  // Upper 2 bits
  void set_generation(uint8_t g) { gen_depth = (gen_depth & 0x3F) | ((g & 0x3) << 6); }

  ScoreBound bound() const {
    return static_cast<ScoreBound>((packed_move >> 21) & 0x3);
  }
  void set_bound(ScoreBound b) {
    packed_move = (packed_move & ~(0x3 << 21)) | (static_cast<uint32_t>(b) << 21);
  }

  bool is_pv() const {
    return (packed_move >> 23) & 0x1;
  }
  void set_is_pv(bool pv) {
    packed_move = (packed_move & ~(1 << 23)) | (static_cast<uint32_t>(pv) << 23);
  }
};
#pragma pack(pop)

static_assert(sizeof(HashTableEntry) == 16, "TT entry must be exactly 16 bytes");

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