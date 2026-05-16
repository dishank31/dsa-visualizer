# backend/app/services/tracer_v2.py
# Uses Python's built-in tracing mechanism — no AST manipulation needed

import sys
import copy
import linecache
from typing import Any


class SysTracer:
    """
    Uses Python's sys.settrace() for line-by-line execution tracing.
    This is simpler and catches EVERYTHING.
    """
    
    def __init__(self):
        self.steps = []
        self.step_counter = 0
        self.source_code = ""
        self.source_lines = []
        self.target_filename = "<user_code>"
        self.max_steps = 10000  # Safety limit
    
    def _trace_calls(self, frame, event, arg):
        """Trace function — called by Python for every line execution"""
        
        # Only trace our user code, not library code
        if frame.f_code.co_filename != self.target_filename:
            return self._trace_calls
        
        if self.step_counter >= self.max_steps:
            return None  # Stop tracing
        
        if event == 'line':
            self.step_counter += 1
            line_no = frame.f_lineno
            
            # Get the actual code line
            code_line = ""
            if 0 < line_no <= len(self.source_lines):
                code_line = self.source_lines[line_no - 1].strip()
            
            # Capture all local variables
            variables = {}
            for name, value in frame.f_locals.items():
                if not name.startswith('__'):
                    try:
                        variables[name] = self._deep_copy_safe(value)
                    except:
                        variables[name] = str(value)
            
            # Detect operations from the code line
            operation, ds_type, ds_id, highlights = \
                self._analyze_line(code_line, variables, frame.f_locals)
            
            self.steps.append({
                'step_number': self.step_counter,
                'line_number': line_no,
                'code_line': code_line,
                'operation': operation,
                'data_structure_type': ds_type,
                'data_structure_id': ds_id,
                'variables': variables,
                'highlight_elements': highlights,
                'explanation': self._explain(operation, code_line),
                'event': event,
            })
        
        elif event == 'call':
            func_name = frame.f_code.co_name
            self.steps.append({
                'step_number': self.step_counter,
                'line_number': frame.f_lineno,
                'code_line': f"→ Calling {func_name}()",
                'operation': 'function_call',
                'data_structure_type': 'call_stack',
                'data_structure_id': 'call_stack',
                'variables': {},
                'highlight_elements': [],
                'explanation': f"Entering function: {func_name}",
                'event': event,
            })
        
        elif event == 'return':
            self.steps.append({
                'step_number': self.step_counter,
                'line_number': frame.f_lineno,
                'code_line': f"← Returning from {frame.f_code.co_name}",
                'operation': 'function_return',
                'data_structure_type': 'call_stack',
                'data_structure_id': 'call_stack',
                'variables': {'return_value': self._deep_copy_safe(arg)},
                'highlight_elements': [],
                'explanation': f"Returning: {arg}",
                'event': event,
            })
        
        return self._trace_calls
    
    def _deep_copy_safe(self, value: Any) -> Any:
        """Safely deep copy a value for serialization"""
        if value is None or isinstance(value, (int, float, str, bool)):
            return value
        elif isinstance(value, list):
            return [self._deep_copy_safe(v) for v in value]
        elif isinstance(value, dict):
            return {str(k): self._deep_copy_safe(v) for k, v in value.items()}
        elif isinstance(value, (set, frozenset)):
            return sorted(list(value)) if all(
                isinstance(x, (int, float, str)) for x in value
            ) else [str(x) for x in value]
        elif isinstance(value, tuple):
            return [self._deep_copy_safe(v) for v in value]
        elif hasattr(value, '__dict__'):
            return {
                k: self._deep_copy_safe(v) 
                for k, v in value.__dict__.items() 
                if not k.startswith('_')
            }
        return str(value)
    
    def _analyze_line(self, code_line: str, variables: dict, 
                      raw_locals: dict) -> tuple:
        """
        Analyze a code line to determine what operation is happening
        and which data structure is involved.
        
        Returns: (operation, ds_type, ds_id, highlights)
        """
        line = code_line.lower().strip()
        
        # Stack operations
        if '.append(' in line:
            # Find which variable is being appended to
            var_name = code_line.split('.append(')[0].strip()
            return ('stack_push', 'stack', var_name, 
                    [len(raw_locals.get(var_name, [])) - 1])
        
        if '.pop(' in line or '.pop()' in line:
            var_name = code_line.split('.pop')[0].strip()
            return ('stack_pop', 'stack', var_name, [])
        
        # Array access with index
        if '[' in line and ']' in line and '=' in line:
            return ('array_set', 'array', '', [])
        
        if '[' in line and ']' in line:
            return ('array_access', 'array', '', [])
        
        # HashMap operations
        if 'dict(' in line or '{}' in line:
            return ('map_create', 'hashmap', '', [])
        
        # Conditionals
        if line.startswith('if ') or line.startswith('elif '):
            return ('condition_check', 'variable', '', [])
        
        if line.startswith('while '):
            return ('loop_iteration', 'variable', '', [])
        
        if line.startswith('for '):
            return ('loop_iteration', 'variable', '', [])
        
        if line.startswith('return'):
            return ('function_return', 'variable', '', [])
        
        # Default: variable assignment
        if '=' in line and not line.startswith('='):
            return ('var_assign', 'variable', '', [])
        
        return ('expression', 'variable', '', [])
    
    def _explain(self, operation: str, code_line: str) -> str:
        """Generate explanation"""
        templates = {
            'stack_push': f"Push operation: {code_line}",
            'stack_pop': f"Pop operation: {code_line}",
            'array_set': f"Array modification: {code_line}",
            'array_access': f"Array access: {code_line}",
            'condition_check': f"Checking condition: {code_line}",
            'loop_iteration': f"Loop: {code_line}",
            'var_assign': f"Assignment: {code_line}",
            'function_return': f"Return: {code_line}",
            'function_call': f"Function call: {code_line}",
        }
        return templates.get(operation, f"Executing: {code_line}")
    
    def execute(self, source_code: str, test_input: str, 
                function_name: str = "main") -> dict:
        """Execute code with tracing"""
        
        self.source_code = source_code
        self.source_lines = source_code.split('\n')
        
        # Compile user code
        code_obj = compile(source_code, self.target_filename, 'exec')
        
        # Set up execution namespace
        namespace = {'__name__': '__main__'}
        
        # Common LeetCode classes
        class ListNode:
            def __init__(self, val=0, next=None):
                self.val = val
                self.next = next
            def __repr__(self):
                vals = []
                node = self
                while node:
                    vals.append(str(node.val))
                    node = node.next
                return ' -> '.join(vals)
        
        class TreeNode:
            def __init__(self, val=0, left=None, right=None):
                self.val = val
                self.left = left
                self.right = right
        
        namespace['ListNode'] = ListNode
        namespace['TreeNode'] = TreeNode
        
        try:
            # Enable tracing
            sys.settrace(self._trace_calls)
            
            # Execute the code (defines functions/classes)
            exec(code_obj, namespace)
            
            # Call the target function
            result = None
            if function_name:
                test_args = eval(test_input, namespace)
                if not isinstance(test_args, tuple):
                    test_args = (test_args,)
                
                if 'Solution' in namespace:
                    sol = namespace['Solution']()
                    if hasattr(sol, function_name):
                        result = getattr(sol, function_name)(*test_args)
                elif function_name in namespace:
                    result = namespace[function_name](*test_args)
            
            sys.settrace(None)
            
            return {
                'success': True,
                'steps': self.steps,
                'total_steps': len(self.steps),
                'result': self._deep_copy_safe(result),
                'data_structures_used': list(set(
                    s['data_structure_type'] for s in self.steps 
                    if s['data_structure_type'] != 'variable'
                ))
            }
            
        except Exception as e:
            sys.settrace(None)
            return {
                'success': False,
                'error': f"{type(e).__name__}: {str(e)}",
                'steps': self.steps,
                'total_steps': len(self.steps),
                'result': None,
                'data_structures_used': []
            }