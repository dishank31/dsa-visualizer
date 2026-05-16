// frontend/src/components/Editor/LanguageSelector.tsx

interface LanguageSelectorProps {
    value: 'python' | 'cpp'
    onChange: (lang: 'python' | 'cpp') => void
}

export const LANGUAGES = [
    {
        id: 'python' as const,
        label: 'Python',
        icon: '🐍',
        monacoLang: 'python',
        placeholder: `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        
        for char in s:
            if char in mapping:
                top = stack.pop() if stack else '#'
                if mapping[char] != top:
                    return False
            else:
                stack.append(char)
        
        return len(stack) == 0`,
        testPlaceholder: '"({[]})"',
    },
    {
        id: 'cpp' as const,
        label: 'C++',
        icon: '⚡',
        monacoLang: 'cpp',
        placeholder: `#include<bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node* prev;
    Node* next;
    Node(int val) : val(val), prev(nullptr), next(nullptr) {}
};

void InsertAtHead(int val, Node* &head) {
    Node* newNode = new Node(val);
    if (!head) { head = newNode; return; }
    newNode->next = head;
    head->prev = newNode;
    head = newNode;
}

void InsertAtTail(int val, Node* &head) {
    Node* newNode = new Node(val);
    if (!head) { head = newNode; return; }
    Node* temp = head;
    while (temp->next) temp = temp->next;
    temp->next = newNode;
    newNode->prev = temp;
}

void PrintList(Node* &head) {
    Node* itr = head;
    while (itr) {
        cout << itr->val << " ";
        itr = itr->next;
    }
    cout << endl;
}

int main() {
    Node* head = nullptr;
    InsertAtHead(2, head);
    InsertAtHead(5, head);
    InsertAtTail(8, head);
    InsertAtTail(4, head);
    PrintList(head);
    return 0;
}`,
        testPlaceholder: '(no test case needed)',
    },
]

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
    return (
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {LANGUAGES.map((lang) => (
                <button
                    key={lang.id}
                    onClick={() => onChange(lang.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium 
                     transition-all flex items-center gap-1.5
                     ${value === lang.id
                            ? 'bg-gray-600 text-white shadow'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                >
                    <span>{lang.icon}</span>
                    <span>{lang.label}</span>
                </button>
            ))}
        </div>
    )
}