from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
from agent import agent
from typing import List, Dict, Optional, Any
import json
import asyncio


class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    stream: bool = True

app = FastAPI()

# 配置跨域（允许前端请求）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# AI聊天接口（POST请求，路径/chat）
@app.post("/chat")
async def chat(request: ChatRequest):
    user_message = request.messages
    print(f"用户发送：{user_message}")
    
    async def generate_response():
        # 流式生成响应
        content = ""
        for chunk in agent.stream({"messages": user_message}):
            if hasattr(chunk, 'content') and chunk.content:
                content += chunk.content
                # SSE 格式
                data = {
                    "choices": [{
                        "delta": {
                            "content": chunk.content
                        }
                    }]
                }
                yield f"data: {json.dumps(data)}\n\n"
                await asyncio.sleep(0.05)
        
        # 发送完成信号
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate_response(), media_type="text/event-stream")

# 启动服务
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
