#ifndef _CHECKMATE_TABLE_H_
#define _CHECKMATE_TABLE_H_

#include <cstddef>
#include <cstdint>

namespace chess {

struct CheckmateEntry {
  int64_t key;  // 0 = empty slot
};

class CheckmateTable {
 public:
  explicit CheckmateTable(size_t num_entries);
  ~CheckmateTable();

  CheckmateTable(const CheckmateTable&) = delete;
  CheckmateTable& operator=(const CheckmateTable&) = delete;

  __attribute__((always_inline))
  bool Contains(int64_t key) const {
    size_t idx = key & mask_;
    return table_[idx].key == key;
  }

  void Insert(int64_t key);

  size_t Size() const { return size_; }

 private:
  CheckmateEntry* table_ = nullptr;
  size_t size_ = 0;
  size_t mask_ = 0;
  int fd_ = -1;
  static constexpr const char* kShmName = "/4pchess_checkmates";
};

}  // namespace chess

#endif  // _CHECKMATE_TABLE_H_
