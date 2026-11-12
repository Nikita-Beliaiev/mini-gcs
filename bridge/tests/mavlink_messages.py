from typing import Any

from pymavlink.dialects.v20 import ardupilotmega as mavlink


class Sender:
    def __init__(self, system_id: int = 1, component_id: int = 1) -> None:
        self.mav = mavlink.MAVLink(None, srcSystem=system_id, srcComponent=component_id)
        self._parser = mavlink.MAVLink(None)

    def __call__(self, message: Any) -> Any:
        frame = bytes(message.pack(self.mav))
        self.mav.seq = (self.mav.seq + 1) % 256
        return self._parser.parse_buffer(frame)[0]

    def skip(self, frames: int) -> None:
        self.mav.seq = (self.mav.seq + frames) % 256
