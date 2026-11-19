# Caro AI Lab

Bài tập lớn môn Trí tuệ nhân tạo — UET. Web app Caro 9×9, React + TypeScript + Vite + các component shadcn/ui (Tailwind CSS 3); backend Python + FastAPI.

## Trạng thái bản khởi đầu

- Game Engine bất biến, luật ≥5 quân liên tiếp, Random Agent, API và giao diện chơi cờ đã có mã nguồn.
- MiniMax và MCTS là hai module chưa triển khai. UI cho phép xem cấu hình, nhưng không chạy thuật toán chưa tích hợp; không dùng thuật toán giả mạo.
- Backend đã có bộ kiểm thử. Frontend cần cài npm packages và build trên máy có kết nối Internet. Thư viện biểu đồ / framework thực nghiệm chưa được triển khai trong bản này.

## Chạy tại máy cá nhân

Cần Python 3.11+ (khuyến nghị 3.13 nếu team thống nhất), Node.js 22 LTS, Git. Mở hai terminal ở thư mục gốc.

Terminal 1 (PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Terminal 2 (PowerShell):

```powershell
cd frontend
npm install
npm run build
npm run dev
```

Mở địa chỉ Vite in ra (mặc định http://localhost:5173). OpenAPI: http://127.0.0.1:8000/docs. Vite proxy `/api` tới port 8000. Commit `frontend/package-lock.json` sau lần `npm install` đầu tiên. Không commit `.venv`, `node_modules`.

Để kiểm tra UI lúc chưa có đủ thuật toán, chọn Random cho phía máy. Có thể chơi Người vs Máy hoặc Máy vs Máy; bấm Tạm dừng, Tiếp tục, Trận mới. Nút Bắt đầu không bật nếu một thuật toán chưa sẵn sàng. Thiết lập mỗi loại thuật toán dùng chung cho hai phía trong cùng trận; muốn so sánh hai cấu hình của cùng một thuật toán sẽ triển khai ở runner thực nghiệm hoặc mở rộng UI sau.

## Cấu trúc và trách nhiệm

- `backend/app/core/`: GameState và luật dùng chung — leader.
- `backend/app/agents/base.py`: giao diện thuật toán — cả hai team thống nhất, leader review.
- `backend/app/agents/minimax/`: Team A.
- `backend/app/agents/mcts/`: Team B.
- `backend/app/agents/registry.py`, `backend/app/main.py`: leader tích hợp.
- `backend/tests/`: mỗi team thêm file test riêng.
- `frontend/`: leader; mã nguồn component UI, màn hình chơi, cấu hình, thống kê, HTTP client.
- `experiments/`: runner và dữ liệu thực nghiệm sẽ triển khai sau khi chốt interface.

Đọc `docs/AGENT_CONTRACT.md` trước khi bắt đầu lập trình.

## Git workflow

Leader tạo repo riêng tư trên GitHub, khởi tạo main từ bộ mã nguồn này. Sau khi push, tạo branch develop và các branch `feature/minimax`, `feature/mcts`, `feature/frontend` từ develop. Mỗi team mở PR vào develop, không chỉnh module của nhau khi chưa thống nhất. Chỉ merge vào main sau khi tích hợp và kiểm thử. Không đưa binary hoặc kết quả thực nghiệm không có nguồn vào repo.
