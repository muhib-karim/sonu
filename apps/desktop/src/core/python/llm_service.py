"""
LLM Service for SONU
Provides local LLM-based text transformation using llama-cpp-python
Uses TinyLlama 1.1B quantized model for lightweight, offline processing
"""

import sys
import os
import json
import time

# Add current directory to path so we can import tools
sys.path.append(os.path.dirname(__file__))

from tools.registry import registry

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

    # Get tool from registry
    tool = registry.get_tool(style)

    # Fallback to formal if style not found
    if not tool:
        tool = registry.get_tool("formal")

    if not tool:
        sys.stderr.write(f"Error: No tool found for style '{style}' and no default 'formal' tool.\n")
        return text

    # Get prompts from tool definition
    system_prompt = tool.get("system_prompt", "")

    category_context = {
        "personal": "This is for personal messaging.",
        "work": "This is for workplace messaging.",
        "email": "This is for email communication.",
        "other": "This is for general text output."
    }

    context = category_context.get(category, "")

    # Construct prompt compatible with TinyLlama Chat format
    # We use create_chat_completion with structured output (JSON) to ensure reliability

    try:
        # Get parameters from tool or defaults
        params = tool.get("parameters", {})
        temperature = params.get("temperature", 0.3)

        # Define JSON schema for the output to ensure we get exactly what we want
        # This prevents the model from adding "Here is the text:" or other chatter
        output_schema = {
            "type": "object",
            "properties": {
                "transformed_text": {
                    "type": "string",
                    "description": "The transformed version of the input text"
                }
            },
            "required": ["transformed_text"]
        }

        # Use chat completion with response_format
        response = model.create_chat_completion(
            messages=[
                {"role": "system", "content": f"{context} {system_prompt}"},
                {"role": "user", "content": text}
            ],
            response_format={
                "type": "json_object",
                "schema": output_schema
            },
            max_tokens=len(text) + 100,  # Slightly longer than input
            temperature=temperature,
            top_p=0.9,
            repeat_penalty=1.1,
            stop=['"', '\n\n']
        )

        # Extract text from response
        if response and 'choices' in response and len(response['choices']) > 0:
            content = response['choices'][0]['message']['content']
            try:
                # Parse the JSON output
                data = json.loads(content)
                return data.get("transformed_text", "").strip()
            except json.JSONDecodeError:
                # Fallback if model fails to generate valid JSON (rare with response_format)
                sys.stderr.write("Warning: LLM failed to generate valid JSON, falling back to raw content\n")
                return content.strip()

        return None
    except Exception as e:
        sys.stderr.write(f"ERROR: LLM transformation failed: {e}\n")
        sys.stderr.flush()
        return None


# Flow Refinement Prompt - Wispr Flow-style cleanup of messy speech
FLOW_REFINEMENT_PROMPT = """Clean this spoken transcript. Remove filler words (um, uh, like, you know, so, basically, literally, actually), fix stuttering and repetition, add proper punctuation and capitalization. Keep the meaning intact. Output ONLY the cleaned text, nothing else:
Input: {text}
Output:"""

# Common filler words for fallback processing
FILLER_WORDS = [
    'um', 'uh', 'uhm', 'uhh', 'umm', 'hmm', 'hm',
    'you know', 'i mean', 'kind of', 'sort of', 'like',
    'basically', 'literally', 'actually', 'honestly',
    'so yeah', 'yeah so', 'so basically', 'and stuff',
    'or whatever', 'and everything', 'and all that'
]


def flow_refine_fallback(text: str) -> str:
    """
    Fallback flow refinement without LLM.
    Removes common filler words and applies basic cleanup.
    """
    import re

    if not text:
        return text

    text = text.strip()

    # Remove filler words (case-insensitive)
    for filler in FILLER_WORDS:
        pattern = r'\b' + re.escape(filler) + r'\b[,\s]*'
        text = re.sub(pattern, ' ', text, flags=re.IGNORECASE)

    # Remove stuttering/repetition
    text = re.sub(r'\b(\w+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)

    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text).strip()

    # Remove leading commas/conjunctions that may be orphaned
    text = re.sub(r'^[,\s]+', '', text)
    text = re.sub(r'^(and|but|so|or)\s+', '', text, flags=re.IGNORECASE)

    # Capitalize first letter
    if text and text[0].islower():
        text = text[0].upper() + text[1:]

    # Add period if missing
    if text and text[-1] not in '.!?':
        text += '.'

    # Fix common i -> I
    text = re.sub(r'\bi\b', 'I', text)

    return text


def flow_refine(text):
    """
    Wispr Flow-style text refinement.
    Removes filler words, fixes stuttering, adds natural punctuation.
    This is the "magic" function that transforms messy speech into polished prose.
    """
    global model, model_ready

    if not text or not text.strip():
        return text

    # If model not ready, use fallback
    if not model_ready or model is None:
        return flow_refine_fallback(text)

    try:
        # Use the flow refinement prompt
        prompt = FLOW_REFINEMENT_PROMPT.format(text=text.strip())

        # Use simple completion for faster response
        response = model(
            prompt,
            max_tokens=len(text) + 50,
            temperature=0.0,  # Deterministic
            stop=["\n\n", "###", "Input:", "Output:"],
            echo=False,
        )

        # Extract generated text
        if response and "choices" in response and len(response["choices"]) > 0:
            result = response["choices"][0].get("text", "").strip()
            if result and len(result) >= len(text) * 0.3:  # Sanity check
                return result

        # Fallback to basic cleanup if LLM fails
        return flow_refine_fallback(text)

    except Exception as e:
        sys.stderr.write(f"Flow refinement error: {e}\n")
        sys.stderr.flush()
        return flow_refine_fallback(text)

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
                "model_exists": check_model_exists(),
                "tools_loaded": len(registry.list_tools())
            }
            print(json.dumps(result))
            sys.stdout.flush()
            continue

        # FLOW_REFINE command - Wispr Flow-style cleanup
        if line.strip().startswith("FLOW_REFINE:"):
            try:
                # Format: FLOW_REFINE:text to refine
                text = line.strip().split(":", 1)[1]

                if not model_ready:
                    # Try to load model
                    if check_model_exists():
                        load_model()

                # Use flow_refine (with or without LLM)
                refined = flow_refine(text)
                print(f"REFINED:{refined}")
            except Exception as e:
                sys.stderr.write(f"Flow refine error: {e}\n")
                sys.stderr.flush()
                # On error, return original text
                text = line.strip().split(":", 1)[1] if ":" in line else ""
                print(f"REFINED:{text}")
            sys.stdout.flush()
            continue

        if cmd == "REFRESH_TOOLS":
            # Reload tools
            registry.load_tools()
            result = {
                "success": True,
                "tool_count": len(registry.list_tools())
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

