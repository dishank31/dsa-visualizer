import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class TransformResult:
    transformed_code: str
    detected_structures: list[str]
    errors: list[str]


class CppTransformer:
    """
    Transforms user C++ code to use Traced* wrappers.
    
    What it does:
    1. Prepend trace_lib.h
    2. Replace stack<T> â†’ TracedStack<T>
    3. Replace vector<T> â†’ TracedVector<T>
    4. Replace unordered_map â†’ TracedHashMap
    5. Inject TRACE_LINE macros at key points
    6. Add main() wrapper if needed
    7. Handle LeetCode-style class Solution
    """

    # â”€â”€ Regex patterns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    # Match: stack<int> myStack;  or  stack<int> st = stack<int>();
    STACK_DECL = re.compile(
        r'\bstack\s*<\s*([^>]+)\s*>\s+(\w+)\s*;'
    )

    # Match: vector<int> arr;  or  vector<int> arr = {1,2,3};
    VECTOR_DECL = re.compile(
        r'\bvector\s*<\s*([^>]+)\s*>\s+(\w+)\s*(?:=\s*\{([^}]*)\})?\s*;'
    )

    # Match: unordered_map<int,int> mp;
    UMAP_DECL = re.compile(
        r'\bunordered_map\s*<\s*([^,>]+)\s*,\s*([^>]+)\s*>\s+(\w+)\s*;'
    )

    MAP_DECL = re.compile(
        r'\bmap\s*<\s*([^,>]+)\s*,\s*([^>]+)\s*>\s+(\w+)\s*;'
    )

    # Match: st.push(val);
    STACK_PUSH = re.compile(r'\b(\w+)\.push\(([^)]+)\)\s*;')

    # Match: st.pop();
    STACK_POP_VOID = re.compile(r'\b(\w+)\.pop\(\)\s*;')

    # Match: auto x = st.top(); st.pop();  or  int x = st.top(); st.pop();
    STACK_POP_TOP = re.compile(
        r'(?:auto|int|char|long|string)\s+(\w+)\s*=\s*(\w+)\.top\(\)\s*;'
        r'\s*\n\s*\2\.pop\(\)\s*;',
        re.MULTILINE
    )

    # Match: arr.push_back(val);
    VEC_PUSH_BACK = re.compile(r'\b(\w+)\.push_back\(([^)]+)\)\s*;')

    # Match: arr[i] = val;
    VEC_SET = re.compile(r'\b(\w+)\[([^\]]+)\]\s*=\s*([^;]+)\s*;')

    def transform(self, code: str) -> TransformResult:
        detected = []
        errors = []

        # Step 1: Detect what structures are used
        if re.search(r'\bstack\s*<', code):
            detected.append('stack')
        if re.search(r'\bvector\s*<', code):
            detected.append('array')
        if re.search(r'\bunordered_map\s*<', code):
            detected.append('hashmap')
        if re.search(r'\bmap\s*<', code):
            detected.append('hashmap')
        if re.search(r'\bqueue\s*<', code):
            detected.append('queue')
        if re.search(r'struct\s+(?:TreeNode|ListNode)', code):
            detected.append('tree' if 'TreeNode' in code else 'linked_list')
        if re.search(r'struct\s+Node', code):
            detected.append('linked_list')

        transformed_code = code

        # Step 2: Strip user-supplied headers that conflict with trace_lib.h
        transformed_code = self._strip_conflicting_headers(transformed_code)

        # Step 3: Apply structural transformations
        transformed_code = self._transform_declarations(transformed_code)
        transformed_code = self._transform_operations(transformed_code)
        transformed_code = self._handle_leetcode_style(transformed_code)

        # Step 4: Prepend our trace header (conditionally injects LeetCode structs)
        header = self._build_header(code)
        transformed_code = header + '\n' + transformed_code

        return TransformResult(
            transformed_code=transformed_code,
            detected_structures=detected,
            errors=errors
        )

    def _strip_conflicting_headers(self, code: str) -> str:
        """
        Remove user-supplied #include lines and 'using namespace std;' so they
        don't conflict with what trace_lib.h already provides.
        """
        # Remove any #include<...> or #include "..." line
        code = re.sub(r'^\s*#include\s*[<"].*?[>"]\s*$', '', code, flags=re.MULTILINE)
        # Remove bare 'using namespace std;'
        code = re.sub(r'^\s*using\s+namespace\s+std\s*;\s*$', '', code, flags=re.MULTILINE)
        return code

    def _classify_line(self, line: str) -> str:
        """Classify what operation a line performs"""
        if '.push(' in line:
            return 'stack_push'
        if '.pop()' in line:
            return 'stack_pop'
        if '.push_back(' in line:
            return 'array_append'
        if re.search(r'\[.+\]\s*=', line):
            return 'array_set'
        if line.startswith('if ') or line.startswith('if('):
            return 'condition_check'
        if line.startswith('for ') or line.startswith('for('):
            return 'loop_iteration'
        if line.startswith('while ') or line.startswith('while('):
            return 'loop_iteration'
        if line.startswith('return '):
            return 'function_return'
        if '=' in line and not line.startswith('='):
            return 'var_assign'
        return 'expression'

    def _explain_line(self, line: str) -> str:
        """Generate explanation for a code line"""
        if '.push(' in line:
            return f'Stack push operation'
        if '.pop()' in line:
            return f'Stack pop operation'
        if '.push_back(' in line:
            return f'Append to array'
        if 'if' in line:
            return f'Evaluating condition'
        if 'for' in line or 'while' in line:
            return f'Loop iteration'
        if 'return' in line:
            return f'Returning value'
        return f'Executing: {line[:50]}'

    def _escape_cpp(self, s: str) -> str:
        """Escape string for C++ string literal"""
        return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

    def _transform_declarations(self, code: str) -> str:
        """Replace STL declarations with Traced versions"""

        # stack<T> name; â†’ TracedStack<T> name("name");
        def replace_stack(m):
            type_ = m.group(1).strip()
            name = m.group(2)
            return f'TracedStack<{type_}> {name}("{name}");'

        code = self.STACK_DECL.sub(replace_stack, code)

        # vector<T> name; â†’ TracedVector<T> name("name");
        def replace_vector(m):
            type_ = m.group(1).strip()
            name = m.group(2)
            init = m.group(3)
            if init:
                return f'TracedVector<{type_}> {name}("{name}", {{{init}}});'
            return f'TracedVector<{type_}> {name}("{name}");'

        code = self.VECTOR_DECL.sub(replace_vector, code)

        # unordered_map<K,V> name; â†’ TracedHashMap<K,V> name("name");
        def replace_umap(m):
            k = m.group(1).strip()
            v = m.group(2).strip()
            name = m.group(3)
            return f'TracedHashMap<{k},{v}> {name}("{name}");'

        code = self.UMAP_DECL.sub(replace_umap, code)
        code = self.MAP_DECL.sub(replace_umap, code)

        return code

    def _transform_operations(self, code: str) -> str:
        """Transform method calls to traced versions with line numbers"""

        lines = code.split('\n')
        result = []

        for i, line in enumerate(lines, start=1):
            transformed = line

            # stack.push(val) â†’ stack.push(val, __LINE__, "code")
            def add_trace_args_push(m):
                name = m.group(1)
                val = m.group(2)
                code_str = self._escape_cpp(m.group(0))
                return f'{name}.push({val}, {i}, "{code_str}");'

            transformed = self.STACK_PUSH.sub(add_trace_args_push, transformed)

            # stack.pop() â†’ stack.pop(line, "code")
            def add_trace_args_pop(m):
                name = m.group(1)
                code_str = self._escape_cpp(m.group(0))
                return f'{name}.pop({i}, "{code_str}");'

            transformed = self.STACK_POP_VOID.sub(add_trace_args_pop, transformed)

            # vec.push_back(val) â†’ vec.push_back(val, line, "code")
            def add_trace_args_pb(m):
                name = m.group(1)
                val = m.group(2)
                code_str = self._escape_cpp(m.group(0))
                return f'{name}.push_back({val}, {i}, "{code_str}");'

            transformed = self.VEC_PUSH_BACK.sub(add_trace_args_pb, transformed)

            result.append(transformed)

        return '\n'.join(result)

    def _handle_leetcode_style(self, code: str) -> str:
        """
        Handle class Solution { public: ... };
        Add test harness to call the function.
        """
        # Check if it's LeetCode style
        if 'class Solution' in code:
            # Detect return type and function name
            method_match = re.search(
                r'(?:public:.*?)?(\w[\w<>,\s*]+)\s+(\w+)\s*\([^)]*\)\s*\{',
                code,
                re.DOTALL
            )
            if method_match:
                # Will be handled by the executor based on function_name
                pass

        return code

    def _build_header(self, original_code: str = '') -> str:
        """Build the header to prepend — only inject boilerplate structs when needed."""
        import re as _re
        lines = ['#include "trace_lib.h"', 'using namespace std;', '']

        has_custom_node = bool(_re.search(r'\bstruct\s+(?:Node|ListNode)\b', original_code))
        has_tree_node   = bool(_re.search(r'\bstruct\s+TreeNode\b', original_code))

        if not has_custom_node:
            lines += [
                '// LeetCode common structures',
                'struct ListNode {',
                '    int val;',
                '    ListNode* next;',
                '    ListNode() : val(0), next(nullptr) {}',
                '    ListNode(int x) : val(x), next(nullptr) {}',
                '    ListNode(int x, ListNode* next) : val(x), next(next) {}',
                '};',
                '',
            ]

        if not has_tree_node:
            lines += [
                'struct TreeNode {',
                '    int val;',
                '    TreeNode* left;',
                '    TreeNode* right;',
                '    TreeNode() : val(0), left(nullptr), right(nullptr) {}',
                '    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}',
                '    TreeNode(int x, TreeNode* left, TreeNode* right)',
                '        : val(x), left(left), right(right) {}',
                '};',
                '',
            ]

        return chr(10).join(lines) + chr(10)
