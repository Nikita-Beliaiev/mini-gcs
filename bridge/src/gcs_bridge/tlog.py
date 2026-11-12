import struct
import time
from collections.abc import Callable
from pathlib import Path
from typing import BinaryIO


class TlogWriter:
    def __init__(self, path: Path, clock_ns: Callable[[], int] = time.time_ns) -> None:
        self._file: BinaryIO = path.open("ab")
        self._clock_ns = clock_ns

    def write(self, frame: bytes) -> None:
        self._file.write(struct.pack(">Q", self._clock_ns() // 1000) + frame)

    def flush(self) -> None:
        self._file.flush()

    def close(self) -> None:
        self._file.close()
