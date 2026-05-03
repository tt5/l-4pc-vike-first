#include "bloom_filter.h"

#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <cassert>
#include <cstring>

namespace chess {

BloomFilter::BloomFilter(size_t num_bytes) {
  // Round up to power of 2 for bitmask hashing
  size_t bytes = 1;
  while (bytes < num_bytes) {
    bytes <<= 1;
  }
  num_bits_ = bytes * 8;
  mask_ = num_bits_ - 1;

  fd_ = shm_open(kShmName, O_RDWR | O_CREAT, 0666);
  assert(fd_ >= 0 && "Failed to open shared memory for bloom filter");

  // Extend to required size
  int result = ftruncate(fd_, bytes);
  assert(result == 0 && "Failed to resize shared memory for bloom filter");

  bits_ = (uint8_t*)mmap(nullptr, bytes, PROT_READ | PROT_WRITE,
                        MAP_SHARED, fd_, 0);
  assert(bits_ != MAP_FAILED && "Failed to mmap shared memory for bloom filter");
}

BloomFilter::~BloomFilter() {
  if (bits_ != nullptr) {
    size_t bytes = num_bits_ / 8;
    munmap(bits_, bytes);
  }
  if (fd_ >= 0) {
    close(fd_);
  }
  // Note: We don't shm_unlink here - the filter persists for external updater
}

void BloomFilter::Add(int64_t key) {
  // Extract 3 positions from the 64-bit hash
  uint32_t h1 = static_cast<uint32_t>(key);
  uint32_t h2 = static_cast<uint32_t>(key >> 21);
  uint32_t h3 = static_cast<uint32_t>(key >> 42);

  size_t idx1 = h1 & mask_;
  size_t idx2 = h2 & mask_;
  size_t idx3 = h3 & mask_;

  // Set bits atomically using OR
  __atomic_fetch_or(&bits_[idx1 >> 3], static_cast<uint8_t>(1 << (idx1 & 7)), __ATOMIC_RELAXED);
  __atomic_fetch_or(&bits_[idx2 >> 3], static_cast<uint8_t>(1 << (idx2 & 7)), __ATOMIC_RELAXED);
  __atomic_fetch_or(&bits_[idx3 >> 3], static_cast<uint8_t>(1 << (idx3 & 7)), __ATOMIC_RELAXED);
}

}  // namespace chess
