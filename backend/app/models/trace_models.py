
from pydantic import BaseModel
from typing import Any, Optional
from enum import Enum

class DSOperation(str, Enum):
    # Stack operations
    STACK_PUSH = "stack_push"
    STACK_POP = "stack_pop"
    STACK_PEEK = "stack_peek"
    
    # Array operations
    ARRAY_ACCESS = "array_access"
    ARRAY_SET = "array_set"
    ARRAY_APPEND = "array_append"
    ARRAY_REMOVE = "array_remove"
    ARRAY_SWAP = "array_swap"
    
    # Linked List
    LL_INSERT = "ll_insert"
    LL_DELETE = "ll_delete"
    LL_TRAVERSE = "ll_traverse"
    
    # Tree
    TREE_INSERT = "tree_insert"
    TREE_DELETE = "tree_delete"
    TREE_TRAVERSE = "tree_traverse"
    
    # HashMap
    MAP_PUT = "map_put"
    MAP_GET = "map_get"
    MAP_DELETE = "map_delete"
    
    # Queue
    QUEUE_ENQUEUE = "queue_enqueue"
    QUEUE_DEQUEUE = "queue_dequeue"
    
    # Graph
    GRAPH_ADD_EDGE = "graph_add_edge"
    GRAPH_VISIT = "graph_visit"
    
    # Variables
    VAR_ASSIGN = "var_assign"
    VAR_COMPARE = "var_compare"
    
    # Control flow
    CONDITION_CHECK = "condition_check"
    LOOP_ITERATION = "loop_iteration"
    FUNCTION_CALL = "function_call"
    FUNCTION_RETURN = "function_return"


class TraceStep(BaseModel):
    step_number: int
    line_number: int
    code_line: str                          # The actual line of code
    operation: DSOperation
    data_structure_type: str                # "stack", "array", "tree", etc.
    data_structure_id: str                  # Unique ID for this DS instance
    data_structure_state: Any               # Current state after operation
    operation_details: dict                 # e.g., {"value": 5, "index": 2}
    variables: dict[str, Any]               # All variable states
    call_stack: list[str]                   # Current function call stack
    highlight_elements: list[int | str]     # Which elements to highlight
    explanation: str                         # Human-readable explanation
    stdout: str                             # Any print output


class ExecutionTrace(BaseModel):
    success: bool
    error: Optional[str] = None
    total_steps: int
    steps: list[TraceStep]
    data_structures_used: list[str]         # ["stack", "array"]
    final_output: Any
    time_complexity_hint: Optional[str] = None


class ExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    test_case: str                          # Input test case
    function_name: Optional[str] = None     # Entry function