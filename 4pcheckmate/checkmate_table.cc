#include "checkmate_table.h"

#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <cassert>
#include <cstring>

namespace chess {

CheckmateTable::CheckmateTable(size_t num_entries) {
  // Round up to power of 2 for bitmask hashing
  size_ = 1;
  while (size_ < num_entries) {
    size_ <<= 1;
  }
  mask_ = size_ - 1;

  size_t bytes = size_ * sizeof(CheckmateEntry);

  fd_ = shm_open(kShmName, O_RDWR | O_CREAT, 0666);
  assert(fd_ >= 0 && "Failed to open shared memory");

  // Extend to required size
  int result = ftruncate(fd_, bytes);
  assert(result == 0 && "Failed to resize shared memory");

  table_ = (CheckmateEntry*)mmap(nullptr, bytes, PROT_READ | PROT_WRITE,
                                  MAP_SHARED, fd_, 0);
  assert(table_ != MAP_FAILED && "Failed to mmap shared memory");

  // Initialize to zero if newly created (optional - first use will see 0s)
  // This is a one-time cost; subsequent opens will preserve existing data
}

CheckmateTable::~CheckmateTable() {
  if (table_ != nullptr) {
    size_t bytes = size_ * sizeof(CheckmateEntry);
    munmap(table_, bytes);
  }
  if (fd_ >= 0) {
    close(fd_);
  }
  // Note: We don't shm_unlink here - the table persists for external updater
}

void CheckmateTable::Insert(int64_t key) {
  size_t idx = key & mask_;

  // Linear probing with atomic compare-and-swap
  for (size_t probe = 0; probe < size_; ++probe) {
    size_t slot = (idx + probe) & mask_;
    int64_t expected = 0;

    // Try to claim empty slot atomically
    if (__atomic_compare_exchange_n(&table_[slot].key, &expected, key,
                                    false, __ATOMIC_SEQ_CST, __ATOMIC_RELAXED)) {
      return;  // Successfully inserted
    }

    // Check if already present
    if (table_[slot].key == key) {
      return;  // Already in table
    }
  }

  // Table is full - this shouldn't happen if sized appropriately
  // In production, you might want to log this or handle gracefully
}

}  // namespace chess
