# Hợp đồng giữa hai team và backend

## Trạng thái trò chơi

`GameState` là dataclass bất biến, `board` là tuple 9×9, 0: trống; 1: X; 2: O. Tọa độ `(row, col)` bắt đầu từ 0. X đi trước, `state.to_move` là bên đang tới lượt. `winner=None` đang chơi, `0` hòa, `1/2` thắng. Kiểm tra `winner is not None` (không dùng truthiness vì 0 là hòa).

- `state.legal_moves()` trả các ô hợp lệ, rỗng nếu terminal.
- `state.play(move)` trả trạng thái mới. Không sửa trạng thái gốc.
- `has_five(board, row, col)` kiểm tra ≥5 qua ô vừa đi, không có luật chặn hai đầu.

Các team có thể sử dụng bộ biểu diễn nội bộ tối ưu riêng (ví dụ bitboard, play/undo), nhưng phải có adapter sang giao diện trên, kiểm thử tính tương đương luật và không thay đổi trạng thái đầu vào.

## API thuật toán

```python
class MinimaxAgent:
    def choose_move(self, state: GameState, config: AgentConfig) -> SearchResult:
        ...
```

MCTSAgent có cùng signature. Giữ nguyên đường dẫn và tên class. Trả `SearchResult(move=(r,c), ...)`, có số liệu thực do thuật toán đếm; trường không áp dụng để None. Server tự đo elapsed_ms bằng perf_counter, không tính thời gian mạng. Không gọi HTTP từ thuật toán. Không phụ thuộc UI. Không giữ global mutable state. Nếu terminal, từ chối chọn nước (API đã chặn). Luôn trả nước hợp lệ khi nonterminal.

### Team A

- Cấu hình `depth`, `candidate_limit` (0 = không giới hạn), `pruning` (False = MiniMax thuần); nếu dùng radius/ordering bổ sung trường sau khi thống nhất.
- `SearchResult.nodes`, `cutoffs`, `depth`, `value`. Quy ước đếm nút cần ghi trong báo cáo (kể cả việc có tính gốc hay không).
- Giữ heuristic và ứng viên giống nhau khi chỉ đối chiếu Alpha-Beta bật/tắt; test thắng, chặn, hòa, terminal, bất biến đầu vào. Không để lọc ứng viên bỏ qua thắng ngay/chặn bắt buộc, trừ khi đang đối sánh baseline có ghi rõ.

### Team B

- Cấu hình `iterations`, `c`, `seed`; `rollout='random'` là baseline. Heuristic rollout là phần mở rộng, cần có test riêng trước khi bật.
- `SearchResult.iterations` là số iteration thực hiện. `nodes` chỉ điền nếu đã có quy ước đếm rõ ràng; không nhầm với lượt thăm.
- Bốn pha, UCT, chưa thăm, phần thưởng theo người vừa đi (hoặc quy ước nhất quán có tài liệu), chọn con theo visit count. Nếu truyền seed, tạo RNG cục bộ và dùng xuyên suốt một lần chọn nước; số liệu chạy cùng seed có thể tái lập (không cam kết thời gian giống nhau).
- Test qua trạng thái không terminal với ngân sách 100/300/500, nút chưa thăm, thắng/hòa/thua, chọn theo N và tính hợp lệ.

## Tích hợp HTTP

- `GET /api/agents` — danh sách thuật toán và cờ `ready`.
- `POST /api/move` — JSON `{board, player, algorithm, config}`. `algorithm` là `random`, `minimax` hoặc `mcts`.
- Trả JSON `{move, board, winner, to_move, metrics}`; metrics gồm elapsed_ms và tùy thuật toán nodes, cutoffs, iterations, depth, value.
- Server kiểm tra kích thước, mã quân, số quân, người đến lượt, thắng/hòa và nước trả về. Không xác minh đầy đủ lịch sử của mọi bàn cờ do client tự gửi (không phải hệ thống thi đấu bảo mật).
- Sau khi unit test của module đạt và PR được review, leader đổi `False` sang `True` trong registry; cập nhật test registry và API test tương ứng. Không đổi cờ khi agent còn stub.
