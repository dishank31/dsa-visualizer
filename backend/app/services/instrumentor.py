
import ast
import textwrap
from typing import Optional


class CodeInstrumentor(ast.NodeTransformer):
    """
    Transforms user code by injecting trace calls at every meaningful operation.
    
    Example transformation:
        Original:  stack.append(5)
        Instrumented:  __trace_push__(stack, 5, 'stack', 42); stack.append(5)
    """
    
    def __init__(self):
        self.trace_id = 0
    
    def _next_id(self):
        self.trace_id += 1
        return self.trace_id
    
    def visit_Assign(self, node):
        """Instrument variable assignments"""
        self.generic_visit(node)
        
        # Create trace call for assignment
        trace_call = ast.parse(
            f"__trace__('var_assign', {node.lineno}, locals().copy())"
        ).body[0]
        
        return [node, trace_call]
    
    def visit_Expr(self, node):
        """Instrument expressions like stack.append(), stack.pop()"""
        self.generic_visit(node)
        
        if isinstance(node.value, ast.Call):
            call = node.value
            
            # Detect method calls like obj.method()
            if isinstance(call.func, ast.Attribute):
                method_name = call.func.attr
                obj_name = ""
                
                if isinstance(call.func.value, ast.Name):
                    obj_name = call.func.value.id
                
                # Map common methods to DS operations
                operation_map = {
                    'append': 'stack_push',      # list.append
                    'pop': 'stack_pop',           # list.pop / stack.pop
                    'push': 'stack_push',         # stack.push
                    'put': 'queue_enqueue',
                    'get': 'queue_dequeue',
                    'add': 'set_add',
                    'remove': 'array_remove',
                    'insert': 'array_insert',
                    'enqueue': 'queue_enqueue',
                    'dequeue': 'queue_dequeue',
                }
                
                if method_name in operation_map:
                    op = operation_map[method_name]
                    
                    # Inject BEFORE the operation (capture args)
                    pre_trace = ast.parse(
                        f"__trace_pre__('{op}', '{obj_name}', "
                        f"{node.lineno}, locals().copy())"
                    ).body[0]
                    
                    # Inject AFTER the operation (capture state)
                    post_trace = ast.parse(
                        f"__trace_post__('{op}', '{obj_name}', "
                        f"{node.lineno}, locals().copy())"
                    ).body[0]
                    
                    return [pre_trace, node, post_trace]
        
        trace_call = ast.parse(
            f"__trace__('expression', {node.lineno}, locals().copy())"
        ).body[0]
        
        return [node, trace_call]
    
    def visit_For(self, node):
        """Instrument for loops"""
        self.generic_visit(node)
        
        # Add trace at the start of each iteration
        trace_call = ast.parse(
            f"__trace__('loop_iteration', {node.lineno}, locals().copy())"
        ).body[0]
        
        node.body.insert(0, trace_call)
        return node
    
    def visit_While(self, node):
        """Instrument while loops"""
        self.generic_visit(node)
        
        trace_call = ast.parse(
            f"__trace__('loop_iteration', {node.lineno}, locals().copy())"
        ).body[0]
        
        node.body.insert(0, trace_call)
        return node
    
    def visit_If(self, node):
        """Instrument if conditions"""
        self.generic_visit(node)
        
        # Trace which branch was taken
        true_trace = ast.parse(
            f"__trace__('condition_true', {node.lineno}, locals().copy())"
        ).body[0]
        
        false_trace = ast.parse(
            f"__trace__('condition_false', {node.lineno}, locals().copy())"
        ).body[0]
        
        node.body.insert(0, true_trace)
        if node.orelse:
            node.orelse.insert(0, false_trace)
        
        return node
    
    def visit_Return(self, node):
        """Instrument return statements"""
        self.generic_visit(node)
        
        trace_call = ast.parse(
            f"__trace__('function_return', {node.lineno}, locals().copy())"
        ).body[0]
        
        return [trace_call, node]
    
    def visit_Subscript(self, node):
        """Instrument array access like arr[i]"""
        self.generic_visit(node)
        return node  # Handle in parent context


def instrument_code(source_code: str) -> str:
    """
    Takes raw user code, parses AST, injects tracing, 
    returns instrumented code string.
    """
    tree = ast.parse(source_code)
    instrumentor = CodeInstrumentor()
    new_tree = instrumentor.visit(tree)
    ast.fix_missing_locations(new_tree)
    return ast.unparse(new_tree)