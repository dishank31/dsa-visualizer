# backend/app/routers/execute.py — Updated

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import time

router = APIRouter()


class ExecuteRequest(BaseModel):
    code: str
    test_case: str
    function_name: Optional[str] = None
    language: str = "python"    # "python" | "cpp"
    max_steps: int = 5000


@router.post("/api/execute")
async def execute_code(request: ExecuteRequest):

    # ── Security checks ───────────────────────────────────────────────────

    if len(request.code) > 50000:
        raise HTTPException(400, "Code too long")

    start = time.time()

    # ── Route to correct executor ─────────────────────────────────────────

    if request.language == "python":
        from ..services.tracer_v2 import SysTracer
        tracer = SysTracer()
        tracer.max_steps = request.max_steps

        result = tracer.execute(
            source_code=request.code,
            test_input=request.test_case,
            function_name=request.function_name
        )

    elif request.language == "cpp":
        from ..services.cpp_executor import CppExecutor
        executor = CppExecutor()

        result = executor.execute(
            source_code=request.code,
            test_case=request.test_case,
            function_name=request.function_name
        )

    else:
        raise HTTPException(400, f"Unsupported language: {request.language}")

    # ── Return normalized response ────────────────────────────────────────

    result['execution_time_ms'] = round((time.time() - start) * 1000, 2)
    return result