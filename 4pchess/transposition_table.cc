#include <cassert>
#include <optional>
#include <iostream>

#include "transposition_table.h"
#include "player.h"

namespace chess {

// Score packing constants for int16_t storage
constexpr int kMateScoreBase = 30000;
constexpr int kMaxStoredScore = 32700;

int HashTableEntry::GetScore() const {
  int s = score;
  if (s >= kMateScoreBase - 1000) {
    return kMateValue - (kMateScoreBase - s);
  } else if (s <= -kMateScoreBase + 1000) {
    return -kMateValue + (-kMateScoreBase - s);
  }
  return s;
}

void HashTableEntry::SetScore(int s) {
  if (s >= kMateValue - 1000) {
    int distance = kMateValue - s;
    score = static_cast<int16_t>(kMateScoreBase - distance);
  } else if (s <= -kMateValue + 1000) {
    int distance = -kMateValue - s;
    score = static_cast<int16_t>(-kMateScoreBase - distance);
  } else {
    if (s > kMaxStoredScore) s = kMaxStoredScore;
    if (s < -kMaxStoredScore) s = -kMaxStoredScore;
    score = static_cast<int16_t>(s);
  }
}

TranspositionTable::TranspositionTable(size_t table_size) {
  assert((table_size > 0) && "transposition table_size = 0");
  // Round up to next power of 2 for bitmask hashing
  table_size_ = 1;
  while (table_size_ < table_size) {
    table_size_ <<= 1;
  }
  //hash_table_ = (HashTableEntry*) malloc(table_size_ * sizeof(HashTableEntry));
  hash_table_ = (HashTableEntry*) calloc(table_size_, sizeof(HashTableEntry));
  assert(
      (hash_table_ != nullptr) && 
      "Can't create transposition table. Try using a smaller size.");
}

const HashTableEntry* TranspositionTable::Get(int64_t key) {
  size_t n = key & (table_size_ - 1);
  HashTableEntry* entry = hash_table_ + n;
  if (entry->key == key) {
    return entry;
  }
  return nullptr;
}

void TranspositionTable::Save(
    int64_t key, int depth, std::optional<Move> move, int score, int eval,
    ScoreBound bound, bool is_pv) {
  size_t n = key & (table_size_ - 1);
  HashTableEntry& entry = hash_table_[n];
  
  // Check if we should replace this entry
  const uint8_t current_depth = entry.gen_depth & 0x3F;
  const uint8_t current_generation = entry.gen_depth >> 6;
  
  const bool should_replace = 
      bound == EXACT ||
      entry.key == 0 ||
      entry.key == key ||
      current_depth <= static_cast<uint8_t>(depth) ||
      current_generation != generation_;
      
  if (!should_replace) {
    return;
  }
  
  // Direct field writes with bit manipulation
  entry.key = key;
  entry.gen_depth = (generation_ << 6) | (static_cast<uint8_t>(depth) & 0x3F);
  
  // Pack bound, is_pv, and has_move flags
  uint8_t bound_flags = (static_cast<uint8_t>(bound) & 0x3) |
                        (static_cast<uint8_t>(is_pv) << 2);
  if (move.has_value()) {
    entry.move = move.value();
    bound_flags |= 0x08; // set has_move bit
  }
  entry.bound_is_pv = bound_flags;
  
  entry.SetScore(score);
  entry.eval = static_cast<int8_t>(eval);
}

void TranspositionTable::NewSearch() {
  generation_++;
}

void TranspositionTable::Merge(const TranspositionTable& source) {
  // Iterate through all entries in source table
  for (size_t i = 0; i < source.table_size_; i++) {
    const HashTableEntry& src_entry = source.hash_table_[i];
    // Only merge valid entries (non-zero key indicates valid entry)
    if (src_entry.key != 0) {
      size_t n = src_entry.key & (table_size_ - 1);
      HashTableEntry& entry = hash_table_[n];
      // Only add completely new entries - don't touch existing entries
      if (entry.key == 0) {
        entry.key = src_entry.key;
        entry.gen_depth = src_entry.gen_depth;  // Copy packed depth+generation
        entry.bound_is_pv = src_entry.bound_is_pv;  // Copy bound/is_pv/has_move flags
        entry.move = src_entry.move;
        entry.score = src_entry.score;
        entry.eval = src_entry.eval;
        entry.set_generation(generation_);
      }
    }
  }
}

}  // namespace chess