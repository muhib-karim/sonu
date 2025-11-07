#!/usr/bin/env python3
"""
Translation Service for SONU
Provides on-the-fly translation using deep-translator library
No need to download translation files - translates dynamically
"""

import sys
import json
import traceback

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False
    print(json.dumps({"error": "deep-translator not installed. Install with: pip install deep-translator"}), file=sys.stderr)

# Language code mapping
LANGUAGE_MAP = {
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'zh': 'zh-CN',
    'ja': 'ja',
    'ko': 'ko',
    'pt': 'pt',
    'ru': 'ru',
    'it': 'it',
    'nl': 'nl',
    'sv': 'sv',
    'da': 'da',
    'no': 'no',
    'fi': 'fi',
    'pl': 'pl',
    'tr': 'tr',
    'ar': 'ar',
    'he': 'he',
    'hi': 'hi',
    'th': 'th',
    'vi': 'vi',
    'id': 'id',
    'ms': 'ms',
    'cs': 'cs',
    'sk': 'sk',
    'hu': 'hu',
    'ro': 'ro',
    'bg': 'bg',
    'hr': 'hr',
    'sr': 'sr',
    'uk': 'uk',
    'el': 'el',
    'ca': 'ca',
    'eu': 'eu',
    'ga': 'ga',
    'cy': 'cy'
}

def translate_text(text, target_lang='en', source_lang='en'):
    """Translate a single text string"""
    if not TRANSLATOR_AVAILABLE:
        return {"error": "Translator not available"}
    
    if target_lang == source_lang or not text:
        return {"translated": text}
    
    try:
        target_code = LANGUAGE_MAP.get(target_lang, 'en')
        source_code = LANGUAGE_MAP.get(source_lang, 'auto')
        
        translator = GoogleTranslator(source=source_code, target=target_code)
        translated = translator.translate(text)
        
        return {"translated": translated, "source": text}
    except Exception as e:
        return {"error": str(e), "translated": text}

def translate_batch(texts, target_lang='en', source_lang='en'):
    """Translate multiple text strings"""
    if not TRANSLATOR_AVAILABLE:
        return {"error": "Translator not available"}
    
    if target_lang == source_lang or not texts:
        return {"translated": texts}
    
    try:
        target_code = LANGUAGE_MAP.get(target_lang, 'en')
        source_code = LANGUAGE_MAP.get(source_lang, 'auto')
        
        translator = GoogleTranslator(source=source_code, target=target_code)
        translated = translator.translate_batch(texts)
        
        return {"translated": translated, "source": texts}
    except Exception as e:
        return {"error": str(e), "translated": texts}

def translate_dict(translations_dict, target_lang='en', source_lang='en'):
    """Translate a dictionary of key-value pairs (like translation files)"""
    if not TRANSLATOR_AVAILABLE:
        return {"error": "Translator not available"}
    
    if target_lang == source_lang:
        return {"translated": translations_dict}
    
    try:
        target_code = LANGUAGE_MAP.get(target_lang, 'en')
        source_code = LANGUAGE_MAP.get(source_lang, 'auto')
        
        translator = GoogleTranslator(source=source_code, target=target_code)
        
        translated_dict = {}
        for key, value in translations_dict.items():
            if isinstance(value, str):
                try:
                    translated_dict[key] = translator.translate(value)
                except:
                    translated_dict[key] = value
            elif isinstance(value, dict):
                translated_dict[key] = translate_dict(value, target_lang, source_lang)["translated"]
            else:
                translated_dict[key] = value
        
        return {"translated": translated_dict}
    except Exception as e:
        return {"error": str(e), "translated": translations_dict}

def main():
    """Main entry point for translation service"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}), file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "translate":
            # Single text translation
            # Usage: python translation_service.py translate "Hello" en es
            if len(sys.argv) < 5:
                print(json.dumps({"error": "Usage: translate <text> <source_lang> <target_lang>"}), file=sys.stderr)
                sys.exit(1)
            
            text = sys.argv[2]
            source_lang = sys.argv[3]
            target_lang = sys.argv[4]
            
            result = translate_text(text, target_lang, source_lang)
            print(json.dumps(result))
            
        elif command == "translate_dict":
            # Dictionary translation
            # Usage: python translation_service.py translate_dict <json_dict> <source_lang> <target_lang>
            if len(sys.argv) < 5:
                print(json.dumps({"error": "Usage: translate_dict <json_dict> <source_lang> <target_lang>"}), file=sys.stderr)
                sys.exit(1)
            
            translations_json = sys.argv[2]
            source_lang = sys.argv[3]
            target_lang = sys.argv[4]
            
            translations_dict = json.loads(translations_json)
            result = translate_dict(translations_dict, target_lang, source_lang)
            print(json.dumps(result))
            
        elif command == "check":
            # Check if translator is available
            print(json.dumps({
                "available": TRANSLATOR_AVAILABLE,
                "languages": list(LANGUAGE_MAP.keys())
            }))
            
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}), file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        error_msg = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

