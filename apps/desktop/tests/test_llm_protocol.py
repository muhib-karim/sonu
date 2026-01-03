
import unittest
import sys
import os
import json
from unittest.mock import MagicMock, patch
import io

# Add apps/desktop to path so we can import llm_service
sys.path.append(os.path.join(os.getcwd(), 'apps', 'desktop'))

# Mock llama_cpp before importing llm_service
sys.modules['llama_cpp'] = MagicMock()

import llm_service

class TestLLMServiceProtocol(unittest.TestCase):
    
    def setUp(self):
        # Mock model to be ready
        llm_service.model_ready = True
        llm_service.model = MagicMock()
        # Mock the model response
        llm_service.model.return_value = {
            'choices': [{'text': 'TRANSFORMED TEXT'}]
        }
        
        # Mock PROFILES
        llm_service.PROFILES = {
            "coding": {
                "system_prompt": "Coding Prompt."
            }
        }

    def test_transform_command_format_parsing(self):
        # Capture stdout
        captured_output = io.StringIO()
        sys.stdout = captured_output
        
        # Input command in new format: TRANSFORM:COMMAND:category:command:text
        input_str = "TRANSFORM:COMMAND:coding:fix bug:var x = 1\n"
        
        # Mock sys.stdin
        with patch('sys.stdin', io.StringIO(input_str)):
            # Run main loop (it will process one line and exit if stdin ends)
            try:
                llm_service.main()
            except SystemExit:
                pass
            except Exception as e:
                # Stdin ending might cause loop to finish naturally
                pass

        # Check if model was called with correct prompt containing category context
        # content of output should be "TRANSFORMED TEXT\n"
        self.assertIn("TRANSFORMED TEXT", captured_output.getvalue())
        
        # Verify the prompt constructed used the coding profile
        args, kwargs = llm_service.model.call_args
        prompt_used = args[0]
        self.assertIn("Coding Prompt", prompt_used)
        self.assertIn("Command: fix bug", prompt_used)
        self.assertIn("Text: var x = 1", prompt_used)

    def test_transform_legacy_format_fallback(self):
        captured_output = io.StringIO()
        sys.stdout = captured_output
        
        # Input command in old format: TRANSFORM:COMMAND:cmd:text
        input_str = "TRANSFORM:COMMAND:summarize:hello world\n"
        
        with patch('sys.stdin', io.StringIO(input_str)):
            try:
                llm_service.main()
            except:
                pass

        self.assertIn("TRANSFORMED TEXT", captured_output.getvalue())
        
        # Verify fallback to default/general
        args, kwargs = llm_service.model.call_args
        prompt_used = args[0]
        # Should use default prompt
        self.assertIn("You are a helpful writing assistant", prompt_used)
        self.assertIn("Command: summarize", prompt_used)

if __name__ == '__main__':
    unittest.main()
