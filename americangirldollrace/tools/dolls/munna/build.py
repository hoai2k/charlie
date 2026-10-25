"""Build Munna using the shared plush export pipeline and retained source art."""
from pathlib import Path
import importlib.util

path=Path(__file__).resolve().parents[1]/'cornsilk/build.py'
spec=importlib.util.spec_from_file_location('plush_builder',path)
plush=importlib.util.module_from_spec(spec);spec.loader.exec_module(plush)

if __name__=='__main__':plush.main('munna')
