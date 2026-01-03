import os
import json
import glob
import sys

class ToolRegistry:
    def __init__(self):
        self.tools = {}
        self.default_tools_dir = os.path.join(os.path.dirname(__file__))
        self.user_tools_dir = os.path.join(os.path.expanduser("~"), ".sonu", "tools")
        self.load_tools()

    def load_tools(self):
        """Load tools from default and user directories"""
        self.tools = {}

        # Ensure user directory exists
        if not os.path.exists(self.user_tools_dir):
            try:
                os.makedirs(self.user_tools_dir)
            except OSError:
                pass # Ignore if we can't create it

        # Load default tools
        self._load_from_dir(self.default_tools_dir)

        # Load user tools (overrides defaults if same ID)
        self._load_from_dir(self.user_tools_dir)

        sys.stderr.write(f"Loaded {len(self.tools)} tools from registry\n")
        sys.stderr.flush()

    def _load_from_dir(self, directory):
        """Load .json tool definitions from a directory"""
        if not os.path.exists(directory):
            return

        pattern = os.path.join(directory, "*.json")
        for file_path in glob.glob(pattern):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    tool_def = json.load(f)

                # Validate required fields
                if "id" in tool_def and "system_prompt" in tool_def:
                    self.tools[tool_def["id"]] = tool_def
                else:
                    sys.stderr.write(f"Warning: Skipping invalid tool definition in {file_path}\n")
            except Exception as e:
                sys.stderr.write(f"Error loading tool from {file_path}: {e}\n")

    def get_tool(self, tool_id):
        """Get a tool definition by ID"""
        return self.tools.get(tool_id)

    def list_tools(self):
        """Return a list of all available tools"""
        return list(self.tools.values())

# Global instance
registry = ToolRegistry()
