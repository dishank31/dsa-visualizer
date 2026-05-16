# backend/app/services/tracer.py

import sys
import copy
import json
from typing import Any
from io import StringIO
from ..models.trace_models import TraceStep, ExecutionTrace, DSOperation


class DSATracer:
    """
    Core tracing engine. Executes instrumented code and captures
    every operation as a TraceStep.
    """
    
    def __init__(self):
        self.steps: list[TraceStep] = []
        self.step_counter = 0
        self.stdout_capture = StringIO()
        self.call_stack: list[str] = ["main"]
        self.data_structures: dict[str, dict] = {}
        self.source_lines: list[str] = []
    
    def _detect_ds_type(self, obj: Any, var_name: str) -> str:
        """Detect what kind of data structure a variable is"""
        if isinstance(obj, list):
            # Heuristic: if used with append/pop, it's a stack
            # This gets refined based on operations observed
            return "array"  # Default, refined later
        elif isinstance(obj, dict):
            return "hashmap"
        elif isinstance(obj, set):
            return "set"
        elif hasattr(obj, 'val') and (hasattr(obj, 'left') or hasattr(obj, 'right')):
            return "tree"
        elif hasattr(obj, 'val') and hasattr(obj, 'next'):
            return "linked_list"
        return "variable"
    
    def _serialize_value(self, value: Any, depth: int = 0) -> Any:
        """Safely serialize any value for JSON"""
        if depth > 10:
            return "..."
        
        if value is None:
            return None
        elif isinstance(value, (int, float, str, bool)):
            return value
        elif isinstance(value, list):
            return [self._serialize_value(v, depth + 1) for v in value]
        elif isinstance(value, dict):
            return {
                str(k): self._serialize_value(v, depth + 1) 
                for k, v in value.items()
            }
        elif isinstance(value, set):
            return list(value)
        elif isinstance(value, tuple):
            return list(value)
        # Handle TreeNode, ListNode etc.
        elif hasattr(value, '__dict__'):
            return {
                k: self._serialize_value(v, depth + 1) 
                for k, v in value.__dict__.items()
                if not k.startswith('_')
            }
        return str(value)
    
    def _capture_variables(self, local_vars: dict) -> dict:
        """Capture all variable states, filtering out internals"""
        captured = {}
        skip_names = {
            '__trace__', '__trace_pre__', '__trace_post__',
            '__builtins__', '__name__', '__doc__'
        }
        
        for name, value in local_vars.items():
            if name.startswith('__') and name in skip_names:
                continue
            try:
                captured[name] = self._serialize_value(value)
            except Exception:
                captured[name] = str(value)
        
        return captured
    
    def trace(self, operation: str, line_number: int, local_vars: dict):
        """Main trace callback injected into user code"""
        self.step_counter += 1
        
        variables = self._capture_variables(local_vars)
        code_line = ""
        if 0 < line_number <= len(self.source_lines):
            code_line = self.source_lines[line_number - 1].strip()
        
        step = TraceStep(
            step_number=self.step_counter,
            line_number=line_number,
            code_line=code_line,
            operation=self._map_operation(operation),
            data_structure_type=self._infer_ds_from_operation(operation),
            data_structure_id="main",
            data_structure_state=self._get_ds_state(local_vars, operation),
            operation_details={"raw_operation": operation},
            variables=variables,
            call_stack=list(self.call_stack),
            highlight_elements=[],
            explanation=self._generate_explanation(operation, code_line, variables),
            stdout=self.stdout_capture.getvalue()
        )
        
        self.steps.append(step)
    
    def trace_pre(self, operation: str, obj_name: str, 
                  line_number: int, local_vars: dict):
        """Called before a DS operation - captures the intent"""
        # Store pre-state for comparison
        if obj_name in local_vars:
            self.data_structures[obj_name] = {
                'pre_state': copy.deepcopy(local_vars[obj_name]),
                'type': self._detect_ds_type(local_vars[obj_name], obj_name)
            }
    
    def trace_post(self, operation: str, obj_name: str, 
                   line_number: int, local_vars: dict):
        """Called after a DS operation - captures the result"""
        self.step_counter += 1
        
        variables = self._capture_variables(local_vars)
        code_line = ""
        if 0 < line_number <= len(self.source_lines):
            code_line = self.source_lines[line_number - 1].strip()
        
        # Determine what changed
        pre_state = None
        ds_type = "array"
        if obj_name in self.data_structures:
            pre_state = self.data_structures[obj_name].get('pre_state')
            ds_type = self.data_structures[obj_name].get('type', 'array')
        
        current_state = self._serialize_value(
            local_vars.get(obj_name)
        )
        
        # Figure out highlight elements
        highlights = self._compute_highlights(
            pre_state, local_vars.get(obj_name), operation
        )
        
        # Refine DS type based on operation
        if operation in ('stack_push', 'stack_pop'):
            ds_type = "stack"
        elif operation in ('queue_enqueue', 'queue_dequeue'):
            ds_type = "queue"
        
        step = TraceStep(
            step_number=self.step_counter,
            line_number=line_number,
            code_line=code_line,
            operation=self._map_operation(operation),
            data_structure_type=ds_type,
            data_structure_id=obj_name,
            data_structure_state=current_state,
            operation_details={
                "obj_name": obj_name,
                "pre_state": self._serialize_value(pre_state),
                "post_state": current_state,
            },
            variables=variables,
            call_stack=list(self.call_stack),
            highlight_elements=highlights,
            explanation=self._generate_explanation(
                operation, code_line, variables
            ),
            stdout=self.stdout_capture.getvalue()
        )
        
        self.steps.append(step)
    
    def _compute_highlights(self, pre_state, post_state, operation) -> list:
        """Determine which elements to highlight in the visualization"""
        if isinstance(post_state, list):
            if operation == 'stack_push' and isinstance(pre_state, list):
                return [len(post_state) - 1]  # Highlight newly pushed element
            elif operation == 'stack_pop' and isinstance(pre_state, list):
                return [len(pre_state) - 1]  # Highlight popped position
        return []
    
    def _map_operation(self, op_str: str) -> DSOperation:
        """Map string operation to enum"""
        mapping = {
            'var_assign': DSOperation.VAR_ASSIGN,
            'stack_push': DSOperation.STACK_PUSH,
            'stack_pop': DSOperation.STACK_POP,
            'array_access': DSOperation.ARRAY_ACCESS,
            'array_insert': DSOperation.ARRAY_SET,
            'loop_iteration': DSOperation.LOOP_ITERATION,
            'condition_true': DSOperation.CONDITION_CHECK,
            'condition_false': DSOperation.CONDITION_CHECK,
            'function_return': DSOperation.FUNCTION_RETURN,
            'function_call': DSOperation.FUNCTION_CALL,
            'expression': DSOperation.VAR_ASSIGN,
            'queue_enqueue': DSOperation.QUEUE_ENQUEUE,
            'queue_dequeue': DSOperation.QUEUE_DEQUEUE,
            'map_put': DSOperation.MAP_PUT,
            'map_get': DSOperation.MAP_GET,
        }
        return mapping.get(op_str, DSOperation.VAR_ASSIGN)
    
    def _infer_ds_from_operation(self, operation: str) -> str:
        """Infer data structure type from operation name"""
        if 'stack' in operation:
            return 'stack'
        elif 'queue' in operation:
            return 'queue'
        elif 'array' in operation:
            return 'array'
        elif 'map' in operation or 'hash' in operation:
            return 'hashmap'
        elif 'tree' in operation:
            return 'tree'
        elif 'graph' in operation:
            return 'graph'
        elif 'll' in operation or 'linked' in operation:
            return 'linked_list'
        return 'variable'
    
    def _get_ds_state(self, local_vars: dict, operation: str) -> Any:
        """Get current state of relevant data structures"""
        states = {}
        for name, value in local_vars.items():
            if name.startswith('__'):
                continue
            if isinstance(value, (list, dict, set)):
                states[name] = self._serialize_value(value)
        return states
    
    def _generate_explanation(self, operation: str, 
                              code_line: str, variables: dict) -> str:
        """Generate human-readable explanation of what happened"""
        explanations = {
            'stack_push': f"Pushed element onto the stack",
            'stack_pop': f"Popped element from the stack",
            'var_assign': f"Variable assignment: {code_line}",
            'loop_iteration': f"Loop iteration",
            'condition_true': f"Condition evaluated to TRUE: {code_line}",
            'condition_false': f"Condition evaluated to FALSE: {code_line}",
            'function_return': f"Function returning: {code_line}",
            'queue_enqueue': f"Enqueued element into queue",
            'queue_dequeue': f"Dequeued element from queue",
        }
        return explanations.get(operation, f"Executing: {code_line}")
    
    def execute(self, source_code: str, test_input: str, 
                function_name: str = None) -> ExecutionTrace:
        """
        Main entry point: execute user code with tracing.
        """
        self.source_lines = source_code.split('\n')
        
        # Import the instrumentor
        from .instrumentor import instrument_code
        
        try:
            # Step 1: Instrument the code
            instrumented = instrument_code(source_code)
        except SyntaxError as e:
            return ExecutionTrace(
                success=False,
                error=f"Syntax Error: {str(e)}",
                total_steps=0,
                steps=[],
                data_structures_used=[],
                final_output=None
            )
        
        # Step 2: Set up execution environment
        exec_globals = {
            '__builtins__': __builtins__,
            '__trace__': self.trace,
            '__trace_pre__': self.trace_pre,
            '__trace_post__': self.trace_post,
        }
        
        # Add common DSA classes
        exec_globals['ListNode'] = type('ListNode', (), {
            '__init__': lambda self, val=0, next=None: (
                setattr(self, 'val', val) or setattr(self, 'next', next)
            )
        })
        
        exec_globals['TreeNode'] = type('TreeNode', (), {
            '__init__': lambda self, val=0, left=None, right=None: (
                setattr(self, 'val', val) or 
                setattr(self, 'left', left) or 
                setattr(self, 'right', right)
            )
        })
        
        # Redirect stdout
        old_stdout = sys.stdout
        sys.stdout = self.stdout_capture
        
        try:
            # Step 3: Execute instrumented code
            exec(instrumented, exec_globals)
            
            # Step 4: Call the target function with test input
            final_output = None
            if function_name and function_name in exec_globals:
                # Parse test input
                test_args = eval(test_input)
                if not isinstance(test_args, tuple):
                    test_args = (test_args,)
                
                # Handle class-based solutions (LeetCode style)
                if 'Solution' in exec_globals:
                    sol = exec_globals['Solution']()
                    func = getattr(sol, function_name)
                    final_output = func(*test_args)
                else:
                    final_output = exec_globals[function_name](*test_args)
            
            # Detect which DS were used
            ds_used = list(set(
                step.data_structure_type 
                for step in self.steps 
                if step.data_structure_type != 'variable'
            ))
            
            return ExecutionTrace(
                success=True,
                total_steps=len(self.steps),
                steps=self.steps,
                data_structures_used=ds_used,
                final_output=self._serialize_value(final_output)
            )
            
        except Exception as e:
            return ExecutionTrace(
                success=False,
                error=f"{type(e).__name__}: {str(e)}",
                total_steps=len(self.steps),
                steps=self.steps,
                data_structures_used=[],
                final_output=None
            )
        finally:
            sys.stdout = old_stdout