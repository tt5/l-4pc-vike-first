#ifndef _PLAYER_H_
#define _PLAYER_H_

#include <cassert>
#include <cstdint>
#include <memory>
#include <optional>
#include <tuple>
#include <utility>
#include <vector>

#include "board.h"
#include "checkmate_table.h"
#include "transposition_table.h"

namespace chess {

constexpr int kMateValue = 1000000'00;  // mate value (centipawns)

class PVInfo {
 public:
  PVInfo() = default;

  const std::optional<Move>& GetBestMove() const { return best_move_; }
  std::shared_ptr<PVInfo> GetChild() const { return child_; }
  void SetBestMove(Move move) { best_move_ = std::move(move); }
  void SetChild(std::shared_ptr<PVInfo> child) { child_ = std::move(child); }
  int GetDepth() const;

  std::shared_ptr<PVInfo> Copy() const;

 private:
  std::optional<Move> best_move_ = std::nullopt;
  std::shared_ptr<PVInfo> child_ = nullptr;
};

constexpr size_t kTranspositionTableSize = 512'000;
constexpr int kMaxPly = 200;
constexpr int kKillersPerPly = 3;

struct PlayerOptions {
  // for search
  bool pvs = true;
  bool enable_transposition_table = true;
  bool enable_check_extensions = true;
  bool enable_singular_extensions = false;
  bool enable_aspiration_window = true;
  bool enable_probcut = true;

  // for move ordering
  bool enable_move_order = true;
  bool enable_move_order_checks = true;
  bool enable_history_heuristic = true;
  bool enable_killers = true;
  bool enable_counter_move_heuristic = true;

  // for evaluation
  bool enable_piece_activation = true;
  bool enable_king_safety = true;
  bool enable_pawn_shield = true;
  bool enable_attacking_king_zone = true;
  bool enable_mobility_evaluation = true;
  bool enable_piece_imbalance = true;
  bool enable_lazy_eval = true;
  bool enable_piece_square_table = true;
  bool enable_knight_bonus = true;
  Team engine_team = CURRENT_TEAM;

  // for pruning / reduction
  bool enable_futility_pruning = true;
  bool enable_late_move_reduction = true;
  bool enable_late_move_pruning =   true;
  bool enable_null_move_pruning =   true;

  // transposition table
  size_t transposition_table_size = kTranspositionTableSize;
  std::optional<int> max_search_depth;

  // checkmate discovery mode
  bool checkmate_discovery_mode = false;
  int max_checkmates_to_discover = 100;
  std::string checkmate_output_file = "checkmates.txt";
};

struct Stack {
  bool tt_pv = false;
  int move_count = 0;
  bool in_check = false;
  Move current_move;
  int root_depth = 0;
  int static_eval = 0;
  int extension_count = 0;
};

enum NodeType {
  NonPV,
  PV,
  Root,
};

constexpr size_t kBufferPartitionSize = 256; // number of elements per buffer partition
constexpr size_t kBufferNumPartitions = 500; // number of recursive calls

// Manages state of worker threads during search
class ThreadState {
 public:
  ThreadState(
      PlayerOptions options, const Board& board, const PVInfo& pv_info,
      TranspositionTable* transposition_table, int16_t* history_heuristic);
  ~ThreadState();
  ThreadState(const ThreadState&) = delete;
  ThreadState& operator=(const ThreadState&) = delete;
  ThreadState(ThreadState&& other) noexcept;
  ThreadState& operator=(ThreadState&& other) noexcept;
  Move* GetNextMoveBufferPartition();
  void ReleaseMoveBufferPartition();
  int* NThreats() { return n_threats; }
  int* TotalMoves() { return total_moves_; }
  PVInfo& GetPVInfo() { return pv_info_; }
  const Board& GetRootBoard() { return *root_board_; }

  int n_threats[4] = {0, 0, 0, 0};
  Move* GetMoveGenBuffer() { return move_gen_buffer_; }
  TranspositionTable* GetTranspositionTable() { return transposition_table_; }
  int16_t* GetHistoryHeuristic() { return history_heuristic_; }

 private:
  PlayerOptions options_;
  const Board* root_board_;
  PVInfo pv_info_;
  Move move_gen_buffer_[kBufferPartitionSize];  // Buffer for move generation
  TranspositionTable* transposition_table_;
  int16_t* history_heuristic_;

  // Buffer used to store moves per node.
  Move* move_buffer_ = nullptr;
  // Id within move_buffer_
  size_t buffer_id_ = 0;

  int total_moves_[4] = {0, 0, 0, 0};

};

class AlphaBetaPlayer {
 public:
  AlphaBetaPlayer(
      std::optional<PlayerOptions> options = std::nullopt);
  ~AlphaBetaPlayer();

  std::optional<std::tuple<int, std::optional<Move>, int>> MakeMove(
      Board& board,
      int max_depth = 100);
  void CancelEvaluation() { canceled_ = true; }
  // NOTE: Should wait until evaluation is done before resetting this to true.
  void SetCanceled(bool canceled) { canceled_ = canceled; }
  bool IsCanceled() { return canceled_; }
  const PVInfo& GetPVInfo() const { return pv_info_; }

  std::optional<std::tuple<int, std::optional<Move>>> Search(
      Stack* ss,
      NodeType node_type,
      ThreadState& thread_state,
      Board& board,
      int ply,
      int depth,
      int alpha,
      int beta,
      bool maximizing_player,
      PVInfo& pv_info,
      bool is_cut_node = false);


  int64_t GetNumEvaluations() { return num_nodes_; }
  int64_t GetNumCacheHits() { return num_cache_hits_; }
  int64_t GetNumFutilityMovesPruned() { return num_futility_moves_pruned_; }
  int64_t GetNumLmrSearches() { return num_lmr_searches_; }
  int64_t GetNumLmrResearches() { return num_lmr_researches_; }
  int64_t GetNumSingularExtensionSearches() {
    return num_singular_extension_searches_;
  }
  int64_t GetNumSingularExtensions() {
    return num_singular_extensions_;
  }

  int64_t GetNumLateMovesPruned() { return num_lm_pruned_; }
  int64_t GetNumFailHighReductions() { return num_fail_high_reductions_; }
  int64_t GetNumCheckExtensions() { return num_check_extensions_; }
  int64_t GetNumLazyEval() { return num_lazy_eval_; }

 private:

  std::optional<std::tuple<int, std::optional<Move>, int>>
    MakeMoveSingleThread(
      size_t thread_id,
      ThreadState& state,
      int max_depth = 20);

  std::unique_ptr<TranspositionTable> transposition_table_;
  std::unique_ptr<CheckmateTable> checkmate_table_;
  int16_t history_heuristic_[2][224][224] = {0};

  void ResetMobilityScores(ThreadState& thread_state, Board& board);
  void UpdateMobilityEvaluation(ThreadState& thread_state, Board& board, Player turn);

  int64_t num_nodes_ = 0; // debugging
  int64_t num_cache_hits_ = 0;
  int64_t num_futility_moves_pruned_ = 0;
  int64_t num_lmr_searches_ = 0;
  int64_t num_lmr_researches_ = 0;
  int64_t num_singular_extension_searches_ = 0;
  int64_t num_singular_extensions_ = 0;
  int64_t num_lm_pruned_ = 0;
  int64_t num_fail_high_reductions_ = 0;
  int64_t num_check_extensions_ = 0;
  int64_t num_lazy_eval_ = 0;

  bool canceled_ = false;
  PlayerOptions options_;

  PVInfo pv_info_;

  int64_t last_board_key_ = 0;

  // Aspiration window variables
  int average_root_eval_ = 0;
  int asp_nobs_ = 0;
  int asp_sum_sq_ = 0;
  int asp_sum_ = 0;

  Team root_team_ = NO_TEAM;

};

}  // namespace chess

#endif  // _PLAYER_H_