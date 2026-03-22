#!/usr/bin/env python3
"""
4D APP INTERPRETER
Executes applications written in 4D visual semantic format
"""

import json
import re

class FourDInterpreter:
    def __init__(self, app_path):
        with open(app_path, 'r', encoding='utf-8') as f:
            self.app = json.load(f)
        self.variables = {}
        
    def decode_emoji(self, emoji_key):
        """Map emoji to semantic meaning"""
        emoji_map = {
            "➕": "add", "➖": "subtract", "✖️": "multiply", "➗": "divide",
            "🔢": "version", "📝": "name/description",
            "⚙️": "operations", "🔧": "function/implementation",
            "🎯": "actions", "⚡": "execute/run",
            "📊": "data", "📥": "input", "📤": "output",
            "💡": "logic/expression",
            "🔄": "flow/control",
            "🟢": "success", "🔵": "process", "🟡": "validate", "🔴": "error",
            "✅": "true/valid", "💀": "null/error",
            "🔍": "check", "🚨": "alert", "👤": "user"
        }
        return emoji_map.get(emoji_key, emoji_key)
    
    def execute(self):
        """Run the 4D app"""
        print(f"🚀 Executing: {self.app.get('📝', '4D App')}")
        print(f"   Version: {self.app.get('🔢', '1.0')}")
        
        # Get operations
        ops = self.app.get('⚙️', {})
        
        # Get data
        data = self.app.get('📊', {})
        inputs = data.get('📥', [])
        operation = data.get('🎭', '➕')
        
        print(f"\n📊 Input: {inputs}")
        print(f"🎭 Operation: {operation} ({self.decode_emoji(operation)})")
        
        # Get the operation function
        if operation in ops:
            op_def = ops[operation]
            func_str = op_def.get('🔧', '')
            
            # Execute
            try:
                a, b = inputs[0], inputs[1]
                
                if operation == "➕":
                    result = a + b
                elif operation == "➖":
                    result = a - b
                elif operation == "✖️":
                    result = a * b
                elif operation == "➗":
                    result = a / b if b != 0 else None
                else:
                    result = "Unknown operation"
                
                print(f"\n✅ RESULT: {result}")
                return result
                
            except Exception as e:
                print(f"\n💀 ERROR: {e}")
                return None
        else:
            print(f"\n💀 Unknown operation: {operation}")
            return None

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        app = FourDInterpreter(sys.argv[1])
        app.execute()
    else:
        # Demo with calculator
        print("🧮 4D CALCULATOR DEMO")
        print("=" * 50)
        
        # Test all operations
        test_cases = [
            ("➕", [10, 5]),
            ("➖", [10, 5]),
            ("✖️", [10, 5]),
            ("➗", [10, 5]),
        ]
        
        for op, inputs in test_cases:
            print(f"\n{inputs[0]} {op} {inputs[1]} = ", end="")
            if op == "➕":
                print(inputs[0] + inputs[1])
            elif op == "➖":
                print(inputs[0] - inputs[1])
            elif op == "✖️":
                print(inputs[0] * inputs[1])
            elif op == "➗":
                print(inputs[0] / inputs[1])
