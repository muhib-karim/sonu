"""
LLM Service for SONU
Provides local LLM-based text transformation using llama-cpp-python
Uses TinyLlama 1.1B quantized model for lightweight, offline processing
"""

import sys
import os
import json
import time

# Try to import llama-cpp-python
try:
    from llama_cpp import Llama
except ImportError:
    sys.stderr.write("llama-cpp-python not installed. Install with: pip install llama-cpp-python\n")
    sys.stderr.flush()
    Llama = None

# Model configuration
MODEL_NAME = "TinyLlama-1.1B-Chat-v1.0"
MODEL_FILE = "TinyLlama-1.1B-Chat-v1.0-Q4_K_M.gguf"
MODEL_SIZE_MB = 700  # Approximate size

# Default model path (can be overridden)
DEFAULT_MODEL_DIR = os.path.join(os.path.expanduser("~"), ".sonu", "models", "llm")

model = None
model_ready = False
model_path = None

def find_model_file():
    """Find the model file in common locations"""
    global model_path
    
    # Check environment variable first
    env_path = os.environ.get("SONU_LLM_MODEL_PATH")
    if env_path and os.path.exists(env_path):
        model_path = env_path
        return model_path
    
    # Check default directory
    default_path = os.path.join(DEFAULT_MODEL_DIR, MODEL_FILE)
    if os.path.exists(default_path):
        model_path = default_path
        return model_path
    
    # Check in app data directory
    app_data_path = os.path.join(os.path.dirname(__file__), "data", "models", "llm", MODEL_FILE)
    if os.path.exists(app_data_path):
        model_path = app_data_path
        return app_data_path
    
    # Check in current directory models folder
    current_path = os.path.join(os.path.dirname(__file__), "models", "llm", MODEL_FILE)
    if os.path.exists(current_path):
        model_path = current_path
        return current_path
    
    return None

def load_model():
    """Load the LLM model"""
    global model, model_ready, model_path
    
    if Llama is None:
        sys.stderr.write("ERROR: llama-cpp-python not available\n")
        sys.stderr.flush()
        return False
    
    model_file = find_model_file()
    if not model_file:
        sys.stderr.write(f"ERROR: Model file not found: {MODEL_FILE}\n")
        sys.stderr.write(f"Please download the model to one of these locations:\n")
        sys.stderr.write(f"  - {DEFAULT_MODEL_DIR}\n")
        sys.stderr.write(f"  - {os.path.join(os.path.dirname(__file__), 'models', 'llm')}\n")
        sys.stderr.write(f"  - {os.path.join(os.path.dirname(__file__), 'data', 'models', 'llm')}\n")
        sys.stderr.flush()
        return False
    
    try:
        sys.stderr.write(f"Loading LLM model from: {model_file}\n")
        sys.stderr.flush()
        
        # Load model with minimal settings for speed
        # n_ctx: context window (smaller = less memory)
        # n_threads: CPU threads (auto-detect)
        # n_gpu_layers: 0 for CPU-only
        model = Llama(
            model_path=model_file,
            n_ctx=512,  # Small context window for speed
            n_threads=0,  # Auto-detect CPU threads
            n_gpu_layers=0,  # CPU-only
            verbose=False
        )
        
        model_path = model_file
        model_ready = True
        sys.stderr.write("LLM model loaded successfully\n")
        sys.stderr.flush()
        return True
    except Exception as e:
        sys.stderr.write(f"ERROR: Failed to load LLM model: {e}\n")
        sys.stderr.flush()
        model_ready = False
        return False

def transform_text(text, style="formal", category="personal"):
    """Transform text using LLM based on style and category"""
    global model, model_ready
    
    if not model_ready or model is None:
        return None
    
    if not text or not text.strip():
        return text
    
    # Create prompt based on style and category
    style_prompts = {
        "formal": "Transform this text to be formal with proper capitalization and punctuation. Keep the meaning exactly the same, just adjust the style. Return only the transformed text, no explanations:\n\n",
        "casual": "Transform this text to be casual with capitalization but less punctuation (remove trailing periods). Keep the meaning exactly the same, just adjust the style. Return only the transformed text, no explanations:\n\n",
        "very_casual": "Transform this text to be very casual with no capitalization and less punctuation (remove trailing periods). Keep the meaning exactly the same, just adjust the style. Return only the transformed text, no explanations:\n\n",
        "excited": "Transform this text to be more excited with exclamation marks. Keep the meaning exactly the same, just adjust the style. Return only the transformed text, no explanations:\n\n"
    }
    
    category_context = {
        "personal": "This is for personal messaging.",
        "work": "This is for workplace messaging.",
        "email": "This is for email communication.",
        "other": "This is for general text output."
    }
    
    prompt = style_prompts.get(style, style_prompts["formal"])
    context = category_context.get(category, "")
    full_prompt = f"{context} {prompt}" + f'"{text}"'
    
    try:
        # Generate with minimal tokens for speed
        # temperature: 0.3 for more consistent output
        # max_tokens: limit output length
        # stop: stop at quotes or newlines
        response = model(
            full_prompt,
            max_tokens=len(text) + 50,  # Slightly longer than input
            temperature=0.3,
            top_p=0.9,
            repeat_penalty=1.1,
            stop=['"', '\n\n'],
            echo=False
        )
        
        # Extract text from response
        if response and 'choices' in response and len(response['choices']) > 0:
            transformed = response['choices'][0]['text'].strip()
            
            # Remove quotes if present
            if transformed.startswith('"') and transformed.endswith('"'):
                transformed = transformed[1:-1]
            
            # Clean up any extra text
            transformed = transformed.split('\n')[0].strip()
            
            return transformed if transformed else None
        
        return None
    except Exception as e:
        sys.stderr.write(f"ERROR: LLM transformation failed: {e}\n")
        sys.stderr.flush()
        return None

def check_model_exists():
    """Check if model file exists"""
    return find_model_file() is not None

def get_model_path():
    """Get the path to the model file"""
    return find_model_file()

def main():
    """Main service loop - reads commands from stdin"""
    global model_ready
    
    # Try to load model on startup
    if check_model_exists():
        load_model()
    else:
        sys.stderr.write(f"Model not found. Use CHECK command to verify.\n")
        sys.stderr.flush()
    
    for line in sys.stdin:
        cmd = line.strip().upper()
        
        if cmd == "CHECK":
            # Check if model exists
            exists = check_model_exists()
            path = get_model_path()
            result = {
                "exists": exists,
                "path": path if exists else None,
                "ready": model_ready
            }
            print(json.dumps(result))
            sys.stdout.flush()
            continue
        
        if cmd == "LOAD":
            # Load model
            success = load_model()
            result = {"success": success, "ready": model_ready}
            print(json.dumps(result))
            sys.stdout.flush()
            continue
        
        if cmd.startswith("TRANSFORM:"):
            # Transform text: TRANSFORM:style:category:text or TRANSFORM:style:text (backward compatible)
            try:
                parts = line.strip().split(":", 3)
                if len(parts) >= 3:
                    style = parts[1]
                    # Check if category is provided (4 parts) or just style and text (3 parts)
                    if len(parts) >= 4:
                        category = parts[2]
                        text = parts[3]
                    else:
                        category = "personal"  # Default category
                        text = parts[2]
                    
                    if not model_ready:
                        # Try to load model
                        if check_model_exists():
                            load_model()
                    
                    if model_ready:
                        transformed = transform_text(text, style, category)
                        if transformed:
                            print(transformed)
                        else:
                            print("")  # Empty string indicates failure
                    else:
                        print("")  # Model not ready
                else:
                    print("")  # Invalid command
            except Exception as e:
                sys.stderr.write(f"Transform error: {e}\n")
                sys.stderr.flush()
                print("")  # Error
            sys.stdout.flush()
            continue
        
        if cmd == "STATUS":
            # Get status
            result = {
                "ready": model_ready,
                "model_path": model_path if model_ready else None,
                "model_exists": check_model_exists()
            }
            print(json.dumps(result))
            sys.stdout.flush()
            continue

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        sys.stderr.write(f"Fatal error: {e}\n")
        sys.stderr.flush()

