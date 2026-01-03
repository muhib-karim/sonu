#!/usr/bin/env python3
"""
SONU Post-Processor v2.0 - LFM2-1B Text Enhancement
====================================================
Uses LiquidAI's LFM2-1B (commercial-safe) for instant post-processing:
- Punctuation and capitalization
- Sentence breaks and natural flow
- Correction of common transcription errors

Target: <80ms latency on CPU (Intel i7)
"""

import sys
import os
import json
import threading
from pathlib import Path
from typing import Optional

# llama-cpp-python for LFM2 inference
try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    sys.stderr.write("llama-cpp-python not available - post-processing disabled\n")

# ============================================================================
# CONFIGURATION
# ============================================================================

# LFM2-1B Q4_K_M model (quantized for speed)
LFM2_MODEL = {
    "name": "LFM2-1B",
    "repo": "LiquidAI/LFM2-1.2B-GGUF",
    "filename": "LFM2-1B-Q4_K_M.gguf",
    "size_mb": 700,
    "license": "Commercial-safe (LiquidAI License)"
}

# Prompt template for post-processing
POSTPROCESS_PROMPT = """Edit this raw transcript ONLY. Add punctuation, capitalization, sentence breaks, and natural flow. Output ONLY the polished text, nothing else: {text}"""

# Flow Refinement Prompt - Wispr Flow-style cleanup of messy speech
FLOW_REFINEMENT_PROMPT = """Clean this spoken transcript. Remove filler words (um, uh, like, you know, so, basically, literally, actually), fix stuttering and repetition, add proper punctuation and capitalization. Keep the meaning intact. Output ONLY the cleaned text:
Input: {text}
Output:"""

# List of common filler words to remove (for fallback processing)
FILLER_WORDS = [
    'um', 'uh', 'uhm', 'uhh', 'umm', 'hmm', 'hm',
    'you know', 'i mean', 'kind of', 'sort of', 'like',
    'basically', 'literally', 'actually', 'honestly',
    'so yeah', 'yeah so', 'so basically', 'and stuff',
    'or whatever', 'and everything', 'and all that'
]

# Default settings
DEFAULT_SETTINGS = {
    "enabled": True,
    "temperature": 0.0,      # Deterministic output
    "max_new_tokens": 120,   # Enough for most sentences
    "n_threads": 4,          # Use 4 CPU threads
    "context_size": 512,     # Small context for speed
}

# ============================================================================
# LFM2 POST-PROCESSOR
# ============================================================================

class PostProcessor:
    """Fast LLM-based post-processor using LFM2-1B."""
    
    def __init__(self, models_dir: str = None):
        self.model: Optional[Llama] = None
        self.models_dir = Path(models_dir) if models_dir else Path(__file__).parent / "models"
        self.settings = DEFAULT_SETTINGS.copy()
        self._lock = threading.Lock()
        self._loaded = False
    
    @property
    def is_available(self) -> bool:
        """Check if post-processing is available."""
        return LLAMA_CPP_AVAILABLE and self._loaded
    
    def get_model_path(self) -> Optional[Path]:
        """Get path to LFM2 model file."""
        # Check local models directory
        local_path = self.models_dir / LFM2_MODEL["filename"]
        if local_path.exists():
            return local_path
        
        # Check HuggingFace cache
        if sys.platform == "win32":
            hf_cache = Path(os.environ.get("LOCALAPPDATA", "")) / ".cache" / "huggingface" / "hub"
        else:
            hf_cache = Path.home() / ".cache" / "huggingface" / "hub"
        
        repo_cache = hf_cache / f"models--{LFM2_MODEL['repo'].replace('/', '--')}"
        if repo_cache.exists():
            # Search for the GGUF file
            for gguf in repo_cache.rglob("*.gguf"):
                if "Q4_K_M" in gguf.name:
                    return gguf
        
        return None
    
    def load(self) -> bool:
        """Load the LFM2 model."""
        if not LLAMA_CPP_AVAILABLE:
            sys.stderr.write("llama-cpp-python not installed\n")
            return False
        
        model_path = self.get_model_path()
        if model_path is None:
            sys.stderr.write(f"LFM2 model not found. Please download first.\n")
            return False
        
        try:
            sys.stderr.write(f"Loading LFM2 post-processor from {model_path}...\n")
            sys.stderr.flush()
            
            self.model = Llama(
                model_path=str(model_path),
                n_ctx=self.settings["context_size"],
                n_threads=self.settings["n_threads"],
                verbose=False,
                use_mlock=True,  # Lock model in RAM
            )
            
            self._loaded = True
            sys.stderr.write("✓ LFM2 post-processor loaded\n")
            sys.stderr.flush()
            return True
            
        except Exception as e:
            sys.stderr.write(f"LFM2 load error: {e}\n")
            sys.stderr.flush()
            return False
    
    def unload(self):
        """Unload the model to free memory."""
        with self._lock:
            if self.model is not None:
                del self.model
                self.model = None
            self._loaded = False
    
    def process(self, text: str) -> str:
        """Post-process transcription text."""
        if not self.is_available or not text or not text.strip():
            return text
        
        with self._lock:
            try:
                # Build prompt
                prompt = POSTPROCESS_PROMPT.format(text=text.strip())
                
                # Generate completion - FAST settings
                output = self.model(
                    prompt,
                    max_tokens=self.settings["max_new_tokens"],
                    temperature=self.settings["temperature"],
                    stop=["\n\n", "###"],  # Stop at double newline
                    echo=False,
                )
                
                # Extract generated text
                if output and "choices" in output and len(output["choices"]) > 0:
                    result = output["choices"][0].get("text", "").strip()
                    if result:
                        return result
                
                return text  # Return original if processing failed
                
            except Exception as e:
                sys.stderr.write(f"Post-process error: {e}\n")
                return text
    
    def process_partial(self, text: str) -> str:
        """Quick process for partial/incremental text (even faster)."""
        if not self.is_available or not text or not text.strip():
            return text
        
        with self._lock:
            try:
                # For partials, just do basic capitalization
                # Full processing on final only
                prompt = f"Capitalize properly: {text.strip()}"
                
                output = self.model(
                    prompt,
                    max_tokens=50,  # Very short for partials
                    temperature=0.0,
                    stop=["\n"],
                    echo=False,
                )
                
                if output and "choices" in output and len(output["choices"]) > 0:
                    result = output["choices"][0].get("text", "").strip()
                    if result:
                        return result
                
                return text
                
            except Exception as e:
                return text
    
    def update_settings(self, **kwargs):
        """Update processor settings."""
        for key, value in kwargs.items():
            if key in self.settings:
                self.settings[key] = value

    def flow_refine(self, text: str) -> str:
        """
        Wispr Flow-style refinement: Remove filler words, fix stuttering,
        add natural punctuation. The "magic" that transforms messy speech
        into polished prose.
        """
        if not self.is_available or not text or not text.strip():
            return flow_refine_fallback(text)

        with self._lock:
            try:
                # Use the flow refinement prompt
                prompt = FLOW_REFINEMENT_PROMPT.format(text=text.strip())

                # Generate completion with slightly higher token limit for complex cleanup
                output = self.model(
                    prompt,
                    max_tokens=self.settings["max_new_tokens"] + 30,
                    temperature=self.settings["temperature"],
                    stop=["\n\n", "###", "Input:", "Output:"],
                    echo=False,
                )

                # Extract generated text
                if output and "choices" in output and len(output["choices"]) > 0:
                    result = output["choices"][0].get("text", "").strip()
                    if result:
                        # Sanity check: result shouldn't be much shorter than input
                        # (prevents hallucination/truncation)
                        if len(result) >= len(text) * 0.3:
                            return result

                # Fallback to basic cleanup if LLM fails
                return flow_refine_fallback(text)

            except Exception as e:
                sys.stderr.write(f"Flow refinement error: {e}\n")
                return flow_refine_fallback(text)

# ============================================================================
# SIMPLE TEXT PROCESSING (NO LLM - FALLBACK)
# ============================================================================

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
        # Match filler as whole words, with optional surrounding punctuation
        pattern = r'\b' + re.escape(filler) + r'\b[,\s]*'
        text = re.sub(pattern, ' ', text, flags=re.IGNORECASE)

    # Remove stuttering/repetition (e.g., "I I" -> "I", "the the" -> "the")
    text = re.sub(r'\b(\w+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)

    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text).strip()

    # Remove leading commas/conjunctions that may be orphaned
    text = re.sub(r'^[,\s]+', '', text)
    text = re.sub(r'^(and|but|so|or)\s+', '', text, flags=re.IGNORECASE)

    # Apply basic post-processing
    return simple_postprocess(text)


def simple_postprocess(text: str) -> str:
    """Basic post-processing without LLM (fallback)."""
    if not text:
        return text
    
    text = text.strip()
    
    # Capitalize first letter
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    
    # Capitalize after sentence enders
    import re
    text = re.sub(r'([.!?])\s+([a-z])', lambda m: m.group(1) + ' ' + m.group(2).upper(), text)
    
    # Add period if missing at end
    if text and text[-1] not in '.!?':
        text += '.'
    
    # Fix common i -> I
    text = re.sub(r'\bi\b', 'I', text)
    
    return text

# ============================================================================
# GLOBAL INSTANCE
# ============================================================================

_processor: Optional[PostProcessor] = None

def get_processor() -> PostProcessor:
    """Get or create the global post-processor instance."""
    global _processor
    if _processor is None:
        _processor = PostProcessor()
    return _processor

def init_postprocessor(models_dir: str = None) -> bool:
    """Initialize the post-processor."""
    processor = get_processor()
    if models_dir:
        processor.models_dir = Path(models_dir)
    return processor.load()

def postprocess_text(text: str, is_partial: bool = False) -> str:
    """Post-process text using LFM2 or fallback."""
    processor = get_processor()

    if processor.is_available:
        if is_partial:
            return processor.process_partial(text)
        else:
            return processor.process(text)
    else:
        return simple_postprocess(text)


def flow_refine_text(text: str) -> str:
    """
    Wispr Flow-style text refinement.
    Removes filler words, fixes stuttering, adds natural punctuation.
    This is the "magic" function that transforms messy speech into polished prose.
    """
    processor = get_processor()

    if processor.is_available:
        return processor.flow_refine(text)
    else:
        return flow_refine_fallback(text)

# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """Command-line interface for testing."""
    import argparse
    
    parser = argparse.ArgumentParser(description="SONU Post-Processor")
    parser.add_argument("command", choices=["test", "check", "process"])
    parser.add_argument("--text", type=str, help="Text to process")
    parser.add_argument("--models-dir", type=str, help="Models directory")
    
    args = parser.parse_args()
    
    if args.command == "check":
        processor = PostProcessor(args.models_dir)
        model_path = processor.get_model_path()
        result = {
            "llama_cpp_available": LLAMA_CPP_AVAILABLE,
            "model_found": model_path is not None,
            "model_path": str(model_path) if model_path else None
        }
        print(json.dumps(result, indent=2))
    
    elif args.command == "test":
        if init_postprocessor(args.models_dir):
            test_texts = [
                "hello my name is john and i live in new york",
                "the quick brown fox jumps over the lazy dog",
                "i went to the store today it was nice weather"
            ]
            for text in test_texts:
                processed = postprocess_text(text)
                print(f"Input:  {text}")
                print(f"Output: {processed}")
                print()
        else:
            print("Post-processor not available")
    
    elif args.command == "process":
        if not args.text:
            print("Error: --text required")
            return
        
        if init_postprocessor(args.models_dir):
            result = postprocess_text(args.text)
            print(result)
        else:
            result = simple_postprocess(args.text)
            print(f"(fallback) {result}")

if __name__ == "__main__":
    main()
