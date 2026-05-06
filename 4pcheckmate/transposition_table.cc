#include "transposition_table.h"

#include <cstring>

namespace chess {

TranspositionTable::TranspositionTable(size_t num_entries) {
  // Round up to power of 2 for bitmask hashing
  size_ = 1;
  while (size_ < num_entries) {
    size_ <<= 1;
  }
  mask_ = size_ - 1;

  table_ = new TranspositionEntry[size_];
  // Zero-initialize
  Clear();
}

TranspositionTable::~TranspositionTable() {
  delete[] table_;
}

void TranspositionTable::Clear() {
  for (size_t i = 0; i < size_; ++i) {
    table_[i].hash = 0;
    table_[i].from_coord = 0;
    table_[i].to_coord = 0;
    table_[i].eval = 0;
  }
}

}  // namespace chess
