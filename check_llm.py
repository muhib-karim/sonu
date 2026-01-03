import sys
import os

try:
    from llama_cpp import Llama
    print("llama-cpp-python is installed")
except ImportError:
    print("llama-cpp-python is NOT installed")

model_path = os.path.join(os.path.expanduser("~"), ".sonu", "models", "llm", "TinyLlama-1.1B-Chat-v1.0-Q4_K_M.gguf")
if os.path.exists(model_path):
    print(f"Model exists at {model_path}")
else:
    print(f"Model NOT found at {model_path}")
