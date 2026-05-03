#ifndef _BLOOM_FILTER_H_
#define _BLOOM_FILTER_H_

#include <cstddef>
#include <cstdint>

namespace chess {

class BloomFilter {
 public:
  explicit BloomFilter(size_t num_bytes);
  ~BloomFilter();

  BloomFilter(const BloomFilter&) = delete;
  BloomFilter& operator=(const BloomFilter&) = delete;

  __attribute__((always_inline))
  bool MaybeContains(int64_t key) const {
    // Extract 3 positions from the 64-bit hash
    // Using 21-bit chunks to spread across 4MB (33.5M bits)
    uint32_t h1 = static_cast<uint32_t>(key);
    uint32_t h2 = static_cast<uint32_t>(key >> 21);
    uint32_t h3 = static_cast<uint32_t>(key >> 42);

    size_t idx1 = h1 & mask_;
    size_t idx2 = h2 & mask_;
    size_t idx3 = h3 & mask_;

    // Check all 3 bits - only return true if all are set
    return (bits_[idx1 >> 3] & (1 << (idx1 & 7))) &&
           (bits_[idx2 >> 3] & (1 << (idx2 & 7))) &&
           (bits_[idx3 >> 3] & (1 << (idx3 & 7)));
  }

  void Add(int64_t key);

  size_t Size() const { return num_bits_; }

 private:
  uint8_t* bits_ = nullptr;
  size_t num_bits_ = 0;
  size_t mask_ = 0;
  int fd_ = -1;
  static constexpr const char* kShmName = "/4pchess_bloom";
};

}  // namespace chess

#endif  // _BLOOM_FILTER_H_
