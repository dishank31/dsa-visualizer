# backend/app/services/cpp_executor.py

import subprocess
import tempfile
import os
import json
import re
import shutil
from pathlib import Path
from typing import Optional
from .cpp_transformer import CppTransformer


class CppExecutor:
    """
    Compiles and runs instrumented C++ code in a secure sandbox.
    
    Flow:
    1. Transform user code
    2. Write to temp file
    3. Compile with g++
    4. Execute with timeout
    5. Parse trace from stderr
    6. Return structured result
    """

    COMPILE_TIMEOUT = 15   # seconds
    EXECUTE_TIMEOUT = 10   # seconds
    MAX_OUTPUT_SIZE = 1024 * 1024  # 1MB

    def __init__(self):
        self.transformer = CppTransformer()
        self.trace_lib_path = Path(__file__).resolve().parents[2] / 'cpp_tracer'

    def execute(
        self,
        source_code: str,
        test_case: str,
        function_name: Optional[str] = None
    ) -> dict:
        """
        Main entry point for C++ execution.
        Returns same format as Python tracer for frontend compatibility.
        """

        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)

            # Copy trace library
            trace_header = self.trace_lib_path / 'trace_lib.h'
            if not trace_header.exists():
                return {
                    'success': False,
                    'error': f'Missing C++ trace library: {trace_header}',
                    'steps': [],
                    'total_steps': 0,
                    'result': None,
                    'data_structures_used': []
                }

            shutil.copy(
                trace_header,
                tmpdir / 'trace_lib.h'
            )

            # Transform user code
            transform_result = self.transformer.transform(source_code)

            # Generate main.cpp with test harness
            full_code = self._generate_full_code(
                transform_result.transformed_code,
                test_case,
                function_name,
                source_code
            )

            # Write source file
            source_file = tmpdir / 'main.cpp'
            source_file.write_text(full_code, encoding='utf-8')

            # Compile
            compile_result = self._compile(source_file, tmpdir)
            if not compile_result['success']:
                return {
                    'success': False,
                    'error': self._format_compile_error(
                        compile_result['stderr'], source_code
                    ),
                    'steps': [],
                    'total_steps': 0,
                    'result': None,
                    'data_structures_used': []
                }

            # Execute
            exe_file = tmpdir / 'main'
            exec_result = self._execute_binary(exe_file)

            # Parse trace
            return self._parse_output(
                exec_result,
                transform_result.detected_structures
            )

    def _generate_full_code(
        self,
        transformed: str,
        test_case: str,
        function_name: Optional[str],
        original_code: str
    ) -> str:
        """
        Generate complete compilable C++ with test harness.
        
        Handles:
        - class Solution { ... };  (LeetCode style)
        - Standalone functions
        - Various input types
        """

        # Parse test case to determine input type
        test_harness = self._build_test_harness(
            test_case, function_name, original_code
        )

        if 'int main(' in transformed:
            # User already has main — inject test case before it
            return transformed

        return f'''{transformed}

// ─── Test Harness ─────────────────────────────────────────────────────
int main() {{
    {test_harness}
    return 0;
}}
'''

    def _build_test_harness(
        self,
        test_case: str,
        function_name: Optional[str],
        original_code: str
    ) -> str:
        """
        Build C++ test harness code string based on test case and function.
        
        Handles common LeetCode patterns automatically.
        """

        if not function_name:
            return "// No function to call"

        # Parse the test case
        # test_case comes as Python-literal-like: "[1,2,3]" or '"hello"' or '([1,2,3], 3)'
        harness_parts = []

        # Detect if class Solution exists
        has_solution_class = 'class Solution' in original_code

        # Detect parameter types from function signature
        func_sig = self._extract_function_signature(original_code, function_name)

        if has_solution_class:
            harness_parts.append('Solution sol;')

        # Parse test_case into C++ variables
        cpp_args, arg_decls = self._parse_test_case_to_cpp(
            test_case, func_sig
        )

        harness_parts.extend(arg_decls)

        # Call the function
        if has_solution_class:
            harness_parts.append(
                f'auto result = sol.{function_name}({cpp_args});'
            )
        else:
            harness_parts.append(
                f'auto result = {function_name}({cpp_args});'
            )

        # Output result (goes to captured stdout)
        harness_parts.append(
            'std::cerr << "<<<RESULT>>>" << result << std::endl;'
        )

        return '\n    '.join(harness_parts)

    def _extract_function_signature(
        self, code: str, function_name: str
    ) -> Optional[dict]:
        """Extract return type and parameter types from function signature"""

        pattern = rf'(\w[\w<>,\s*]+)\s+{re.escape(function_name)}\s*\(([^)]*)\)'
        match = re.search(pattern, code)

        if not match:
            return None

        return_type = match.group(1).strip()
        params_str = match.group(2).strip()

        # Parse parameters
        params = []
        if params_str:
            for param in params_str.split(','):
                param = param.strip()
                # Extract type and name
                parts = param.rsplit(' ', 1)
                if len(parts) == 2:
                    params.append({
                        'type': parts[0].strip(),
                        'name': parts[1].strip().lstrip('&').lstrip('*')
                    })

        return {
            'return_type': return_type,
            'params': params
        }

    def _parse_test_case_to_cpp(
        self, test_case: str, func_sig: Optional[dict]
    ) -> tuple[str, list[str]]:
        """
        Convert Python-style test case to C++ variable declarations.
        
        Examples:
        '"hello"' → (s, ['string s = "hello";'])
        '[1,2,3]' → (nums, ['vector<int> nums = {1,2,3};'])
        '([1,2,3], 3)' → (nums, target, ['vector<int> nums = {1,2,3};', 'int target = 3;'])
        """

        declarations = []
        arg_names = []

        # Try to match function signature params
        if func_sig and func_sig['params']:
            params = func_sig['params']

            # Parse test_case as tuple if multiple args
            test_case = test_case.strip()

            if test_case.startswith('(') and test_case.endswith(')'):
                # Multiple arguments
                # Split carefully (not inside brackets/quotes)
                args = self._split_args(test_case[1:-1])
            else:
                args = [test_case]

            for i, (param, arg) in enumerate(zip(params, args)):
                cpp_decl, cpp_name = self._convert_arg(
                    arg.strip(), param['type'], param['name']
                )
                declarations.append(cpp_decl)
                arg_names.append(cpp_name)

        else:
            # No signature info — make best guess
            test_case = test_case.strip()
            if test_case.startswith('['):
                # Array
                inner = test_case[1:-1]
                declarations.append(f'vector<int> nums = {{{inner}}};')
                arg_names.append('nums')
            elif test_case.startswith('"') or test_case.startswith("'"):
                # String
                s = test_case.strip('"\'')
                declarations.append(f'string s = "{s}";')
                arg_names.append('s')
            elif test_case.lstrip('-').isdigit():
                # Integer
                declarations.append(f'int n = {test_case};')
                arg_names.append('n')
            else:
                declarations.append(f'// Could not parse: {test_case}')
                arg_names.append('')

        return ', '.join(arg_names), declarations

    def _convert_arg(
        self, arg: str, cpp_type: str, param_name: str
    ) -> tuple[str, str]:
        """Convert a single Python-style arg to C++ declaration"""

        arg = arg.strip()
        normalized_type = cpp_type.replace('const', '').replace('&', '').strip()

        if 'vector' in normalized_type and arg.startswith('['):
            inner = arg[1:-1]
            return f'{normalized_type} {param_name} = {{{inner}}};', param_name

        elif 'string' in normalized_type:
            s = arg.strip('"\'')
            return f'string {param_name} = "{s}";', param_name

        elif normalized_type in ('int', 'long', 'long long'):
            return f'{normalized_type} {param_name} = {arg};', param_name

        elif normalized_type == 'bool':
            val = 'true' if arg.lower() in ('true', '1') else 'false'
            return f'bool {param_name} = {val};', param_name

        elif normalized_type == 'char':
            ch = arg.strip("'\"")
            return f"char {param_name} = '{ch}';", param_name

        else:
            # Fallback
            return f'auto {param_name} = {arg};', param_name

    def _split_args(self, s: str) -> list[str]:
        """Split argument string respecting brackets and quotes"""
        args = []
        depth = 0
        current = ''
        in_string = False
        string_char = ''

        for char in s:
            if in_string:
                current += char
                if char == string_char:
                    in_string = False
            elif char in ('"', "'"):
                in_string = True
                string_char = char
                current += char
            elif char in ('(', '[', '{'):
                depth += 1
                current += char
            elif char in (')', ']', '}'):
                depth -= 1
                current += char
            elif char == ',' and depth == 0:
                args.append(current.strip())
                current = ''
            else:
                current += char

        if current.strip():
            args.append(current.strip())

        return args

    def _compile(self, source_file: Path, tmpdir: Path) -> dict:
        """Compile C++ file, return success + any errors"""

        exe_file = tmpdir / 'main'

        try:
            result = subprocess.run(
                [
                    'g++',
                    '-std=c++17',
                    '-O0',              # No optimization (better for debugging)
                    '-g',               # Debug info
                    '-I', str(tmpdir),  # Include trace_lib.h
                    '-o', str(exe_file),
                    str(source_file),
                ],
                capture_output=True,
                text=True,
                timeout=self.COMPILE_TIMEOUT
            )

            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
            }

        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'stdout': '',
                'stderr': 'Compilation timed out (>15 seconds)',
            }
        except FileNotFoundError:
            return {
                'success': False,
                'stdout': '',
                'stderr': 'g++ compiler not found. Please install g++.',
            }

    def _execute_binary(self, exe_file: Path) -> dict:
        """Execute compiled binary with resource limits"""

        try:
            result = subprocess.run(
                [str(exe_file)],
                capture_output=True,
                text=True,
                timeout=self.EXECUTE_TIMEOUT,
                # Resource limits (Linux only)
                preexec_fn=self._set_resource_limits if os.name != 'nt' else None,
            )

            return {
                'success': result.returncode == 0,
                'stdout': result.stdout[:self.MAX_OUTPUT_SIZE],
                'stderr': result.stderr[:self.MAX_OUTPUT_SIZE],
                'returncode': result.returncode,
            }

        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'stdout': '',
                'stderr': 'Execution timed out (>10 seconds). Possible infinite loop.',
                'returncode': -1,
            }

    def _set_resource_limits(self):
        """Set resource limits for subprocess (Linux/Mac)"""
        import resource

        # Max 256MB memory
        resource.setrlimit(
            resource.RLIMIT_AS,
            (256 * 1024 * 1024, 256 * 1024 * 1024)
        )

        # Max 10 seconds CPU time
        resource.setrlimit(
            resource.RLIMIT_CPU,
            (10, 10)
        )

    def _parse_output(self, exec_result: dict, detected_ds: list) -> dict:
        """Parse trace JSON from stderr"""

        stderr = exec_result.get('stderr', '')

        # Extract trace JSON between markers
        trace_match = re.search(
            r'<<<TRACE_START>>>\n(\[.*?\])\n<<<TRACE_END>>>',
            stderr,
            re.DOTALL
        )

        if not trace_match:
            error_msg = stderr
            if '<<<TRACE_START>>>' not in stderr:
                stderr_result_match = re.search(r'<<<RESULT>>>(.+)', stderr)
                stdout = exec_result.get('stdout', '')
                result_match = stderr_result_match or re.search(r'Result: (.+)', stdout)
                if exec_result.get('success') and result_match:
                    return {
                        'success': True,
                        'error': None,
                        'steps': [],
                        'total_steps': 0,
                        'result': result_match.group(1).strip(),
                        'data_structures_used': detected_ds,
                        'execution_time_ms': 0,
                    }

                error_msg = (
                    exec_result.get('stderr', 'Unknown error') or
                    'Program produced no trace output'
                )
            return {
                'success': False,
                'error': error_msg,
                'steps': [],
                'total_steps': 0,
                'result': None,
                'data_structures_used': detected_ds,
            }

        try:
            steps = json.loads(trace_match.group(1))

            # Extract result marker from stderr first, then stdout fallback
            stderr_result_match = re.search(r'<<<RESULT>>>(.+)', stderr)
            stdout = exec_result.get('stdout', '')
            result_match = stderr_result_match or re.search(r'Result: (.+)', stdout)
            result = result_match.group(1).strip() if result_match else None

            # Update DS used based on actual step operations
            ds_from_steps = list(set(
                s.get('data_structure_type', '')
                for s in steps
                if s.get('data_structure_type') not in ('variable', '')
            ))

            all_ds = list(set(detected_ds + ds_from_steps))

            return {
                'success': True,
                'error': None,
                'steps': steps,
                'total_steps': len(steps),
                'result': result,
                'data_structures_used': all_ds,
                'execution_time_ms': 0,
            }

        except json.JSONDecodeError as e:
            return {
                'success': False,
                'error': f'Failed to parse trace output: {e}',
                'steps': [],
                'total_steps': 0,
                'result': None,
                'data_structures_used': detected_ds,
            }

    def _format_compile_error(self, error: str, source_code: str) -> str:
        """
        Format g++ errors into user-friendly messages.
        Map instrumented line numbers back to original line numbers.
        """

        lines = source_code.split('\n')

        # Extract line numbers from g++ error messages
        # Format: main.cpp:42:10: error: ...
        def replace_line_ref(m):
            file_part = m.group(1)
            line_num = int(m.group(2))
            col_num = m.group(3)
            rest = m.group(4)

            # Approximate: instrumented code has ~2x lines due to trace macros
            # Map back to original
            original_line = max(1, line_num // 2)

            return f'Line {original_line}: {rest}'

        formatted = re.sub(
            r'(\w+\.cpp):(\d+):(\d+):\s*error:\s*(.+)',
            replace_line_ref,
            error
        )

        # Clean up common g++ errors
        formatted = formatted.replace('error: ', '').strip()

        return formatted or error
