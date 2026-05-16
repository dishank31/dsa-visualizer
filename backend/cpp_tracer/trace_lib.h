#pragma once
#include <algorithm>
#include <fstream>
#include <functional>
#include <iostream>
#include <map>
#include <queue>
#include <set>
#include <sstream>
#include <stack>
#include <string>
#include <unordered_map>
#include <vector>

using namespace std;

// ─── JSON Builder (no external deps) ────────────────────────────────────────

class JsonBuilder {
public:
  static std::string escape(const std::string &s) {
    std::string result;
    for (char c : s) {
      switch (c) {
      case '"':
        result += "\\\"";
        break;
      case '\\':
        result += "\\\\";
        break;
      case '\n':
        result += "\\n";
        break;
      case '\r':
        result += "\\r";
        break;
      case '\t':
        result += "\\t";
        break;
      default:
        result += c;
      }
    }
    return result;
  }

  static std::string str(const std::string &s) {
    return "\"" + escape(s) + "\"";
  }

  static std::string num(int n) { return std::to_string(n); }

  static std::string num(long long n) { return std::to_string(n); }

  static std::string num(double n) {
    std::ostringstream oss;
    oss << n;
    return oss.str();
  }

  static std::string boolean(bool b) { return b ? "true" : "false"; }

  static std::string null_val() { return "null"; }

  template <typename T> static std::string vec(const std::vector<T> &v) {
    std::string result = "[";
    for (size_t i = 0; i < v.size(); i++) {
      if (i > 0)
        result += ",";
      result += to_json(v[i]);
    }
    result += "]";
    return result;
  }

  template <typename T> static std::string to_json(const T &val) {
    std::ostringstream oss;
    oss << val;
    return oss.str();
  }

  static std::string to_json(const std::string &val) { return str(val); }

  static std::string to_json(bool val) { return boolean(val); }

  static std::string to_json(char val) {
    return "\"" + std::string(1, val) + "\"";
  }
};

// ─── Tracer Singleton ────────────────────────────────────────────────────────

class DSATracer {
private:
  std::vector<std::string> steps;
  int stepCounter = 0;
  int maxSteps = 10000;
  bool stopped = false;
  std::ostringstream stdoutCapture;
  std::streambuf *originalCout = nullptr;

public:
  DSATracer() {
    // Redirect cout to capture stdout
    originalCout = std::cout.rdbuf(stdoutCapture.rdbuf());
  }

  ~DSATracer() {
    // Restore cout
    if (originalCout) {
      std::cout.rdbuf(originalCout);
    }
    flush();
  }

  static DSATracer &getInstance() {
    static DSATracer instance;
    return instance;
  }

  // ── Core trace method ──────────────────────────────────────────────────

  void trace(int lineNumber, const std::string &codeLine,
             const std::string &operation, const std::string &dsType,
             const std::string &dsId, const std::string &dsState,
             const std::string &variables, const std::string &explanation,
             const std::string &highlights = "[]") {
    if (stopped || stepCounter >= maxSteps) {
      stopped = true;
      return;
    }

    stepCounter++;
    std::string currentStdout = JsonBuilder::escape(stdoutCapture.str());

    std::string step = "{"
                       "\"step_number\":" +
                       JsonBuilder::num(stepCounter) +
                       ","
                       "\"line_number\":" +
                       JsonBuilder::num(lineNumber) +
                       ","
                       "\"code_line\":" +
                       JsonBuilder::str(codeLine) +
                       ","
                       "\"operation\":" +
                       JsonBuilder::str(operation) +
                       ","
                       "\"data_structure_type\":" +
                       JsonBuilder::str(dsType) +
                       ","
                       "\"data_structure_id\":" +
                       JsonBuilder::str(dsId) +
                       ","
                       "\"data_structure_state\":" +
                       dsState +
                       ","
                       "\"variables\":" +
                       variables +
                       ","
                       "\"explanation\":" +
                       JsonBuilder::str(explanation) +
                       ","
                       "\"highlight_elements\":" +
                       highlights +
                       ","
                       "\"stdout\":" +
                       JsonBuilder::str(currentStdout) + "}";

    steps.push_back(step);
  }

  // ── DS-specific helpers ────────────────────────────────────────────────

  template <typename T> std::string serializeVector(const std::vector<T> &v) {
    std::string result = "[";
    for (size_t i = 0; i < v.size(); i++) {
      if (i > 0)
        result += ",";
      result += JsonBuilder::to_json(v[i]);
    }
    return result + "]";
  }

  template <typename T> std::string serializeStack(std::stack<T> s) {
    // Copy stack to serialize (non-destructive)
    std::vector<T> items;
    while (!s.empty()) {
      items.push_back(s.top());
      s.pop();
    }
    std::reverse(items.begin(), items.end());
    return serializeVector(items);
  }

  template <typename T> std::string serializeQueue(std::queue<T> q) {
    std::vector<T> items;
    while (!q.empty()) {
      items.push_back(q.front());
      q.pop();
    }
    return serializeVector(items);
  }

  template <typename K, typename V>
  std::string serializeMap(const std::map<K, V> &m) {
    std::string result = "{";
    bool first = true;
    for (const auto &entry : m) {
      const auto &k = entry.first;
      const auto &v = entry.second;
      if (!first)
        result += ",";
      result +=
          JsonBuilder::str(std::to_string(k)) + ":" + JsonBuilder::to_json(v);
      first = false;
    }
    return result + "}";
  }

  template <typename K, typename V>
  std::string serializeUnorderedMap(const std::unordered_map<K, V> &m) {
    std::string result = "{";
    bool first = true;
    for (const auto &entry : m) {
      const auto &k = entry.first;
      const auto &v = entry.second;
      if (!first)
        result += ",";
      result +=
          JsonBuilder::str(std::to_string(k)) + ":" + JsonBuilder::to_json(v);
      first = false;
    }
    return result + "}";
  }

  // ── Output ─────────────────────────────────────────────────────────────

  void flush() {
    // Restore stdout temporarily for output
    if (originalCout) {
      std::cout.rdbuf(originalCout);
      originalCout = nullptr;
    }

    // Write trace to stderr (separated from program output)
    std::cerr << "<<<TRACE_START>>>" << std::endl;
    std::cerr << "[";
    for (size_t i = 0; i < steps.size(); i++) {
      if (i > 0)
        std::cerr << ",";
      std::cerr << steps[i];
    }
    std::cerr << "]" << std::endl;
    std::cerr << "<<<TRACE_END>>>" << std::endl;
  }

  bool isStopped() const { return stopped; }
};

// ─── Global tracer instance ──────────────────────────────────────────────────
#define __TRACER__ DSATracer::getInstance()

// ─── Convenience macros ──────────────────────────────────────────────────────

#define TRACE_VAR(line, code, varName, varValue, explanation)                  \
  __TRACER__.trace(                                                            \
      line, code, "var_assign", "variable", varName,                           \
      JsonBuilder::to_json(varValue),                                          \
      "{\"" varName "\":" + std::string(JsonBuilder::to_json(varValue)) + "}", \
      explanation)

#define TRACE_LINE(line, code, op, explanation)                                \
  __TRACER__.trace(line, code, op, "variable", "", "{}", "{}", explanation)

// ─── Traced Data Structures ──────────────────────────────────────────────────
// Wrappers around STL that emit trace events automatically

template <typename T> class TracedStack {
private:
  std::stack<T> data;
  std::string name;
  int *lineRef;

public:
  TracedStack(const std::string &varName) : name(varName), lineRef(nullptr) {}

  void push(const T &val, int line, const std::string &code) {
    data.push(val);

    // Serialize stack state
    std::stack<T> temp = data;
    std::vector<T> items;
    while (!temp.empty()) {
      items.push_back(temp.top());
      temp.pop();
    }
    std::reverse(items.begin(), items.end());

    std::string state = "[";
    for (size_t i = 0; i < items.size(); i++) {
      if (i > 0)
        state += ",";
      state += JsonBuilder::to_json(items[i]);
    }
    state += "]";

    std::string highlights = "[" + std::to_string(items.size() - 1) + "]";

    __TRACER__.trace(line, code, "stack_push", "stack", name, state,
                     "{\"" + name + "\":" + state + "}",
                     "Pushed " + JsonBuilder::to_json(val) + " onto stack '" +
                         name + "'",
                     highlights);
  }

  T pop(int line, const std::string &code) {
    if (data.empty()) {
      throw std::runtime_error("Stack underflow on '" + name + "'");
    }

    T val = data.top();
    data.pop();

    std::stack<T> temp = data;
    std::vector<T> items;
    while (!temp.empty()) {
      items.push_back(temp.top());
      temp.pop();
    }
    std::reverse(items.begin(), items.end());

    std::string state = "[";
    for (size_t i = 0; i < items.size(); i++) {
      if (i > 0)
        state += ",";
      state += JsonBuilder::to_json(items[i]);
    }
    state += "]";

    __TRACER__.trace(line, code, "stack_pop", "stack", name, state,
                     "{\"" + name + "\":" + state + "}",
                     "Popped " + JsonBuilder::to_json(val) + " from stack '" +
                         name + "'",
                     "[]");

    return val;
  }

  T &top() { return data.top(); }
  bool empty() const { return data.empty(); }
  size_t size() const { return data.size(); }
};

template <typename T> class TracedVector {
private:
  std::vector<T> data;
  std::string name;

public:
  TracedVector(const std::string &varName) : name(varName) {}
  TracedVector(const std::string &varName, std::initializer_list<T> init)
      : name(varName), data(init) {}

  void push_back(const T &val, int line, const std::string &code) {
    data.push_back(val);
    emitTrace(line, code, "array_append",
              "Appended " + JsonBuilder::to_json(val) + " to '" + name + "'",
              "[" + std::to_string(data.size() - 1) + "]");
  }

  void set(int idx, const T &val, int line, const std::string &code) {
    data[idx] = val;
    emitTrace(line, code, "array_set",
              "Set " + name + "[" + std::to_string(idx) +
                  "] = " + JsonBuilder::to_json(val),
              "[" + std::to_string(idx) + "]");
  }

  T &get(int idx, int line, const std::string &code) {
    emitTrace(line, code, "array_access",
              "Accessed " + name + "[" + std::to_string(idx) +
                  "] = " + JsonBuilder::to_json(data[idx]),
              "[" + std::to_string(idx) + "]");
    return data[idx];
  }

  T &operator[](int idx) { return data[idx]; }
  const T &operator[](int idx) const { return data[idx]; }
  size_t size() const { return data.size(); }
  bool empty() const { return data.empty(); }
  typename std::vector<T>::iterator begin() { return data.begin(); }
  typename std::vector<T>::iterator end() { return data.end(); }

  void swap(int i, int j, int line, const std::string &code) {
    std::swap(data[i], data[j]);
    std::string highlights =
        "[" + std::to_string(i) + "," + std::to_string(j) + "]";
    emitTrace(line, code, "array_swap",
              "Swapped " + name + "[" + std::to_string(i) + "] and [" +
                  std::to_string(j) + "]",
              highlights);
  }

private:
  void emitTrace(int line, const std::string &code, const std::string &op,
                 const std::string &explanation,
                 const std::string &highlights = "[]") {
    std::string state = "[";
    for (size_t i = 0; i < data.size(); i++) {
      if (i > 0)
        state += ",";
      state += JsonBuilder::to_json(data[i]);
    }
    state += "]";

    __TRACER__.trace(line, code, op, "array", name, state,
                     "{\"" + name + "\":" + state + "}", explanation,
                     highlights);
  }
};

template <typename K, typename V> class TracedHashMap {
private:
  std::unordered_map<K, V> data;
  std::string name;

public:
  TracedHashMap(const std::string &varName) : name(varName) {}

  void put(const K &key, const V &val, int line, const std::string &code) {
    data[key] = val;
    emitTrace(line, code, "map_put",
              "Set " + name + "[" + JsonBuilder::to_json(key) +
                  "] = " + JsonBuilder::to_json(val));
  }

  V &get(const K &key, int line, const std::string &code) {
    emitTrace(line, code, "map_get",
              "Get " + name + "[" + JsonBuilder::to_json(key) +
                  "] = " + JsonBuilder::to_json(data[key]));
    return data[key];
  }

  bool contains(const K &key) const { return data.find(key) != data.end(); }

  void erase(const K &key, int line, const std::string &code) {
    data.erase(key);
    emitTrace(line, code, "map_delete",
              "Deleted key " + JsonBuilder::to_json(key) + " from " + name);
  }

  V &operator[](const K &key) { return data[key]; }
  size_t size() const { return data.size(); }
  bool empty() const { return data.empty(); }
  auto begin() { return data.begin(); }
  auto end() { return data.end(); }

private:
  void emitTrace(int line, const std::string &code, const std::string &op,
                 const std::string &explanation) {
    std::string state = "{";
    bool first = true;
    for (const auto &entry : data) {
      const auto &k = entry.first;
      const auto &v = entry.second;
      if (!first)
        state += ",";
      state += JsonBuilder::to_json(k) + ":" + JsonBuilder::to_json(v);
      first = false;
    }
    state += "}";

    __TRACER__.trace(line, code, op, "hashmap", name, state,
                     "{\"" + name + "\":" + state + "}", explanation);
  }
};

// -- Linked List Serializer ---------------------------------------------------
// Works with any Node type that has .val and .next fields.
template <typename NodeT>
std::string serializeLinkedList(NodeT* head) {
  std::string result = "[";
  bool first = true;
  NodeT* cur = head;
  int limit = 10000;
  while (cur && limit-- > 0) {
    if (!first) result += ",";
    result += JsonBuilder::to_json(cur->val);
    first = false;
    cur = cur->next;
  }
  return result + "]";
}

// -- Linked List Trace Macros -------------------------------------------------
#define TRACE_NODE_OP(line, codeStr, op, dsType, dsId, headPtr, explanation)   \
  do {                                                                          \
    std::string _ll_state = serializeLinkedList(headPtr);                      \
    __TRACER__.trace(line, codeStr, op, dsType, dsId, _ll_state,               \
                     std::string("{\"") + dsId + "\":" + _ll_state + "}",      \
                     explanation);                                              \
  } while (0)

#define TRACE_STEP(line, codeStr, explanation)                                  \
  __TRACER__.trace(line, codeStr, "expression", "variable", "", "{}", "{}",    \
                   explanation)

// Force tracer initialization so output always has trace markers
static DSATracer& _global_tracer_init = DSATracer::getInstance();
