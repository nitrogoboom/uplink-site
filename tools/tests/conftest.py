"""The drawing tools import each other by bare name (they run as scripts from tools/), so the tests do too."""
import pathlib
import sys

TOOLS = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TOOLS))
